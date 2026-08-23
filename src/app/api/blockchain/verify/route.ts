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

  const result = await verifyChain();
  return NextResponse.json(result);
}
