/**
 * Reading Level API — Get member's reading level & progress.
 *
 * GET /api/gamification/level
 *   Returns: current level, progress to next, rank, perks
 *
 * Sprint M - Tier 1 #2: Gamification lanjutan.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { computeReadingLevel, getAllLevels } from "@/lib/reading-level";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json(
      { error: "Hanya anggota yang memiliki level membaca" },
      { status: 400 }
    );
  }

  try {
    const data = await computeReadingLevel(user.member.id);

    return NextResponse.json({
      ...data,
      allLevels: getAllLevels(),
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
