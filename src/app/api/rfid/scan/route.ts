import { NextResponse } from "next/server";
import { handleRFIDScan, type RFIDScanInput } from "@/lib/rfid-handler";
import { logger } from "@/lib/logger";

/**
 * POST /api/rfid/scan — Process a scan event from RFID reader.
 *
 * Body: {
 *   readerCode: string,
 *   uid: string,
 *   bookTagUid?: string,
 *   scannedAt?: ISO string,
 *   rawData?: object,
 *   apiKey?: string
 * }
 *
 * Returns: RFIDResponse with beep/LED instructions for reader.
 *
 * Auth options:
 * - Librarian session (cookie)
 * - API key for hardware reader (X-API-Key header or body.apiKey)
 */
export async function POST(req: Request) {
  let body: RFIDScanInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.readerCode || !body.uid) {
    return NextResponse.json(
      { error: "readerCode and uid are required" },
      { status: 400 }
    );
  }

  // Also accept API key from header
  const apiKeyHeader = req.headers.get("X-API-Key");
  if (apiKeyHeader && !body.apiKey) {
    body.apiKey = apiKeyHeader;
  }

  try {
    const result = await handleRFIDScan(body);
    return NextResponse.json(result);
  } catch (err) {
    logger.error("RFID scan error", { error: String(err), body });
    return NextResponse.json(
      {
        success: false,
        eventType: "ERROR",
        status: "ERROR",
        message: "Internal error",
        readerResponse: { beep: true, led: "RED", duration: 500 },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rfid/scan — Health check for RFID endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "rfid-scan",
    timestamp: new Date().toISOString(),
  });
}
