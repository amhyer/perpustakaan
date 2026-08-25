import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { adjustPoints } from "@/lib/points-engine";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { PointsEngine } from "@/lib/points-engine";

/**
 * POST /api/redemptions/admin/adjust — Manual point adjustment oleh pustakawan.
 *
 * Security:
 * - WAJIB 2FA aktif untuk user yang melakukan adjustment
 * - Adjustment > 100 poin butuh approval pustakawan kedua (future)
 * - Setiap adjustment di-log dengan awardedById (full audit trail)
 *
 * Body: { memberId, amount (positif/negatif), description }
 */
export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    // SECURITY: 2FA required untuk manual point adjustment
    const twoFactor = await db.twoFactorSecret.findUnique({
      where: { userId: user!.id },
    });
    if (!twoFactor?.enabled) {
      logger.warn("Adjust points attempt by user without 2FA", {
        userId: user!.id,
        email: user!.email,
      });
      return NextResponse.json(
        {
          error: "2FA wajib diaktifkan untuk adjust poin manual",
          action: "ENABLE_2FA",
          helpUrl: "/settings",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { memberId, amount, description } = body;

    if (!memberId || typeof amount !== "number" || !description) {
      return NextResponse.json(
        { error: "memberId, amount, description wajib diisi" },
        { status: 400 }
      );
    }

    if (Math.abs(amount) > 500) {
      // Sanity check: adjustment lebih dari 500 poin butuh approval kedua
      // (Future: kirim notif ke LIBRARIAN kedua untuk approval)
      logger.warn("Large point adjustment", {
        userId: user!.id,
        memberId,
        amount,
        description,
      });
    }

    if (description.length < 10) {
      return NextResponse.json(
        { error: "Deskripsi minimal 10 karakter untuk audit" },
        { status: 400 }
      );
    }

    const result = await adjustPoints(
      memberId,
      amount,
      description,
      user!.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.reason || "Adjust gagal" }, { status: 400 });
    }

    await logAudit(
      user!.id,
      amount > 0 ? "POINTS_ADJUST_UP" : "POINTS_ADJUST_DOWN",
      "Member",
      memberId,
      `${amount > 0 ? "+" : ""}${amount} poin. Alasan: ${description}. Saldo baru: ${result.newBalance}`
    );

    logger.warn("Points adjusted manually", {
      by: user!.id,
      memberId,
      amount,
      newBalance: result.newBalance,
    });

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
    });
  } catch (err) {
    console.error("POST redemptions/admin/adjust error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
