import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { requireFullLibrarian } from "@/lib/auth";

// GET /api/admin/backup — unduh file database SQLite
// Hanya LIBRARIAN yang boleh mengakses endpoint ini.
// Return file sebagai attachment dengan nama menyertakan tanggal hari ini.
export async function GET() {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  try {
    // Parse DATABASE_URL untuk dapat path file DB
    // Format: file:/path/to/custom.db
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.startsWith("file:")) {
      return NextResponse.json(
        { error: "DATABASE_URL tidak valid atau bukan SQLite" },
        { status: 500 }
      );
    }

    const dbPath = dbUrl.replace(/^file:/, "");

    // Cek file ada
    try {
      await fs.access(dbPath);
    } catch {
      return NextResponse.json(
        { error: "File database tidak ditemukan di server" },
        { status: 404 }
      );
    }

    // Baca file DB
    const dbBuffer = await fs.readFile(dbPath);

    // Generate nama file dengan tanggal hari ini
    // Format: jendela-ilmu-backup-YYYY-MM-DD.db
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const fileName = `jendela-ilmu-backup-${dateStr}.db`;

    // Return sebagai attachment (force download, bukan inline)
    return new NextResponse(dbBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(dbBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat backup database" },
      { status: 500 }
    );
  }
}
