import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { verifyAuditEvent } from "@/lib/blockchain-audit";

/**
 * GET /api/blockchain/events/[id] — Verify a specific audit log by ID.
 *
 * Returns merkle proof verification result.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const { id } = await params;
    const result = await verifyAuditEvent(id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET blockchain/events/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
