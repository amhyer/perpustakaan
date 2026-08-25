import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { DAMAGE_FINE_AMOUNT } from "@/lib/constants";

// POST /api/book-items/[itemId]/report-damage — laporkan kerusakan/kehilangan eksemplar
export async function POST(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const { itemId } = await params;
    const body = await req.json();
    const { condition, description } = body;

    if (!condition) {
      return NextResponse.json({ error: "Kondisi wajib diisi" }, { status: 400 });
    }

    const validConditions = ["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"];
    const isLost = condition === "LOST";
    if (!isLost && !validConditions.includes(condition)) {
      return NextResponse.json({ error: "Kondisi tidak valid" }, { status: 400 });
    }

    const item = await db.bookItem.findUnique({
      where: { id: itemId },
      include: {
        book: { select: { title: true } },
        loans: { where: { status: { in: ["LOANED", "OVERDUE"] } }, take: 1 },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Eksemplar tidak ditemukan" }, { status: 404 });
    }

    const previousCondition = item.condition;
    const previousStatus = item.status;
    const newStatus = isLost ? "LOST" : condition === "BAIK" ? "AVAILABLE" : "DAMAGED";

    // Update item condition and status
    await db.bookItem.update({
      where: { id: itemId },
      data: {
        condition: isLost ? "RUSAK_BERAT" : condition,
        status: newStatus,
      },
    });

    // Create condition log
    const activeLoan = item.loans[0];
    await db.conditionLog.create({
      data: {
        bookItemId: itemId,
        previousCondition,
        newCondition: isLost ? "RUSAK_BERAT" : condition,
        previousStatus,
        newStatus,
        reason: description || null,
        reportedById: user!.id,
        loanId: activeLoan?.id || null,
      },
    });

    // If LOST and has active loan, add fine to the loan
    if (isLost && activeLoan) {
      await db.loan.update({
        where: { id: activeLoan.id },
        data: { fineAmount: { increment: DAMAGE_FINE_AMOUNT } },
      });

      // Get member userId for notification
      const loanMember = await db.loan.findUnique({
        where: { id: activeLoan.id },
        select: { member: { select: { userId: true } } },
      });
      if (loanMember?.member?.userId) {
        await db.notification.create({
          data: {
            userId: loanMember.member.userId,
            title: "Buku Dilaporkan Hilang",
            message: `"${item.book.title}" dilaporkan hilang. Denda pengganti: Rp ${DAMAGE_FINE_AMOUNT.toLocaleString("id-ID")}.`,
            type: "WARNING",
            relatedId: activeLoan.id,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      item: { id: itemId, condition: isLost ? "RUSAK_BERAT" : condition, status: newStatus },
      previousCondition,
      previousStatus,
    });
  } catch (err) {
    console.error("POST book-items/[itemId]/report-damage error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
