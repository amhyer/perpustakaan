import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFullLibrarian } from "@/lib/auth";
import { logError } from "@/lib/error-tracker";

/**
 * GET /api/error-log — lihat daftar error (pustakawan penuh).
 *
 * Query params:
 * - level: filter by level (DEBUG, INFO, WARN, ERROR, FATAL)
 * - resolved: filter by resolved status (true/false)
 * - limit: default 100, max 500
 * - offset: default 0
 */
export async function GET(req: Request) {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const level = url.searchParams.get("level");
    const resolvedParam = url.searchParams.get("resolved");
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") || "100")));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));

    const where: any = {};
    if (level) where.level = level;
    if (resolvedParam !== null) {
      where.resolved = resolvedParam === "true";
    }

    const [errors, total] = await Promise.all([
      db.errorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.errorLog.count({ where }),
    ]);

    return NextResponse.json({
      errors,
      pagination: { total, limit, offset },
    });
  } catch (err) {
    await logError(err instanceof Error ? err : new Error(String(err)), {
      level: "ERROR",
      context: { url: req.url, method: "GET" },
    });
    return NextResponse.json({ error: "Gagal memuat error log" }, { status: 500 });
  }
}
