import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getBlockchainStats } from "@/lib/blockchain-audit";

/**
 * GET /api/blockchain/stats — Get blockchain statistics.
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  const stats = await getBlockchainStats();
  return NextResponse.json(stats);
}
