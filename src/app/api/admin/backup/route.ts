import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { requireFullLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

interface BackupFile {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  ageDays: number;
}

/**
 * GET /api/admin/backup — unduh file database SQLite.
 * Query: ?list=1 untuk list backup files.
 */
export async function GET(req: Request) {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  const { searchParams } = new URL(req.url);

  // Mode: list backup files di folder backups/
  if (searchParams.get("list") === "1") {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl || !dbUrl.startsWith("file:")) {
        return NextResponse.json(
          { error: "DATABASE_URL tidak valid" },
          { status: 500 }
        );
      }
      const dbPath = dbUrl.replace(/^file:/, "");
      const dbDir = path.dirname(dbPath);
      const backupDir = path.join(dbDir, "backups");

      // Cek folder ada
      try {
        await fs.access(backupDir);
      } catch {
        return NextResponse.json({ backups: [], count: 0 });
      }

      const files = await fs.readdir(backupDir);
      const backups: BackupFile[] = [];
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith(".db")) continue;
        const filePath = path.join(backupDir, file);
        try {
          const stat = await fs.stat(filePath);
          const ageMs = now - stat.mtimeMs;
          backups.push({
            name: file,
            path: filePath,
            sizeBytes: stat.size,
            createdAt: stat.mtime.toISOString(),
            ageDays: Math.floor(ageMs / 86400000),
          });
        } catch (e) {
          logger.error("[backup] Gagal membaca info file backup:", { error: String(e) });
        }
      }

      // Sort newest first
      backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return NextResponse.json({ backups, count: backups.length });
    } catch (err) {
      logger.error("Failed to list backups", { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: "Gagal list backup" }, { status: 500 });
    }
  }

  // Mode: download current DB
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.startsWith("file:")) {
      return NextResponse.json(
        { error: "DATABASE_URL tidak valid atau bukan SQLite" },
        { status: 500 }
      );
    }

    const dbPath = dbUrl.replace(/^file:/, "");

    try {
      await fs.access(dbPath);
    } catch {
      return NextResponse.json(
        { error: "File database tidak ditemukan di server" },
        { status: 404 }
      );
    }

    const dbBuffer = await fs.readFile(dbPath);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `jendela-ilmu-backup-${dateStr}.db`;

    return new NextResponse(dbBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(dbBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    logger.error("Backup failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Gagal membuat backup database" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/backup — create backup now.
 * Body: { name?: string } (optional custom name)
 */
export async function POST(req: Request) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const customName = body.name as string | undefined;

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.startsWith("file:")) {
      return NextResponse.json(
        { error: "DATABASE_URL tidak valid" },
        { status: 500 }
      );
    }
    const dbPath = dbUrl.replace(/^file:/, "");
    const dbDir = path.dirname(dbPath);
    const backupDir = path.join(dbDir, "backups");
    await fs.mkdir(backupDir, { recursive: true });

    // Safe online backup approach: use SQLite backup API via better-sqlite3 (if available)
    // Fallback: simple file copy (safe when no active writes)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = customName
      ? `${customName}-${timestamp}.db`
      : `jendela-ilmu-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, fileName);

    const dbBuffer = await fs.readFile(dbPath);
    await fs.writeFile(backupPath, dbBuffer);

    // Rotate: hapus backup > 30 hari (user-created, cron handles 7 days)
    const files = await fs.readdir(backupDir);
    const cutoff = Date.now() - 30 * 86400000;
    let deleted = 0;
    for (const file of files) {
      if (!file.endsWith(".db") || file === fileName) continue;
      const filePath = path.join(backupDir, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs < cutoff) {
          await fs.unlink(filePath);
          deleted++;
        }
      } catch (e) {
        logger.error("[backup] Gagal menghapus backup lama:", { error: String(e) });
      }
    }

    await logAudit(user!.id, "SETTING_CHANGE", "Backup", fileName, `Manual backup created`);
    logger.info("Backup created", { fileName, sizeBytes: dbBuffer.length, userId: user!.id });

    return NextResponse.json({
      success: true,
      file: fileName,
      sizeBytes: dbBuffer.length,
      rotated: deleted,
    });
  } catch (err) {
    logger.error("Manual backup failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Gagal membuat backup" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/backup — hapus backup file.
 * Body: { fileName: string }
 */
export async function DELETE(req: Request) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    const fileName = body.fileName as string;

    if (!fileName || !fileName.endsWith(".db")) {
      return NextResponse.json({ error: "fileName tidak valid" }, { status: 400 });
    }

    // Prevent path traversal
    if (fileName.includes("/") || fileName.includes("..")) {
      return NextResponse.json({ error: "fileName tidak valid" }, { status: 400 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.startsWith("file:")) {
      return NextResponse.json({ error: "DATABASE_URL tidak valid" }, { status: 500 });
    }
    const dbDir = path.dirname(dbUrl.replace(/^file:/, ""));
    const backupDir = path.join(dbDir, "backups");
    const filePath = path.join(backupDir, fileName);

    await fs.unlink(filePath);
    await logAudit(user!.id, "SETTING_CHANGE", "Backup", fileName, `Backup deleted`);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Delete backup failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Gagal hapus backup" }, { status: 500 });
  }
}
