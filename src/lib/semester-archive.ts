/**
 * Semester Archive Service
 *
 * Bertanggung jawab untuk:
 * 1. Snapshot leaderboard per akhir semester
 * 2. Archive ke tabel SemesterArchive (immutable historical record)
 * 3. Opsional: reset saldo poin (configurable)
 * 4. Kirim notifikasi ke top winners
 *
 * 2x per tahun:
 * - Akhir Genap (Juli): archive semester Genap
 * - Akhir Ganjil (Januari): archive semester Ganjil
 *
 * Reset modes (Setting table):
 * - "ARCHIVE" (default): hanya archive, saldo tetap
 * - "RESET": archive + saldo di-reset ke 0
 * - "CARRYOVER": no archive, saldo tetap (legacy behavior)
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notification-service";

export type ResetMode = "ARCHIVE" | "RESET" | "CARRYOVER";

export interface ArchiveOptions {
  periodName?: string; // Default auto-detect
  periodType?: "ODD" | "EVEN" | "CUSTOM"; // Default auto-detect
  startDate?: Date;
  endDate?: Date;
  resetMode?: ResetMode;
  archiveBy?: string; // "auto-cron" | "manual:<userId>"
  topN?: number; // Default 100
}

export interface RankingEntry {
  rank: number;
  memberId: string;
  memberName: string;
  memberNumber: string;
  classGrade: string | null;
  totalPoints: number;
  booksRead: number;
}

/**
 * Detect current academic period.
 * Indonesia: Ganjil (Jul-Dec), Genap (Jan-Jun)
 */
export function detectPeriod(now: Date = new Date()): {
  periodName: string;
  periodType: "ODD" | "EVEN";
  startDate: Date;
  endDate: Date;
} {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  if (month >= 6) {
    // Ganjil: Jul - Dec
    return {
      periodName: `Ganjil ${year}/${year + 1}`,
      periodType: "ODD",
      startDate: new Date(year, 6, 1), // 1 Juli
      endDate: new Date(year, 11, 31, 23, 59, 59), // 31 Des
    };
  } else {
    // Genap: Jan - Jun
    return {
      periodName: `Genap ${year - 1}/${year}`,
      periodType: "EVEN",
      startDate: new Date(year, 0, 1), // 1 Jan
      endDate: new Date(year, 5, 30, 23, 59, 59), // 30 Jun
    };
  }
}

/**
 * Ambil top N members by saldo poin + statistik.
 */
export async function getTopMembers(limit = 100): Promise<RankingEntry[]> {
  // Get latest balance per member via distinct query
  const balances = await db.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["memberId"],
    take: 500, // ambil banyak dulu, filter nanti
    select: {
      memberId: true,
      balanceAfter: true,
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
          classGrade: true,
        },
      },
    },
  });

  // Sort by balance desc
  const sorted = balances.sort((a, b) => b.balanceAfter - a.balanceAfter).slice(0, limit);

  // Hitung booksRead per member (dari loans di periode ini)
  const memberIds = sorted.map((b) => b.memberId);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

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

  return sorted.map((entry, idx) => ({
    rank: idx + 1,
    memberId: entry.memberId,
    memberName: entry.member.fullName,
    memberNumber: entry.member.memberNumber,
    classGrade: entry.member.classGrade,
    totalPoints: entry.balanceAfter,
    booksRead: booksMap.get(entry.memberId) || 0,
  }));
}

/**
 * Archive semester: snapshot + opsional reset.
 */
export async function archiveSemester(
  options: ArchiveOptions = {}
): Promise<{ archiveId: string; totalMembers: number; resetMode: ResetMode }> {
  // Detect period
  const now = new Date();
  const detected = detectPeriod(now);
  const periodName = options.periodName || detected.periodName;
  const periodType = options.periodType || detected.periodType;
  const startDate = options.startDate || detected.startDate;
  const endDate = options.endDate || detected.endDate;
  const archiveBy = options.archiveBy || "auto-cron";
  const topN = options.topN || 100;

  // Get reset mode from setting
  const modeSetting = await db.setting.findUnique({
    where: { key: "leaderboard_reset_mode" },
  });
  const resetMode: ResetMode =
    options.resetMode || ((modeSetting?.value as ResetMode) || "ARCHIVE");

  // Cek apakah sudah ada archive untuk periode ini
  const existing = await db.semesterArchive.findUnique({
    where: {
      periodName_periodType: { periodName, periodType },
    },
  });
  if (existing) {
    logger.warn("Semester archive already exists", { periodName, periodType, existingId: existing.id });
    return { archiveId: existing.id, totalMembers: existing.totalMembers, resetMode };
  }

  // Get top members
  const rankings = await getTopMembers(topN);

  // Total points
  const allBalances = await db.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["memberId"],
    select: { balanceAfter: true },
  });
  const totalPoints = allBalances.reduce((sum, b) => sum + b.balanceAfter, 0);

  // Create archive
  const archive = await db.semesterArchive.create({
    data: {
      periodName,
      periodType,
      startDate,
      endDate,
      rankings: JSON.stringify(rankings),
      totalMembers: rankings.length,
      totalPoints,
      archivedBy: archiveBy,
    },
  });

  logger.info("Semester archive created", {
    archiveId: archive.id,
    periodName,
    periodType,
    totalMembers: rankings.length,
    resetMode,
  });

  // Reset saldo kalau mode = "RESET"
  if (resetMode === "RESET" && rankings.length > 0) {
    // Insert EXPIRE transactions untuk setiap member yang punya poin
    const membersWithPoints = rankings.filter((r) => r.totalPoints > 0);

    for (const entry of membersWithPoints) {
      await db.pointTransaction.create({
        data: {
          memberId: entry.memberId,
          type: "EXPIRE",
          amount: entry.totalPoints,
          balanceAfter: 0,
          description: `Reset poin - akhir ${periodName}`,
          expiresAt: new Date(),
        },
      });
    }
    logger.info(`Reset ${membersWithPoints.length} member saldo ke 0`, { periodName });
  }

  // Kirim notifikasi ke top 3 winners
  if (rankings.length >= 1) {
    for (const winner of rankings.slice(0, 3)) {
      const member = await db.member.findUnique({
        where: { id: winner.memberId },
        include: { user: { select: { id: true, email: true } } },
      });
      if (!member) continue;

      await notify({
        userId: member.user.id,
        title: `🏆 Top ${winner.rank} - ${periodName}!`,
        message: `Selamat! Anda排名第 ${winner.rank} pembaca terbaik periode ${periodName} dengan total ${winner.totalPoints} poin dari ${winner.booksRead} buku.`,
        type: "ANNOUNCEMENT",
        relatedId: archive.id,
      });
    }
  }

  return { archiveId: archive.id, totalMembers: rankings.length, resetMode };
}

/**
 * Ambil daftar archive (untuk history page).
 */
export async function listArchives() {
  return db.semesterArchive.findMany({
    orderBy: { archivedAt: "desc" },
    take: 20,
  });
}

/**
 * Get detail archive by ID.
 */
export async function getArchiveDetail(id: string) {
  const archive = await db.semesterArchive.findUnique({ where: { id } });
  if (!archive) return null;
  return {
    ...archive,
    rankings: JSON.parse(archive.rankings) as RankingEntry[],
  };
}
