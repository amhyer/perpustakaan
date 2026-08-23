/**
 * Streak Calendar API — Returns day-by-day activity for last N days.
 *
 * GET /api/gamification/streak-calendar?days=30
 *   Returns: { days: [{date, hasActivity, points}], currentStreak, longestStreak }
 *
 * Sprint M - Tier 1 #2: Reading streak visualization.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json(
      { error: "Hanya anggota yang memiliki streak" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 365);

  const since = new Date(Date.now() - days * 86400000);
  since.setHours(0, 0, 0, 0);

  const txns = await db.pointTransaction.findMany({
    where: {
      memberId: user.member.id,
      type: "EARN",
      source: "LOAN_RETURNED",
      createdAt: { gte: since },
    },
    select: { createdAt: true, amount: true },
  });

  // Build day-by-day map
  const dayMap = new Map<string, number>();
  for (const t of txns) {
    const date = t.createdAt.toISOString().split("T")[0];
    dayMap.set(date, (dayMap.get(date) || 0) + t.amount);
  }

  // Fill in all days (even if no activity)
  const result: Array<{ date: string; hasActivity: boolean; points: number }> = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const points = dayMap.get(dateStr) ?? 0;
    result.push({
      date: dateStr,
      hasActivity: points > 0,
      points,
    });
  }

  // Calculate current streak
  let currentStreak = 0;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].hasActivity) {
      currentStreak++;
    } else {
      // Allow today to be empty (still active)
      if (i === result.length - 1) continue;
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (const day of result) {
    if (day.hasActivity) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return NextResponse.json({
    days: result,
    currentStreak,
    longestStreak,
    totalActiveDays: dayMap.size,
    totalPoints: txns.reduce((sum, t) => sum + t.amount, 0),
  });
}
