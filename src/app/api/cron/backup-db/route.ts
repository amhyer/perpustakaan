import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

// GET /api/cron/backup-db — cron job harian: backup DB ke folder backups/
// dengan rotasi 7 hari (hapus file backup lebih dari 7 hari).
//
// Trigger: cron external (mis. curl setiap jam 02:00) atau Vercel Cron.
// TIDAK butuh auth (cron token via header X-Cron-Secret untuk keamanan).
// Kalau env CRON_SECRET tidak di-set, endpoint ditolak (fail-closed).

const BACKUP_DIR_NAME = "backups";
const ROTATION_DAYS = 7;

export async function GET(req: Request) {
  // Auth via secret header (cron token)
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
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.startsWith("file:")) {
      return NextResponse.json(
        { error: "DATABASE_URL tidak valid" },
        { status: 500 }
      );
    }
    const dbPath = dbUrl.replace(/^file:/, "");

    // Tentukan folder backup: di sibling dengan file DB
    // (mis. DB di /app/db/custom.db → backup di /app/db/backups/)
    const dbDir = path.dirname(dbPath);
    const backupDir = path.join(dbDir, BACKUP_DIR_NAME);
    await fs.mkdir(backupDir, { recursive: true });

    // 1. Salin DB ke backup dengan timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-"); // 2026-08-12T02-00-00-000Z
    const dateStr = now.toISOString().slice(0, 10);
    const backupFileName = `jendela-ilmu-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    const dbBuffer = await fs.readFile(dbPath);
    await fs.writeFile(backupPath, dbBuffer);

    // 2. Rotasi: hapus file backup lebih dari 7 hari
    const files = await fs.readdir(backupDir);
    const cutoff = now.getTime() - ROTATION_DAYS * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      if (!file.endsWith(".db")) continue;
      const filePath = path.join(backupDir, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs < cutoff) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch {
        // skip file yang gagal di-stat
      }
    }

    const remainingFiles = (await fs.readdir(backupDir)).filter((f) => f.endsWith(".db"));

    return NextResponse.json({
      success: true,
      backup: backupFileName,
      date: dateStr,
      sizeBytes: dbBuffer.length,
      rotated: {
        deleted: deletedCount,
        remaining: remainingFiles.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal menjalankan backup cron", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
