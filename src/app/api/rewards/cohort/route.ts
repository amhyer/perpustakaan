import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getCohortAnalysis, getRetentionSummary } from "@/lib/cohort-analysis";

/**
 * GET /api/rewards/cohort — Cohort analysis untuk retensi siswa.
 *
 * Query params:
 * - monthsBack: berapa bulan ke belakang (default 6)
 * - trackMonths: berapa bulan ke depan di-track (default 3)
 * - role: STUDENT | TEACHER | ALL (default STUDENT)
 *
 * Returns:
 * - cohorts: array of { cohort, size, retention: {0: 100, 1: 80, ...}, totalLoans }
 * - summary: { m1Retention, m3Retention, totalCohorts, totalStudents }
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const monthsBack = parseInt(searchParams.get("monthsBack") || "6");
  const trackMonths = parseInt(searchParams.get("trackMonths") || "3");
  const role = (searchParams.get("role") as "STUDENT" | "TEACHER" | "ALL") || "STUDENT";

  // Validation
  if (monthsBack < 1 || monthsBack > 24) {
    return NextResponse.json(
      { error: "monthsBack harus 1-24" },
      { status: 400 }
    );
  }
  if (trackMonths < 1 || trackMonths > 12) {
    return NextResponse.json(
      { error: "trackMonths harus 1-12" },
      { status: 400 }
    );
  }

  const [cohorts, summary] = await Promise.all([
    getCohortAnalysis({ monthsBack, trackMonths, role }),
    getRetentionSummary({ monthsBack, trackMonths, role }),
  ]);

  return NextResponse.json({
    cohorts,
    summary,
  });
}
