import { NextResponse } from "next/server";
import { requireFullLibrarian } from "@/lib/auth";
import { sealBlock } from "@/lib/blockchain-audit";

/**
 * POST /api/blockchain/seal — Manually trigger block sealing.
 *
 * Only full librarians can seal blocks manually.
 * Auto-sealing happens on cron / batch size.
 *
 * Body: { batchSize?: number, difficulty?: number }
 */
export async function POST(req: Request) {
  const { user, error } = await requireFullLibrarian();
  if (error || !user) return error;

  let body: { batchSize?: number; difficulty?: number } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    // empty body OK
  }

  const result = await sealBlock({
    reason: "MANUAL",
    sealedBy: user.id,
    batchSize: body.batchSize,
    difficulty: body.difficulty,
  });

  if (!result) {
    return NextResponse.json({
      sealed: 0,
      message: "Tidak ada event pending untuk di-seal",
    });
  }

  return NextResponse.json({
    success: true,
    block: result.block,
    eventsSealed: result.sealed,
  });
}
