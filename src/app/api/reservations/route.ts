import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isLibrarian } from "@/lib/auth";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const mine = searchParams.get("mine");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (mine === "1" && user!.member) where.memberId = user!.member.id;

  const reservations = await db.reservation.findMany({
    where,
    include: {
      member: { select: { id: true, memberNumber: true, fullName: true, category: true, classGrade: true } },
      book: { select: { id: true, title: true, author: true, coverColor: true, coverImage: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reservations);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
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

  return NextResponse.json(reservation, { status: 201 });
}

export async function PUT(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
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
    return NextResponse.json({ success: true });
  }

  // Fulfill (pustakawan penuh/junior): saat anggota mengambil buku dan meminjamnya
  if (body.action === "fulfill") {
    if (!isLibrarian(user!.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await db.reservation.update({ where: { id: body.id }, data: { status: "FULFILLED" } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
