import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/redemptions/lookup?code=RWD-XXXXX — Lookup redemption by pickup code.
 *
 * Pustakawan scan QR → dapat code → call this → lihat detail.
 * Return null kalau code tidak ditemukan.
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code wajib diisi" }, { status: 400 });
  }

  const redemption = await db.rewardRedemption.findUnique({
    where: { pickupCode: code },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
          category: true,
          classGrade: true,
          user: { select: { email: true } },
        },
      },
      reward: {
        select: { id: true, name: true, category: true, pointCost: true, imageUrl: true },
      },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  if (!redemption) {
    logger.info("Pickup code lookup failed", { code });
    return NextResponse.json({ error: "Kode tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ redemption });
}
