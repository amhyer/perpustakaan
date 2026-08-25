import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { computeDueDateWithHolidays, getLoanRule } from "@/lib/loan-rules";

export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await params;

    const loan = await db.loan.findUnique({
      where: { id },
      include: { member: true, bookItem: { include: { book: true } } },
    });
    if (!loan) return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });

    // Non-librarians can only renew their own loans
    if (!isLibrarian(user!.role) && loan.memberId !== user!.member?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (loan.status === "RETURNED") return NextResponse.json({ error: "Buku sudah dikembalikan" }, { status: 400 });

    const rule = await getLoanRule(loan.member.category);

    if (loan.renewedCount >= rule.maxRenewals) {
      return NextResponse.json({ error: `Batas perpanjangan tercapai (maksimal ${rule.maxRenewals}x)` }, { status: 400 });
    }

    // Cek reservasi: jika ada antrean, tidak boleh perpanjang
    const reservations = await db.reservation.count({
      where: { bookId: loan.bookId, status: "PENDING" },
    });
    if (reservations > 0) {
      return NextResponse.json({ error: "Tidak dapat diperpanjang: ada anggota lain yang mengantre buku ini" }, { status: 400 });
    }

    const baseDate = loan.dueDate > new Date() ? loan.dueDate : new Date();
    // Hitung dueDate baru dengan menyesuaikan hari libur (Tahap 15-B)
    const { dueDate: newDueDate, shiftedDays } = await computeDueDateWithHolidays(baseDate, loan.member.category);

    const updated = await db.loan.update({
      where: { id },
      data: {
        dueDate: newDueDate,
        renewedCount: { increment: 1 },
        status: "LOANED",
      },
      include: { member: true, bookItem: { include: { book: true } } },
    });

    const shiftedNote = shiftedDays > 0
      ? ` (disesuaikan +${shiftedDays} hari karena jatuh di hari libur)`
      : "";
    await db.notification.create({
      data: {
        userId: loan.member.userId,
        title: "Perpanjangan Berhasil",
        message: `"${loan.bookItem.book.title}" diperpanjang hingga ${newDueDate.toLocaleDateString("id-ID")}${shiftedNote}.`,
        type: "INFO",
        relatedId: loan.id,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT renew error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
