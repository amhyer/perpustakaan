import { NextResponse } from "next/server";
import { archiveSemester } from "@/lib/semester-archive";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/reward-archive
 *
 * Endpoint untuk auto-archive semester (trigger dari cron di akhir semester).
 * Auth: X-Cron-Secret header (sama dengan backup-db).
 *
 * Dipanggil dari:
 * - Manual: curl -H "X-Cron-Secret: $CRON_SECRET" /api/cron/reward-archive
 * - Scheduler: instrumentation.ts (jika ada setting 'enable_reward_cron')
 * - Vercel Cron (deployment Vercel)
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET belum dikonfigurasi" },
      { status: 503 }
    );
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await archiveSemester({ archiveBy: "auto-cron" });
    logger.info("Cron: semester archived", result);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    logger.error("Cron: semester archive failed", { error: String(err) });
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}
