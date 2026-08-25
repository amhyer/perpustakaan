import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { calculateFine, DAMAGE_FINE_AMOUNT } from "@/lib/constants";
import { getLoanRule } from "@/lib/loan-rules";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notification-service";
import { onLoanReturned } from "@/lib/points-engine";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const loan = await db.loan.findUnique({
      where: { id },
      include: { member: true, bookItem: { include: { book: true } } },
    });
    if (!loan) return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });

    // Non-librarians can only return their own loans
    if (!isLibrarian(user!.role) && loan.memberId !== user!.member?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (loan.status === "RETURNED") return NextResponse.json({ error: "Buku sudah dikembalikan" }, { status: 400 });

    const rule = await getLoanRule(loan.member.category);
    const now = new Date();
    let fine = calculateFine(loan.dueDate, now, rule.finePerDay);
    const finePaid = body.finePaid !== undefined ? parseInt(body.finePaid) : fine;

    // Handle condition update during return (Tahap 22)
    const returnCondition = body.condition;
    const conditionNote = body.conditionNote;
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
          reason: conditionNote || `Dilaporkan saat pengembalian`,
          reportedById: user!.id,
          loanId: id,
        },
      });

      // Add damage fine if not already charged
      if (returnCondition !== "BAIK") {
        fine += DAMAGE_FINE_AMOUNT;
      }
    }

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
      // Multi-channel notification (WA + email)
      await notify({
        userId: nextReservation.member.userId,
        title: "Buku Reservasi Siap Diambil!",
        message: `"${loan.bookItem.book.title}" sudah tersedia.`,
        type: "INFO",
        relatedId: nextReservation.id,
        template: {
          whatsappKey: "reservationReady",
          templateData: {
            name: nextReservation.member.fullName,
            bookTitle: loan.bookItem.book.title,
            expiresIn: "3 hari",
          },
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
    // Multi-channel (WA + email) untuk return
    await notify({
      userId: loan.member.userId,
      title: "Pengembalian Berhasil",
      message,
      type: fine > 0 ? "WARNING" : "INFO",
      relatedId: loan.id,
    });

    const detail = fine > 0
      ? `${loan.bookItem.book.title} oleh ${loan.member.fullName} (denda: Rp ${fine.toLocaleString("id-ID")})`
      : `${loan.bookItem.book.title} oleh ${loan.member.fullName}`;
    await logAudit(user!.id, "LOAN_RETURN", "Loan", loan.id, detail);

    // Hook: Award points for reading (jika tidak damaged/lost)
    const isDamaged = returnCondition && returnCondition !== "BAIK";
    const pointsResult = await onLoanReturned(loan.id, { damaged: !!isDamaged });

    // Notif WhatsApp/email jika dapat poin (khusus loan returned minimal 10 poin)
    if (pointsResult.awarded >= 10) {
      const sources = pointsResult.sources;
      const description = sources.includes("EARLY_RETURN")
        ? `Bonus pengembalian lebih awal (+${pointsResult.awarded} poin)`
        : sources.includes("ON_TIME_RETURN")
        ? `Poin membaca "${loan.bookItem.book.title}"`
        : `Selesai membaca "${loan.bookItem.book.title}"`;

      // Ambil saldo terbaru untuk ditampilkan
      const lastTxn = await db.pointTransaction.findFirst({
        where: { memberId: loan.memberId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });
      const newBalance = lastTxn?.balanceAfter ?? 0;

      await notify({
        userId: loan.member.userId,
        title: "⭐ Poin Baru!",
        message: `+${pointsResult.awarded} poin dari membaca "${loan.bookItem.book.title}". Saldo: ${newBalance} poin.`,
        type: "INFO",
        relatedId: loan.id,
        template: {
          emailKey: "rewardEarned",
          whatsappKey: "rewardEarned",
          templateData: {
            name: loan.member.fullName,
            amount: pointsResult.awarded,
            description,
            totalBalance: newBalance,
          },
        },
      });
    }

    return NextResponse.json({
      loan: updated,
      fine,
      nextReservation,
      pointsAwarded: pointsResult.awarded > 0 ? {
        total: pointsResult.awarded,
        sources: pointsResult.sources,
        message: pointsResult.awarded > 0
          ? `Selamat! Anda mendapat +${pointsResult.awarded} poin.`
          : undefined,
      } : null,
    });
  } catch (err) {
    console.error("PUT return error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
