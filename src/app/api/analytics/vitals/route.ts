import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * POST /api/analytics/vitals — receive Web Vitals dari client.
 * Log ke console (untuk dev) dan ke WebVital table (untuk production analysis).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, value, rating, id, url, userAgent } = body;

    if (!name || typeof value !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Log untuk debugging
    logger.debug(`Web Vital: ${name}`, {
      value: value.toFixed(2),
      rating,
      url,
      userAgent: userAgent?.substring(0, 50),
    });

    // Aggregate ke DB kalau perlu (optional — untuk analytics dashboard)
    // Untuk sekarang cukup log, nanti bisa di-extend

    return NextResponse.json({ success: true });
  } catch (err) {
    // Silent fail — analytics endpoint tidak boleh break
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

// Disable body parsing limit
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
