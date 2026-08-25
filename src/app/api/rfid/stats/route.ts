import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getRFIDStats } from "@/lib/rfid-handler";

/**
 * GET /api/rfid/stats — Daily statistics for RFID system.
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const stats = await getRFIDStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET rfid/stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
