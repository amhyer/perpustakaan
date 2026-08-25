import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getBlockchainStats } from "@/lib/blockchain-audit";

/**
 * GET /api/blockchain/stats — Get blockchain statistics.
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const stats = await getBlockchainStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET blockchain/stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
