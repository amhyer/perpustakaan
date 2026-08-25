import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { calculateFine, DAMAGE_FINE_AMOUNT } from "@/lib/constants";
import { getLoanRule } from "@/lib/loan-rules";
import { logAudit } from "@/lib/audit";

interface ConditionOverride {
  condition: string;
  conditionNote?: string;
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const loanIds: string[] = body.loanIds;
  const conditionOverrides: Record<string, ConditionOverride> = body.conditionOverrides || {};

  if (!Array.isArray(loanIds) || loanIds.length === 0) {
    return NextResponse.json({ error: "loanIds harus array" }, { status: 400 });
  }

  const results: {
    loanId: string;
    success: boolean;
    fine: number;
    error?: string;
    bookTitle?: string;
  }[] = [];

  for (const loanId of loanIds) {
    try {
      const loan = await db.loan.findUnique({
        where: { id: loanId },
        include: { member: true, bookItem: { include: { book: true } } },
      });
      if (!loan) {
        results.push({ loanId, success: false, fine: 0, error: "Peminjaman tidak ditemukan" });
        continue;
      }
      if (loan.status === "RETURNED") {
        results.push({ loanId, success: false, fine: 0, bookTitle: loan.bookItem.book.title, error: "Sudah dikembalikan" });
        continue;
      }

      const rule = await getLoanRule(loan.member.category);
      const now = new Date();
      let fine = calculateFine(loan.dueDate, now, rule.finePerDay);
      const finePaid = fine;

      const override = conditionOverrides[loanId];
      const returnCondition = override?.condition;
      const conditionNote = override?.conditionNote;

      if (returnCondition && returnCondition !== "BAIK") {
        const isLost = returnCondition === "LOST";
        const newStatus = isLost ? "LOST" : "DAMAGED";
        const newCondition = isLost ? "RUSAK_BERAT" : returnCondition;

        await db.bookItem.update({
          where: { id: loan.bookItemId },
          data: { condition: newCondition, status: newStatus },
        });

        await db.conditionLog.create({
          data: {
            bookItemId: loan.bookItemId,
            previousCondition: loan.bookItem.condition,
            newCondition,
            previousStatus: "BORROWED",
            newStatus,
            reason: conditionNote || "Dilaporkan saat pengembalian batch",
            reportedById: user!.id,
            loanId,
          },
        });

        fine += DAMAGE_FINE_AMOUNT;
      }

      await db.loan.update({
        where: { id: loanId },
        data: {
          returnDate: now,
          status: "RETURNED",
          fineAmount: fine,
          finePaid: fine > 0 ? finePaid : 0,
        },
      });

      const effectiveBookId = loan.bookId ?? loan.bookItem.bookId;
      const nextReservation = await db.reservation.findFirst({
        where: { bookId: effectiveBookId, status: "PENDING" },
        orderBy: { queueOrder: "asc" },
        include: { member: true },
      });

      if (nextReservation) {
        await db.bookItem.update({ where: { id: loan.bookItemId }, data: { status: "RESERVED" } });
        await db.reservation.update({
          where: { id: nextReservation.id },
          data: { status: "READY", expiresAt: new Date(now.getTime() + 3 * 86400000) },
        });
        await db.reservation.updateMany({
          where: { bookId: effectiveBookId, status: "PENDING", queueOrder: { gt: nextReservation.queueOrder } },
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

      let message = `"${loan.bookItem.book.title}" telah dikembalikan.`;
      if (fine > 0) {
        message += ` Denda: Rp ${fine.toLocaleString("id-ID")}.`;
      }
      await db.notification.create({
        data: {
          userId: loan.member.userId,
          title: "Pengembalian Berhasil",
          message,
          type: fine > 0 ? "WARNING" : "INFO",
          relatedId: loanId,
        },
      });

      results.push({ loanId, success: true, fine, bookTitle: loan.bookItem.book.title });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal";
      results.push({ loanId, success: false, fine: 0, error: msg });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalFines = results.reduce((sum, r) => sum + r.fine, 0);

  if (succeeded > 0) {
    await logAudit(user!.id, "BATCH_RETURN", "Loan", undefined, `${succeeded} buku dikembalikan`);
  }

  return NextResponse.json({
    results,
    summary: { total: loanIds.length, succeeded, failed, totalFines },
  });
}
