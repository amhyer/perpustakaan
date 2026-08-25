import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { computeDueDateWithHolidays, getLoanRule } from "@/lib/loan-rules";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const mine = searchParams.get("mine");
    // Pagination (Tahap 16 #26) — backward compatible
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam) : null;
    const pageSize = parseInt(searchParams.get("pageSize") || "12");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (mine === "1" && user!.member) where.memberId = user!.member.id;

    // Mode pagination: return { data, total, page, pageSize }
    if (page !== null && !isNaN(page)) {
      const [reservations, total] = await Promise.all([
        db.reservation.findMany({
          where,
          include: {
            member: { select: { id: true, memberNumber: true, fullName: true, category: true, classGrade: true } },
            book: { select: { id: true, title: true, author: true, coverColor: true, coverImage: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.reservation.count({ where }),
      ]);
      return NextResponse.json({ data: reservations, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }

    // Mode lama (tanpa pagination): return array biasa
    const reservations = await db.reservation.findMany({
      where,
      include: {
        member: { select: { id: true, memberNumber: true, fullName: true, category: true, classGrade: true } },
        book: { select: { id: true, title: true, author: true, coverColor: true, coverImage: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reservations);
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();

    if (!user!.member) return NextResponse.json({ error: "Anda belum terdaftar sebagai anggota" }, { status: 400 });
    if (!body.bookId) return NextResponse.json({ error: "Buku wajib diisi" }, { status: 400 });

    // Cek duplikat
    const existing = await db.reservation.findFirst({
      where: { memberId: user!.member.id, bookId: body.bookId, status: { in: ["PENDING", "READY"] } },
    });
    if (existing) return NextResponse.json({ error: "Anda sudah memesan buku ini" }, { status: 400 });

    // Cek apakah buku tersedia (jika ada, suruh pinjam langsung)
    const availableItem = await db.bookItem.findFirst({
      where: { bookId: body.bookId, status: "AVAILABLE" },
    });

    const queueCount = await db.reservation.count({
      where: { bookId: body.bookId, status: "PENDING" },
    });

    const reservation = await db.reservation.create({
      data: {
        memberId: user!.member.id,
        bookId: body.bookId,
        status: availableItem ? "READY" : "PENDING",
        queueOrder: queueCount + 1,
        note: body.note || null,
        expiresAt: availableItem ? new Date(Date.now() + 3 * 86400000) : null,
      },
      include: { book: true, member: true },
    });

    // Jika langsung READY, tandai satu item sebagai RESERVED
    if (availableItem) {
      await db.bookItem.update({ where: { id: availableItem.id }, data: { status: "RESERVED" } });
      await db.notification.create({
        data: {
          userId: user!.id,
          title: "Reservasi Siap Diambil!",
          message: `"${reservation.book.title}" tersedia. Ambil dalam 3 hari di perpustakaan.`,
          type: "INFO",
          relatedId: reservation.id,
        },
      });
    }

    await logAudit(user!.id, "RESERVATION_CREATE", "Reservation", reservation.id, `${reservation.book.title} oleh ${reservation.member.fullName}`);

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();

    const reservation = await db.reservation.findUnique({
      where: { id: body.id },
      include: { book: true, member: true },
    });
    if (!reservation) return NextResponse.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });

    // Cancel: anggota sendiri atau pustakawan (penuh/junior)
    if (body.action === "cancel") {
      if (!isLibrarian(user!.role) && reservation.memberId !== user!.member?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db.reservation.update({ where: { id: body.id }, data: { status: "CANCELLED" } });
      // Bebaskan item jika RESERVED
      if (reservation.status === "READY") {
        const reservedItem = await db.bookItem.findFirst({
          where: { bookId: reservation.bookId, status: "RESERVED" },
        });
        if (reservedItem) await db.bookItem.update({ where: { id: reservedItem.id }, data: { status: "AVAILABLE" } });
      }
      await logAudit(user!.id, "RESERVATION_CANCEL", "Reservation", reservation.id, `${reservation.book.title} oleh ${reservation.member.fullName}`);
      return NextResponse.json({ success: true });
    }

    // Fulfill (pustakawan penuh/junior): saat anggota mengambil buku dan meminjamnya
    // Buat Loan baru, ubah BookItem RESERVED → BORROWED, reservasi → FULFILLED
    if (body.action === "fulfill") {
      if (!isLibrarian(user!.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      // Pre-check: reservasi harus berstatus READY
      if (reservation.status !== "READY") {
        return NextResponse.json(
          { error: `Reservasi harus berstatus READY untuk diambil. Status saat ini: ${reservation.status}` },
          { status: 400 }
        );
      }

      // Pre-check: anggota harus ACTIVE
      if (reservation.member.status !== "ACTIVE") {
        return NextResponse.json({ error: "Anggota tidak aktif. Tidak dapat meminjam." }, { status: 400 });
      }

      // Cari item yang RESERVED untuk buku ini
      const reservedItem = await db.bookItem.findFirst({
        where: { bookId: reservation.bookId, status: "RESERVED" },
      });
      if (!reservedItem) {
        return NextResponse.json(
          { error: "Tidak ada eksemplar berstatus RESERVED untuk buku ini. Mungkin sudah diambil." },
          { status: 400 }
        );
      }

      // Hitung dueDate dengan libur (Tahap 15-B)
      const loanDate = new Date();
      const { dueDate } = await computeDueDateWithHolidays(loanDate, reservation.member.category);
      const rule = await getLoanRule(reservation.member.category);

      // Eksekusi dalam transaction: buat loan + update item + update reservasi
      const loan = await db.$transaction(async (tx) => {
        const newLoan = await tx.loan.create({
          data: {
            memberId: reservation.memberId,
            bookItemId: reservedItem.id,
            bookId: reservation.bookId,
            loanDate,
            dueDate,
            status: "LOANED",
          },
        });
        await tx.bookItem.update({
          where: { id: reservedItem.id },
          data: { status: "BORROWED" },
        });
        await tx.reservation.update({
          where: { id: body.id },
          data: { status: "FULFILLED" },
        });
        return newLoan;
      });

      // Notifikasi ke anggota
      await db.notification.create({
        data: {
          userId: reservation.member.userId,
          title: "Reservasi Dipenuhi",
          message: `Reservasi "${reservation.book.title}" telah dipenuhi. Buku berhasil dipinjam, jatuh tempo ${dueDate.toLocaleDateString("id-ID")}.`,
          type: "INFO",
          relatedId: loan.id,
        },
      });

      await logAudit(user!.id, "RESERVATION_FULFILL", "Reservation", reservation.id, `${reservation.book.title} oleh ${reservation.member.fullName}`);

      return NextResponse.json({ success: true, loanId: loan.id });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err) {
    console.error("PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
