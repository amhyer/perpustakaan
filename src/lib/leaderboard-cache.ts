/**
 * Leaderboard Cache Service
 *
 * Materialized view sederhana untuk leaderboard.
 *
 * Konsep: leaderboard tidak perlu real-time — cukup 5-15 menit sekali.
 * Simpan di cache (Map + JSON snapshot) supaya query ke DB tidak berat.
 *
 * Strategy:
 * 1. Hitung snapshot di memory (dari db.pointTransaction)
 * 2. Cache dengan TTL 5 menit
 * 3. Invalidate manual (kalau ada event reward:points-earned besar)
 *
 * Untuk multi-instance production, pakai Redis dengan sorted set.
 * Untuk single instance (SQLite + standalone), ini cukup.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cache } from "@/lib/cache";
import { eventBus, EVENTS } from "@/lib/event-bus";

const CACHE_KEY = "leaderboard:top100";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit
const REVALIDATE_THRESHOLD = 50; // Auto-invalidate kalau ada >= 50 poin berubah

interface LeaderboardSnapshot {
  entries: Array<{
    rank: number;
    member: {
      id: string;
      fullName: string;
      memberNumber: string;
      classGrade: string | null;
      category: string;
    };
    balance: number;
    booksRead: number;
  }>;
  generatedAt: string;
  totalMembers: number;
  totalPoints: number;
}

let lastInvalidateCheck = 0;
let pendingDelta = 0;

/**
 * Subscribe ke event untuk track invalidation needs
 */
eventBus.subscribe("__cache_tracker__", (data: any) => {
  if (data.event === EVENTS.LEADERBOARD_UPDATED) {
    pendingDelta += Math.abs(data.delta || 0);
  }
});

/**
 * Get cached leaderboard. Recompute kalau cache expired atau delta besar.
 */
export async function getLeaderboardSnapshot(forceRefresh = false): Promise<LeaderboardSnapshot> {
  // Check if we need to force refresh
  if (!forceRefresh) {
    const cached = cache.get<LeaderboardSnapshot>(CACHE_KEY);
    if (cached) return cached;
  }

  return await computeLeaderboard();
}

/**
 * Compute fresh leaderboard dari DB.
 */
async function computeLeaderboard(): Promise<LeaderboardSnapshot> {
  const start = Date.now();

  // Get latest balance per member
  const balances = await db.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["memberId"],
    take: 200, // ambil banyak, sort & slice
    select: {
      memberId: true,
      balanceAfter: true,
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
          classGrade: true,
          category: true,
        },
      },
    },
  });

  // Sort & rank
  const sorted = balances
    .filter((b) => b.balanceAfter > 0) // Skip zero balance
    .sort((a, b) => b.balanceAfter - a.balanceAfter)
    .slice(0, 100);

  // Books read per member
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const memberIds = sorted.map((b) => b.memberId);
  const loans = await db.loan.groupBy({
    by: ["memberId"],
    where: {
      memberId: { in: memberIds },
      status: "RETURNED",
      returnDate: { gte: yearStart },
    },
    _count: true,
  });
  const booksMap = new Map(loans.map((l) => [l.memberId, l._count]));

  const entries = sorted.map((b, idx) => ({
    rank: idx + 1,
    member: b.member,
    balance: b.balanceAfter,
    booksRead: booksMap.get(b.memberId) || 0,
  }));

  const totalPoints = sorted.reduce((sum, e) => sum + e.balance, 0);

  const snapshot: LeaderboardSnapshot = {
    entries,
    generatedAt: new Date().toISOString(),
    totalMembers: entries.length,
    totalPoints,
  };

  // Cache
  cache.set(CACHE_KEY, snapshot, CACHE_TTL_MS);

  logger.info("Leaderboard computed", {
    duration: Date.now() - start,
    totalMembers: entries.length,
  });

  return snapshot;
}

/**
 * Force invalidate cache (misal setelah major operation).
 */
export function invalidateLeaderboardCache(): void {
  cache.delete(CACHE_KEY);
  pendingDelta = 0;
  logger.info("Leaderboard cache invalidated");
}

/**
 * Get leaderboard with auto-invalidation.
 * Returns cached version kalau delta kecil, recompute kalau besar.
 */
export async function getSmartLeaderboard(): Promise<LeaderboardSnapshot> {
  // Check pending delta
  if (pendingDelta >= REVALIDATE_THRESHOLD) {
    invalidateLeaderboardCache();
    pendingDelta = 0;
  }

  return getLeaderboardSnapshot();
}

/**
 * Update single leaderboard entry (used by real-time updates).
 * Untuk update minor (1-2 poin), bisa update cache tanpa full recompute.
 */
export async function updateEntryInCache(memberId: string, delta: number): Promise<void> {
  const snapshot = cache.get<LeaderboardSnapshot>(CACHE_KEY);
  if (!snapshot) return; // No cache, nothing to update

  const entry = snapshot.entries.find((e) => e.member.id === memberId);
  if (!entry) return;

  const oldBalance = entry.balance;
  entry.balance = Math.max(0, oldBalance + delta);

  // Re-sort & re-rank
  snapshot.entries.sort((a, b) => b.balance - a.balance);
  snapshot.entries.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  snapshot.totalPoints = snapshot.entries.reduce((sum, e) => sum + e.balance, 0);
  snapshot.generatedAt = new Date().toISOString();

  cache.set(CACHE_KEY, snapshot, CACHE_TTL_MS);
}

/**
 * Get specific member's current rank.
 */
export async function getMemberRank(memberId: string): Promise<number | null> {
  const snapshot = await getSmartLeaderboard();
  const entry = snapshot.entries.find((e) => e.member.id === memberId);
  return entry?.rank ?? null;
}
