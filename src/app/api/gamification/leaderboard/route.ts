import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getMonthlyLeaderboard } from "@/lib/gamification";

// GET /api/gamification/leaderboard — top members bulan berjalan
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const result = await getMonthlyLeaderboard(10);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
