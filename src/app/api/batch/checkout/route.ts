import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { computeDueDateWithHolidays } from "@/lib/loan-rules";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  let memberId: string = body.memberId;
  const bookItemIds: string[] = body.bookItemIds;

  if (!isLibrarian(user!.role)) {
    if (!user!.member) return NextResponse.json({ error: "Anda belum terdaftar sebagai anggota" }, { status: 400 });
    memberId = user!.member.id;
  }

  if (!memberId || !Array.isArray(bookItemIds) || bookItemIds.length === 0) {
    return NextResponse.json({ error: "memberId dan bookItemIds wajib diisi" }, { status: 400 });
  }

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
  if (member.status !== "ACTIVE") return NextResponse.json({ error: "Anggota tidak aktif" }, { status: 400 });

  const overdueLoans = await db.loan.count({ where: { memberId, status: "OVERDUE" } });
  if (overdueLoans > 0) {
    return NextResponse.json({ error: `Masih ada ${overdueLoans} buku terlambat. Kembalikan dahulu.` }, { status: 400 });
  }

  const activeLoans = await db.loan.count({ where: { memberId, status: { in: ["LOANED", "OVERDUE"] } } });

  const { dueDate, shiftedDays, rule } = await computeDueDateWithHolidays(new Date(), member.category);
  const availableSlots = rule.maxBooks - activeLoans;

  if (bookItemIds.length > availableSlots) {
    return NextResponse.json({
      error: `Kuota tidak cukup. Tersisa ${availableSlots} slot dari ${rule.maxBooks} maks.`,
    }, { status: 400 });
  }

  const results: {
    bookItemId: string;
    success: boolean;
    loanId?: string;
    bookTitle?: string;
    error?: string;
  }[] = [];

  const loanDate = new Date();

  for (const bookItemId of bookItemIds) {
    try {
      const item = await db.bookItem.findUnique({
        where: { id: bookItemId },
        include: { book: true },
      });
      if (!item) {
        results.push({ bookItemId, success: false, error: "Eksemplar tidak ditemukan" });
        continue;
      }
      if (item.status !== "AVAILABLE") {
        results.push({ bookItemId, success: false, bookTitle: item.book.title, error: "Tidak tersedia" });
        continue;
      }

      const loan = await db.loan.create({
        data: {
          memberId,
          bookItemId: item.id,
          bookId: item.book.id,
          loanDate,
          dueDate,
          status: "LOANED",
        },
      });

      await db.bookItem.update({ where: { id: item.id }, data: { status: "BORROWED" } });

      results.push({ bookItemId, success: true, loanId: loan.id, bookTitle: item.book.title });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal";
      results.push({ bookItemId, success: false, error: msg });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  if (succeeded > 0) {
    const shiftedNote = shiftedDays > 0
      ? ` (disesuaikan +${shiftedDays} hari karena jatuh di hari libur)`
      : "";
    const titles = results
      .filter((r) => r.success)
      .map((r) => `"${r.bookTitle}"`)
      .join(", ");
    await db.notification.create({
      data: {
        userId: member.userId,
        title: "Peminjaman Berhasil",
        message: `Anda meminjam ${titles}. Jatuh tempo ${dueDate.toLocaleDateString("id-ID")}${shiftedNote}.`,
        type: "INFO",
        relatedId: results.find((r) => r.success)?.loanId,
      },
    });
    await logAudit(user!.id, "BATCH_CHECKOUT", "Loan", undefined, `${succeeded} buku → ${member.fullName}`);
  }

  return NextResponse.json({
    results,
    summary: { total: bookItemIds.length, succeeded, failed, dueDate, shiftedDays },
  });
}
