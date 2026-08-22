// src/instrumentation.ts
// Scheduler harian in-proses untuk deployment standalone (Windows/Node):
// memicu /api/cron/daily-tasks (pengingat jatuh tempo + status OVERDUE)
// dan /api/cron/backup-db (backup DB + rotasi 7 hari) via loopback HTTP.
//
// DI NONAKTIFKAN bila env CRON_SECRET tidak di-set (fail-closed, aman).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[cron] CRON_SECRET tidak di-set — scheduler harian dinonaktifkan.");
    return;
  }

  const port = process.env.PORT || "3000";
  const base = `http://127.0.0.1:${port}`;
  const INTERVAL_MS = 24 * 60 * 60 * 1000;

  const runTask = async (path: string, headers: Record<string, string>) => {
    try {
      const res = await fetch(`${base}${path}`, {
        headers,
        signal: AbortSignal.timeout(30_000),
      });
      const body = await res.json().catch(() => ({}));
      console.log(`[cron] ${path} -> ${res.status}`, JSON.stringify(body).slice(0, 200));
    } catch (err) {
      console.error(`[cron] ${path} gagal:`, err instanceof Error ? err.message : String(err));
    }
  };

  const runDaily = async () => {
    await runTask("/api/cron/daily-tasks", { Authorization: `Bearer ${cronSecret}` });
    await runTask("/api/cron/backup-db", { "X-Cron-Secret": cronSecret });
  };

  // Pertama kali 60 detik setelah server siap, lalu setiap 24 jam.
  setTimeout(() => {
    void runDaily();
  }, 60_000);
  setInterval(() => {
    void runDaily();
  }, INTERVAL_MS);

  console.log(`[cron] Scheduler harian aktif (${base}), interval 24 jam.`);
}