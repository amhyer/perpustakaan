/**
 * Streak Detector — Deteksi & award streak bonus.
 *
 * Streak = berapa hari berturut-turut member membaca buku.
 * - Setiap hari dengan EARN point dari LOAN_RETURNED = streak +1
 * - Kalau skip 1 hari = streak reset
 *
 * Bonus:
 * - 7 hari streak → +25 poin (cooldown 7 hari, jadi sekali per minggu)
 * - 30 hari streak → +100 poin (cooldown 30 hari)
 *
 * Dipanggil dari onLoanReturned() setelah award LOAN_RETURNED.
 */

import { db } from "@/lib/db";
import { awardPoints, type PointSource } from "./points-engine";
import { logger } from "./logger";

/**
 * Hitung streak aktif untuk seorang member.
 * Streak = berapa hari berturut-turut sampai hari ini ada transaksi EARN dari LOAN_RETURNED.
 */
export async function calculateStreak(memberId: string): Promise<number> {
  const txns = await db.pointTransaction.findMany({
    where: {
      memberId,
      type: "EARN",
      source: "LOAN_RETURNED",
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: 100, // cukup untuk streak sampai 100 hari
  });

  if (txns.length === 0) return 0;

  // Group by day
  const days = new Set<string>();
  for (const t of txns) {
    days.add(t.createdAt.toISOString().split("T")[0]);
  }
  const sortedDays = Array.from(days).sort((a, b) => b.localeCompare(a));

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak harus include hari ini atau kemarin
  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i - 1]);
    const currDate = new Date(sortedDays[i]);
    const diffDays = Math.floor(
      (prevDate.getTime() - currDate.getTime()) / 86400000
    );
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Check & award streak bonus. Dipanggil setelah loan returned.
 *
 * Logic:
 * - STREAK_7: +25 poin kalau streak baru mencapai 7 (cooldown 7 hari, jadi sekali per minggu)
 * - STREAK_30: +100 poin kalau streak baru mencapai 30
 */
export async function checkAndAwardStreak(memberId: string): Promise<{
  awarded: number;
  sources: PointSource[];
  currentStreak: number;
}> {
  const streak = await calculateStreak(memberId);
  const sources: PointSource[] = [];
  let awarded = 0;

  // 7-day streak
  if (streak >= 7 && streak % 7 === 0) {
    // Idempotency: sourceId = "streak:7:{tanggal}" — same day, only fires once
    const today = new Date().toISOString().split("T")[0];
    const sourceId = `streak:7:${today}`;
    const result = await awardPoints(memberId, "STREAK_7", {
      sourceId,
      description: `🔥 7 hari streak!`,
    });
    if (result.success && result.awarded > 0) {
      sources.push("STREAK_7");
      awarded += result.awarded;
    }
  }

  // 30-day streak
  if (streak >= 30 && streak % 30 === 0) {
    const today = new Date().toISOString().split("T")[0];
    const sourceId = `streak:30:${today}`;
    const result = await awardPoints(memberId, "STREAK_30", {
      sourceId,
      description: `🔥 30 hari streak!`,
    });
    if (result.success && result.awarded > 0) {
      sources.push("STREAK_30");
      awarded += result.awarded;
    }
  }

  if (awarded > 0) {
    logger.info("Streak bonus awarded", { memberId, streak, awarded, sources });
  }

  return { awarded, sources, currentStreak: streak };
}

/**
 * Get streak history untuk UI display.
 * Returns array of {date, points} untuk last 30 days.
 */
export async function getStreakHistory(memberId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const txns = await db.pointTransaction.findMany({
    where: {
      memberId,
      type: "EARN",
      source: "LOAN_RETURNED",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, amount: true },
  });

  // Group by date
  const byDate = new Map<string, number>();
  for (const t of txns) {
    const date = t.createdAt.toISOString().split("T")[0];
    byDate.set(date, (byDate.get(date) || 0) + t.amount);
  }

  return Array.from(byDate.entries()).map(([date, points]) => ({ date, points }));
}
