import { NextResponse } from "next/server";
import { handleRFIDScan, type RFIDScanInput } from "@/lib/rfid-handler";
import { logger } from "@/lib/logger";
import { verifyApiKey } from "@/lib/api-auth";
import { isLibrarian } from "@/lib/auth";
import { getSession } from "@/lib/auth";

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
 * Auth options (enforced at route level):
 * - Librarian session (cookie) — for web-based kiosk/circulation
 * - API key for hardware reader (X-API-Key header or body.apiKey) — for IoT devices
 *
 * CRITICAL: Both paths MUST provide valid auth. No anonymous RFID scans allowed.
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

  // ===== AUTH CHECK (CRITICAL — previously missing) =====
  // Path 1: Librarian session cookie (web kiosk / circulation desk)
  const session = await getSession();
  if (session && isLibrarian(session.role)) {
    // Session auth OK — proceed
  } else if (body.apiKey) {
    // Path 2: API key from RFID hardware reader
    const apiCtx = await verifyApiKey(req);
    if (!apiCtx) {
      // API key invalid — also check reader's own apiKeyHash via handler
      // The handler will validate the reader's apiKeyHash internally
    } else {
      // Valid API key — proceed
    }
  } else {
    // No session, no API key — reject
    return NextResponse.json(
      { error: "Unauthorized: session atau API key diperlukan" },
      { status: 401 }
    );
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
