/**
 * Generic data export endpoint.
 *
 * GET /api/export?type=books&from=2024-01-01&to=2024-12-31
 * GET /api/export?type=members&anonymize=true
 * GET /api/export?type=loans&status=ACTIVE
 * GET /api/export?type=fines&status=unpaid
 * GET /api/export?type=reservations&status=active
 * GET /api/export?type=audit
 *
 * Returns CSV file with Content-Disposition: attachment.
 * Librarian-only.
 *
 * Sprint L-Phase 2: Bulk Operations API + Data Export.
 */

import { NextResponse } from "next/server";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { exportData, type ExportType } from "@/lib/data-export";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

const VALID_TYPES: ExportType[] = [
  "books",
  "members",
  "loans",
  "fines",
  "reservations",
  "audit",
];

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!isLibrarian(user!.role)) {
    return NextResponse.json(
      { error: "Hanya pustakawan yang dapat mengekspor data" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as ExportType | null;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const anonymize = url.searchParams.get("anonymize") === "true";
  const status = url.searchParams.get("status") || undefined;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      {
        error: "type wajib diisi",
        validTypes: VALID_TYPES,
        example: "/api/export?type=books&from=2024-01-01&to=2024-12-31",
      },
      { status: 400 }
    );
  }

  // Validate date params
  if (from && isNaN(Date.parse(from))) {
    return NextResponse.json(
      { error: "from harus berformat tanggal ISO (YYYY-MM-DD)" },
      { status: 400 }
    );
  }
  if (to && isNaN(Date.parse(to))) {
    return NextResponse.json(
      { error: "to harus berformat tanggal ISO (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  try {
    const result = await exportData({ type, from, to, anonymize, status });

    // Audit log
    await logAudit(
      user!.id,
      "EXPORT_DATA",
      type,
      "export",
      JSON.stringify({
        type,
        from,
        to,
        anonymize,
        status,
        rowCount: result.rowCount,
      })
    );

    logger.info("Data export API", {
      userId: user!.id,
      type,
      rowCount: result.rowCount,
    });

    // Return CSV with proper headers
    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Row-Count": String(result.rowCount),
        "X-Generated-At": result.generatedAt.toISOString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    logger.error("Export failed", { error: err.message, type });
    return NextResponse.json(
      { error: "Gagal mengekspor data", detail: err.message },
      { status: 500 }
    );
  }
}
