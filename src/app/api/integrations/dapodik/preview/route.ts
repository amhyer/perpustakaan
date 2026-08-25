import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { validateDapodikCSV, parseDapodikCSV, syncFromDapodik } from "@/lib/dapodik";

/**
 * POST /api/integrations/dapodik/preview — Preview sync tanpa update.
 *
 * Body: { csv: string }
 *
 * Returns: validation result + what would happen (added, updated, errors)
 *        kalau mode = DRY_RUN.
 */
export async function POST(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    const { csv } = body;

    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ error: "csv wajib diisi" }, { status: 400 });
    }

    // Validate
    const validation = validateDapodikCSV(csv);

    // DRY_RUN
    const rows = parseDapodikCSV(csv);
    const dryResult = await syncFromDapodik(rows, { mode: "DRY_RUN" });

    return NextResponse.json({
      validation,
      preview: dryResult,
    });
  } catch (err) {
    console.error("POST integrations/dapodik/preview error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
