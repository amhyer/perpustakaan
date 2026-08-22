import { NextResponse } from "next/server";
import { logError } from "@/lib/error-tracker";
import { rateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { getSession } from "@/lib/auth";

/**
 * POST /api/error-log/client — terima error dari client (browser).
 *
 * Body: { message: string, stack?: string, context?: object }
 *
 * Rate limited untuk hindari abuse (max 30/menit per IP).
 */
export async function POST(req: Request) {
  // Rate limit by IP
  const identifier = getClientIdentifier(req);
  const rl = rateLimit({
    key: `error-client:${identifier}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return rateLimitResponse(rl, "Terlalu banyak error report.");
  }

  try {
    const body = await req.json();
    const { message, stack, context } = body as {
      message: string;
      stack?: string;
      context?: Record<string, any>;
    };

    if (!message) {
      return NextResponse.json({ error: "Message wajib diisi" }, { status: 400 });
    }

    // Ambil user dari session kalau ada
    const session = await getSession();

    const err = new Error(message);
    err.stack = stack;

    await logError(err, {
      level: "ERROR",
      context: {
        ...context,
        userId: session?.userId,
        ip: identifier,
        source: "client",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    // Jangan log ke error tracker (akan jadi infinite loop)
    console.error("[error-log/client] Gagal:", err);
    return NextResponse.json({ error: "Gagal log error" }, { status: 500 });
  }
}
