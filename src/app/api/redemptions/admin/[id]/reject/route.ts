import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notification-service";
import { adjustPoints } from "@/lib/points-engine";

/**
 * POST /api/redemptions/admin/[id]/reject — Tolak klaim & refund poin.
 *
 * Body: { reason: string (required) }
 *
 * Atomically:
 * 1. Update redemption status → REJECTED
 * 2. Refund poin ke member (ADJUST_UP dengan reason)
 * 3. Restock (increment stockClaimed ke decrement)
 * 4. Notif ke siswa
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!reason || reason.length < 3) {
    return NextResponse.json(
      { error: "Alasan penolakan wajib diisi (minimal 3 karakter)" },
      { status: 400 }
    );
  }

  const result = await db.$transaction(async (tx) => {
    const redemption = await tx.rewardRedemption.findUnique({
      where: { id },
    });

    if (!redemption) {
      return { success: false, reason: "Klaim tidak ditemukan" } as const;
    }
    if (redemption.status !== "PENDING") {
      return { success: false, reason: `Status sudah ${redemption.status}` } as const;
    }

    // Update ke REJECTED
    const updated = await tx.rewardRedemption.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedById: user!.id,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Restock: decrement stockClaimed
    await tx.reward.update({
      where: { id: redemption.rewardId },
      data: { stockClaimed: { decrement: 1 } },
    });

    return { success: true, redemption: updated } as const;
  });

  if (!result.success) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Refund poin ke member (di luar transaction)
  const refund = await adjustPoints(
    result.redemption.memberId,
    result.redemption.pointsSpent,
    `Refund klaim ditolak: ${result.redemption.rewardName}`,
    user!.id
  );

  // Notif ke siswa dengan template
  const member = await db.member.findUnique({
    where: { id: result.redemption.memberId },
    select: { userId: true, fullName: true },
  });
  if (member) {
    await notify({
      userId: member.userId,
      title: "Klaim Hadiah Ditolak",
      message: `Klaim "${result.redemption.rewardName}" ditolak. Alasan: ${reason}. Poin ${result.redemption.pointsSpent} sudah dikembalikan.`,
      type: "WARNING",
      relatedId: result.redemption.id,
      template: {
        emailKey: "rewardClaimRejected",
        whatsappKey: "rewardClaimRejected",
        templateData: {
          name: member.fullName,
          rewardName: result.redemption.rewardName,
          reason,
        },
      },
    });
  }

  await logAudit(
    user!.id,
    "REWARD_REJECT",
    "RewardRedemption",
    id,
    `Tolak klaim: ${reason}. Refund ${result.redemption.pointsSpent} poin.`
  );

  logger.info("Redemption rejected + refunded", {
    redemptionId: id,
    rejectedBy: user!.id,
    refunded: refund.awarded,
  });

  return NextResponse.json({
    success: true,
    redemption: result.redemption,
    refunded: refund.awarded,
    newBalance: refund.newBalance,
  });
}
