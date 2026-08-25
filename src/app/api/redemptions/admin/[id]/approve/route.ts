import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notification-service";
import { getBalance } from "@/lib/points-engine";
import { eventBus, EVENTS } from "@/lib/event-bus";

/**
 * POST /api/redemptions/admin/[id]/approve — Setujui klaim.
 *
 * Body: { notes?: string }
 *
 * Atomically:
 * 1. Update redemption status → APPROVED
 * 2. Generate pickupCode (sudah auto-generated, tinggal expose)
 * 3. Notif ke siswa (in-app + email + WhatsApp dengan template rewardClaimApproved)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : undefined;

    const result = await db.$transaction(async (tx) => {
      const redemption = await tx.rewardRedemption.findUnique({
        where: { id },
        include: {
          member: { include: { user: { select: { id: true, email: true } } } },
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
        include: {
          member: { include: { user: { select: { id: true, email: true } } } },
          reward: true,
        },
      });

      return { success: true, redemption: updated } as const;
    });

    if (!result.success) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // Notifikasi multi-channel ke siswa
    await notify({
      userId: result.redemption.member.user.id,
      title: "Klaim Hadiah Disetujui!",
      message: `Klaim "${result.redemption.rewardName}" disetujui. Kode ambil: ${result.redemption.pickupCode}. Tunjukkan kode ini ke pustakawan.`,
      type: "INFO",
      relatedId: result.redemption.id,
      template: {
        emailKey: "rewardClaimApproved",
        whatsappKey: "rewardClaimApproved",
        templateData: {
          name: result.redemption.member.fullName,
          rewardName: result.redemption.rewardName,
          pickupCode: result.redemption.pickupCode,
        },
      },
    });

    await logAudit(
      user!.id,
      "REWARD_APPROVE",
      "RewardRedemption",
      id,
      `Setujui klaim ${result.redemption.rewardName} untuk ${result.redemption.member.fullName}`
    );

    logger.info("Redemption approved", {
      redemptionId: id,
      approvedBy: user!.id,
    });

    // Publish real-time event supaya student dashboard auto-refresh
    eventBus.publish(result.redemption.member.user.id, EVENTS.REDEMPTION_APPROVED, {
      redemptionId: id,
      rewardName: result.redemption.rewardName,
      pickupCode: result.redemption.pickupCode,
    });

    return NextResponse.json({
      success: true,
      redemption: result.redemption,
      pickupCode: result.redemption.pickupCode,
    });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
