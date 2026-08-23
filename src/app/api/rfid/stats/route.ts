import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getRFIDStats } from "@/lib/rfid-handler";

/**
 * GET /api/rfid/stats — Daily statistics for RFID system.
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  const stats = await getRFIDStats();
  return NextResponse.json(stats);
}
