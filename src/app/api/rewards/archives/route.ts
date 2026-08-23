import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { listArchives, archiveSemester, detectPeriod } from "@/lib/semester-archive";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * GET /api/rewards/archives — List all semester archives.
 * POST /api/rewards/archives — Trigger manual archive.
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  const archives = await listArchives();
  const currentPeriod = detectPeriod();

  return NextResponse.json({
    archives: archives.map((a) => ({
      id: a.id,
      periodName: a.periodName,
      periodType: a.periodType,
      startDate: a.startDate,
      endDate: a.endDate,
      totalMembers: a.totalMembers,
      totalPoints: a.totalPoints,
      archivedAt: a.archivedAt,
      archivedBy: a.archivedBy,
    })),
    currentPeriod,
  });
}

export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const result = await archiveSemester({
    periodName: body.periodName,
    periodType: body.periodType,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
    resetMode: body.resetMode,
    archiveBy: `manual:${user!.id}`,
    topN: body.topN,
  });

  await logAudit(
    user!.id,
    "SEMESTER_ARCHIVE",
    "SemesterArchive",
    result.archiveId,
    `Archive semester: ${result.totalMembers} members, mode: ${result.resetMode}`
  );

  logger.info("Manual semester archive triggered", {
    archiveId: result.archiveId,
    by: user!.id,
  });

  return NextResponse.json({ success: true, ...result });
}
