import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { redeemReward } from "@/lib/points-engine";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * POST /api/rewards/[id]/claim — Klaim hadiah.
 *
 * Body: { memberNote?: string }
 *
 * Returns:
 * - success: boolean
 * - redemptionId, pickupCode (kalau sukses)
 * - newBalance
 * - reason (kalau gagal)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member yang bisa klaim" }, { status: 403 });
  }

  const { id: rewardId } = await params;
  const body = await req.json().catch(() => ({}));
  const memberNote = typeof body.memberNote === "string" ? body.memberNote.slice(0, 500) : undefined;

  const result = await redeemReward(user.member.id, rewardId, { memberNote });

  if (!result.success) {
    return NextResponse.json(
      { error: result.reason || "Klaim gagal" },
      { status: 400 }
    );
  }

  await logAudit(
    user.id,
    "REWARD_CLAIM",
    "Reward",
    rewardId,
    `Klaim "${rewardId}" oleh member ${user.member.id}, poin spent: ${result.newBalance}`
  );

  logger.info("Reward claimed", {
    memberId: user.member.id,
    rewardId,
    redemptionId: result.redemptionId,
    newBalance: result.newBalance,
  });

  return NextResponse.json({
    success: true,
    redemptionId: result.redemptionId,
    pickupCode: result.pickupCode,
    newBalance: result.newBalance,
  });
}
