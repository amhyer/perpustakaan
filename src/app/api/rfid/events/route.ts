import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getEventLog } from "@/lib/rfid-handler";

/**
 * GET /api/rfid/events — Recent RFID event log.
 *
 * Query: ?limit=50&readerCode=...&eventType=...&memberId=...
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 200);
  const filters = {
    readerCode: searchParams.get("readerCode") || undefined,
    eventType: searchParams.get("eventType") || undefined,
    memberId: searchParams.get("memberId") || undefined,
  };

  const events = await getEventLog(limit, filters);
  return NextResponse.json({ items: events });
}
