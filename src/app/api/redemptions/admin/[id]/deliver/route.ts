import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notification-service";

/**
 * POST /api/redemptions/admin/[id]/deliver — Tandai hadiah sudah diberikan.
 *
 * Body: { notes?: string }
 *
 * Transition: APPROVED → DELIVERED
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : undefined;

  const result = await db.$transaction(async (tx) => {
    const redemption = await tx.rewardRedemption.findUnique({
      where: { id },
    });

    if (!redemption) {
      return { success: false, reason: "Klaim tidak ditemukan" } as const;
    }
    if (redemption.status !== "APPROVED") {
      return {
        success: false,
        reason: `Status harus APPROVED untuk deliver, sekarang ${redemption.status}`,
      } as const;
    }

    const updated = await tx.rewardRedemption.update({
      where: { id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliveredById: user!.id,
        deliveryNotes: notes,
      },
    });

    return { success: true, redemption: updated } as const;
  });

  if (!result.success) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Notif ke siswa
  const member = await db.member.findUnique({
    where: { id: result.redemption.memberId },
    select: { userId: true, fullName: true },
  });
  if (member) {
    await notify({
      userId: member.userId,
      title: "Hadiah Sudah Diterima! 🎁",
      message: `Selamat! Hadiah "${result.redemption.rewardName}" sudah kamu terima. Semoga bermanfaat!`,
      type: "INFO",
      relatedId: result.redemption.id,
    });
  }

  await logAudit(
    user!.id,
    "REWARD_DELIVER",
    "RewardRedemption",
    id,
    `Deliver hadiah: ${result.redemption.rewardName} ke ${member?.fullName || "member"}`
  );

  logger.info("Redemption delivered", {
    redemptionId: id,
    deliveredBy: user!.id,
  });

  return NextResponse.json({
    success: true,
    redemption: result.redemption,
  });
}
