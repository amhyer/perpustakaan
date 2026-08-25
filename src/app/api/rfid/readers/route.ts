import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getAllReaders, getReaderStatus } from "@/lib/rfid-handler";

/**
 * GET /api/rfid/readers — List all active RFID readers with status.
 */
export async function GET(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error || !user) return error;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (code) {
      const reader = await getReaderStatus(code);
      if (!reader) {
        return NextResponse.json({ error: "Reader not found" }, { status: 404 });
      }
      return NextResponse.json(reader);
    }

    const readers = await getAllReaders();
    return NextResponse.json({ items: readers });
  } catch (err) {
    console.error("GET rfid/readers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
