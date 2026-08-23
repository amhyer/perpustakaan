import { NextResponse } from "next/server";
import { runDueNotifications } from "@/lib/notification-schedule";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/notification-digest
 *
 * Jalankan scheduled notifications yang due hari ini.
 * Dipanggil dari cron harian (setelah /api/cron/daily-tasks).
 *
 * Auth: X-Cron-Secret
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
    const result = await runDueNotifications();
    logger.info("Cron: notification digest run", result);
    return NextResponse.json({ ...result, success: true });
  } catch (err) {
    logger.error("Cron: notification digest failed", { error: String(err) });
    return NextResponse.json({ error: "Digest failed" }, { status: 500 });
  }
}
