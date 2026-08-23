import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notification-service";
import { getBalance } from "@/lib/points-engine";

/**
 * POST /api/redemptions/admin/[id]/approve — Setujui klaim.
 *
 * Body: { notes?: string }
 *
 * Atomically:
 * 1. Update redemption status → APPROVED
 * 2. Generate pickupCode (sudah auto-generated, tinggal expose)
 * 3. Notif ke siswa
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
      include: {
        member: true,
        reward: true,
      },
    });

    if (!redemption) {
      return { success: false, reason: "Klaim tidak ditemukan" } as const;
    }
    if (redemption.status !== "PENDING") {
      return { success: false, reason: `Status sudah ${redemption.status}` } as const;
    }

    // Update ke APPROVED
    const updated = await tx.rewardRedemption.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: user!.id,
        approvedAt: new Date(),
        staffNote: notes,
      },
    });

    return { success: true, redemption: updated } as const;
  });

  if (!result.success) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Notifikasi siswa (di luar transaction supaya tidak rollback kalau notif gagal)
  const member = await db.member.findUnique({
    where: { id: result.redemption.memberId },
    select: { userId: true, fullName: true },
  });
  if (member) {
    await notify({
      userId: member.userId,
      title: "Klaim Hadiah Disetujui!",
      message: `Klaim "${result.redemption.rewardName}" disetujui. Kode ambil: ${result.redemption.pickupCode}. Tunjukkan kode ini ke pustakawan.`,
      type: "INFO",
      relatedId: result.redemption.id,
    });
  }

  await logAudit(
    user!.id,
    "REWARD_APPROVE",
    "RewardRedemption",
    id,
    `Setujui klaim ${result.redemption.rewardName} untuk ${member?.fullName || "member"}`
  );

  logger.info("Redemption approved", {
    redemptionId: id,
    approvedBy: user!.id,
  });

  return NextResponse.json({
    success: true,
    redemption: result.redemption,
    pickupCode: result.redemption.pickupCode,
  });
}
