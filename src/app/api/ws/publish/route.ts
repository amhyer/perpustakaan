import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/ws/publish — Publish event ke WebSocket server.
 *
 * Dipanggil dari API routes (loan returned, point earned, dll) untuk
 * broadcast ke WebSocket clients. Lebih reliable daripada SSE-only.
 *
 * Body: { channel: string, data: any, broadcast?: boolean }
 *
 * Channel format:
 * - "global" - semua connected clients
 * - "user:USER_ID" - specific user
 * - "member:MEMBER_ID" - specific member
 * - "role:STUDENT" - all with role
 * - "room:ROOM_ID" - specific room
 */
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error;

  let body: { channel?: string; data?: any; broadcast?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.channel || !body.data) {
    return NextResponse.json(
      { error: "channel and data are required" },
      { status: 400 }
    );
  }

  // Security: pustakawan only can broadcast
  if (body.broadcast && user.role !== "LIBRARIAN" && user.role !== "PUSTAKAWAN_JUNIOR") {
    return NextResponse.json(
      { error: "Forbidden: only librarians can broadcast" },
      { status: 403 }
    );
  }

  // Security: validate channel access
  if (body.channel.startsWith("user:")) {
    const targetUserId = body.channel.slice(5);
    if (
      targetUserId !== user.id &&
      user.role !== "LIBRARIAN" &&
      user.role !== "PUSTAKAWAN_JUNIOR"
    ) {
      return NextResponse.json(
        { error: "Cannot publish to other user's channel" },
        { status: 403 }
      );
    }
  }

  const wsPort = process.env.WS_PORT || "3003";
  const wsSecret = process.env.WS_WEBHOOK_SECRET || "ws-internal-secret";

  try {
    const res = await fetch(`http://localhost:${wsPort}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wsSecret}`,
      },
      body: JSON.stringify({
        channel: body.channel,
        data: body.data,
        broadcast: body.broadcast || false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn("WS publish failed", { status: res.status, text });
      return NextResponse.json(
        { error: "Failed to publish to WebSocket server", detail: text },
        { status: 502 }
      );
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (err) {
    logger.error("WS publish error", { error: String(err) });
    return NextResponse.json(
      { error: "WebSocket server unavailable", detail: String(err) },
      { status: 503 }
    );
  }
}
