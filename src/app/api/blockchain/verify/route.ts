import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { verifyChain } from "@/lib/blockchain-audit";

/**
 * GET /api/blockchain/verify — Verify entire chain integrity.
 *
 * Returns detailed verification result.
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const result = await verifyChain();
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET blockchain/verify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
