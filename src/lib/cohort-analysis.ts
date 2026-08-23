/**
 * Cohort Analysis — Retensi siswa per bulan.
 *
 * Konsep cohort:
 * - Cohort = siswa yang gabung di bulan X
 * - Track berapa % dari cohort tersebut yang masih aktif (pinjam buku) di bulan Y
 * - Berguna untuk: melihat apakah siswa baru langsung aktif, atau butuh stimulasi
 *
 * Contoh hasil:
 * | Cohort       | Size | M+0  | M+1  | M+2  | M+3  |
 * | 2025-01     | 50   | 100% | 80%  | 60%  | 40%  |
 * | 2025-02     | 45   | 100% | 75%  | 55%  | -    |
 * | 2025-03     | 60   | 100% | 90%  | -    | -    |
 *
 * "M+0" = bulan yang sama dengan gabung
 * "M+1" = 1 bulan setelah gabung
 * dst.
 *
 * "Aktif" = punya minimal 1 loan RETURNED di bulan tersebut.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface CohortRow {
  cohort: string; // "2025-01"
  size: number; // Berapa siswa gabung di bulan ini
  retention: { [monthsAfter: number]: number }; // % aktif di M+0, M+1, dll
  totalLoans: { [monthsAfter: number]: number }; // Total loans per period
}

export interface CohortAnalysisResult {
  cohorts: CohortRow[];
  period: { from: Date; to: Date };
  totalStudents: number;
  generatedAt: string;
}

interface CohortOptions {
  /** Berapa bulan ke belakang (default 6) */
  monthsBack?: number;
  /** Berapa bulan ke depan yang di-track (default 3) */
  trackMonths?: number;
  /** Role filter */
  role?: "STUDENT" | "TEACHER" | "ALL";
}

/**
 * Hitung cohort analysis.
 */
export async function getCohortAnalysis(
  options: CohortOptions = {}
): Promise<CohortAnalysisResult> {
  const monthsBack = options.monthsBack || 6;
  const trackMonths = options.trackMonths || 3;
  const role = options.role || "STUDENT";

  // Date range: dari (monthsBack) bulan lalu sampai sekarang
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - monthsBack);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  // Get semua member yang join dalam range
  const members = await db.member.findMany({
    where: {
      joinDate: { gte: from },
      ...(role !== "ALL" ? { category: role } : {}),
    },
    select: {
      id: true,
      joinDate: true,
      fullName: true,
    },
  });

  // Group by cohort (year-month)
  const cohortMap = new Map<string, string[]>(); // cohort → memberIds
  for (const m of members) {
    const cohort = `${m.joinDate.getFullYear()}-${String(m.joinDate.getMonth() + 1).padStart(2, "0")}`;
    if (!cohortMap.has(cohort)) cohortMap.set(cohort, []);
    cohortMap.get(cohort)!.push(m.id);
  }

  // Untuk setiap cohort, hitung retention
  const cohorts: CohortRow[] = [];

  for (const [cohort, memberIds] of cohortMap.entries()) {
    const cohortDate = new Date(`${cohort}-01`);
    const size = memberIds.length;
    const retention: { [k: number]: number } = {};
    const totalLoans: { [k: number]: number } = {};

    for (let m = 0; m <= trackMonths; m++) {
      // Hitung range bulan
      const periodStart = new Date(cohortDate);
      periodStart.setMonth(periodStart.getMonth() + m);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Hitung berapa member yang punya loan RETURNED di periode ini
      const activeLoans = await db.loan.findMany({
        where: {
          memberId: { in: memberIds },
          status: "RETURNED",
          returnDate: { gte: periodStart, lt: periodEnd },
        },
        select: { memberId: true },
        distinct: ["memberId"],
      });

      const activeCount = activeLoans.length;
      const totalCount = await db.loan.count({
        where: {
          memberId: { in: memberIds },
          status: "RETURNED",
          returnDate: { gte: periodStart, lt: periodEnd },
        },
      });

      retention[m] = size > 0 ? Math.round((activeCount / size) * 100) : 0;
      totalLoans[m] = totalCount;
    }

    cohorts.push({ cohort, size, retention, totalLoans });
  }

  // Sort by cohort desc (newest first)
  cohorts.sort((a, b) => b.cohort.localeCompare(a.cohort));

  const result: CohortAnalysisResult = {
    cohorts,
    period: { from, to: now },
    totalStudents: members.length,
    generatedAt: new Date().toISOString(),
  };

  logger.info("Cohort analysis generated", {
    monthsBack,
    trackMonths,
    cohortCount: cohorts.length,
    totalStudents: members.length,
  });

  return result;
}

/**
 * Compact summary: berapa % siswa yang aktif di M+1 setelah gabung.
 * Berguna untuk KPI card.
 */
export async function getRetentionSummary(
  options: CohortOptions = {}
): Promise<{
  m1Retention: number; // Rata-rata retensi di M+1
  m3Retention: number; // Rata-rata retensi di M+3
  totalCohorts: number;
  totalStudents: number;
}> {
  const data = await getCohortAnalysis(options);

  let m1Sum = 0, m1Count = 0;
  let m3Sum = 0, m3Count = 0;

  for (const cohort of data.cohorts) {
    if (cohort.retention[1] !== undefined) {
      m1Sum += cohort.retention[1];
      m1Count++;
    }
    if (cohort.retention[3] !== undefined) {
      m3Sum += cohort.retention[3];
      m3Count++;
    }
  }

  return {
    m1Retention: m1Count > 0 ? Math.round(m1Sum / m1Count) : 0,
    m3Retention: m3Count > 0 ? Math.round(m3Sum / m3Count) : 0,
    totalCohorts: data.cohorts.length,
    totalStudents: data.totalStudents,
  };
}
