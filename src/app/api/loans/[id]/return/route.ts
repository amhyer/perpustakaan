import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { LOAN_RULES, calculateFine } from "@/lib/constants";
import { getLoanRule } from "@/lib/loan-rules";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const loan = await db.loan.findUnique({
    where: { id },
    include: { member: true, bookItem: { include: { book: true } } },
  });
  if (!loan) return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
  if (loan.status === "RETURNED") return NextResponse.json({ error: "Buku sudah dikembalikan" }, { status: 400 });

  const rule = await getLoanRule(loan.member.category);
  const now = new Date();
  const fine = calculateFine(loan.dueDate, now, rule.finePerDay);
  const finePaid = body.finePaid !== undefined ? parseInt(body.finePaid) : fine;

  const updated = await db.loan.update({
    where: { id },
    data: {
      returnDate: now,
      status: "RETURNED",
      fineAmount: fine,
      finePaid: fine > 0 ? finePaid : 0,
    },
    include: { member: true, bookItem: { include: { book: true } } },
  });

  // Cek apakah ada reservasi menunggu untuk buku ini
  const nextReservation = await db.reservation.findFirst({
    where: { bookId: loan.bookId, status: "PENDING" },
    orderBy: { queueOrder: "asc" },
    include: { member: true },
  });

  if (nextReservation) {
    // Tandai eksemplar sebagai RESERVED & reservasi siap diambil
    await db.bookItem.update({ where: { id: loan.bookItemId }, data: { status: "RESERVED" } });
    await db.reservation.update({
      where: { id: nextReservation.id },
      data: { status: "READY", expiresAt: new Date(now.getTime() + 3 * 86400000) },
    });
    // Kurangi queue order reservasi lain
    await db.reservation.updateMany({
      where: { bookId: loan.bookId, status: "PENDING", queueOrder: { gt: nextReservation.queueOrder } },
      data: { queueOrder: { decrement: 1 } },
    });
    await db.notification.create({
      data: {
        userId: nextReservation.member.userId,
        title: "Buku Reservasi Siap Diambil!",
        message: `"${loan.bookItem.book.title}" sudah tersedia. Ambil dalam 3 hari di perpustakaan.`,
        type: "INFO",
        relatedId: nextReservation.id,
      },
    });
  } else {
    await db.bookItem.update({ where: { id: loan.bookItemId }, data: { status: "AVAILABLE" } });
  }

  // Notifikasi pengembalian
  let message = `"${loan.bookItem.book.title}" telah dikembalikan. Terima kasih!`;
  if (fine > 0) {
    message += ` Denda keterlambatan: Rp ${fine.toLocaleString("id-ID")}.`;
  }
  await db.notification.create({
    data: {
      userId: loan.member.userId,
      title: "Pengembalian Berhasil",
      message,
      type: fine > 0 ? "WARNING" : "INFO",
      relatedId: loan.id,
    },
  });

  return NextResponse.json({ loan: updated, fine, nextReservation });
}
