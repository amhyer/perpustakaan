import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  parseDapodikCSV,
  validateDapodikCSV,
  syncFromDapodik,
  type SyncMode,
} from "@/lib/dapodik";

/**
 * POST /api/integrations/dapodik — Sync data dari Dapodik.
 *
 * Body: { csv: string, mode: "FULL" | "INCREMENTAL" | "DRY_RUN" }
 *
 * Modes:
 * - DRY_RUN: parse & report, jangan update (untuk preview)
 * - INCREMENTAL: add new + update existing (default)
 * - FULL: replace all Dapodik-sourced members (deactivate yg tidak ada)
 */
export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json();
  const { csv, mode = "INCREMENTAL" as SyncMode } = body;

  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "csv wajib diisi" }, { status: 400 });
  }

  if (!["FULL", "INCREMENTAL", "DRY_RUN"].includes(mode)) {
    return NextResponse.json(
      { error: "mode harus FULL, INCREMENTAL, atau DRY_RUN" },
      { status: 400 }
    );
  }

  // Validate dulu
  const validation = validateDapodikCSV(csv);
  if (!validation.valid && mode !== "DRY_RUN") {
    return NextResponse.json(
      {
        error: "CSV tidak valid",
        validation,
      },
      { status: 400 }
    );
  }

  // Parse dan sync
  const rows = parseDapodikCSV(csv);
  const result = await syncFromDapodik(rows, {
    mode,
    actorId: user!.id,
  });

  await logAudit(
    user!.id,
    "DAPODIK_SYNC",
    "Member",
    undefined,
    `Sync Dapodik (${mode}): +${result.added} anggota, ${result.updated} updated, ${result.deactivated} deactivated`
  );

  logger.info("Dapodik sync via API", {
    actor: user!.id,
    mode,
    result,
  });

  return NextResponse.json({ success: true, result, validation });
}
