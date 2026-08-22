import { NextRequest } from "next/server";
import { eventBus, EVENTS, type EventType } from "@/lib/event-bus";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/events/stream — Server-Sent Events stream.
 *
 * Subscribe ke real-time events untuk user yang sedang login.
 * Frontend pakai EventSource API:
 *   const source = new EventSource("/api/events/stream");
 *   source.addEventListener("notification:new", (e) => { ... });
 *
 * Catatan: SSE bekerja dengan baik untuk one-way server→client updates.
 * Untuk true bidirectional, pakai WebSocket (lihat /api/ws).
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.userId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: new Date().toISOString() })}\n\n`)
      );

      // Heartbeat setiap 30 detik (keep connection alive)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Connection closed
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Subscribe to events
      const subId = eventBus.subscribe(userId, ({ event, data, timestamp }) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify({ ...data, timestamp })}\n\n`
            )
          );
        } catch (err) {
          logger.warn("SSE write failed (client disconnected?)", { userId, event });
        }
      });

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat);
        eventBus.unsubscribe(subId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
        logger.debug("SSE connection closed", { userId, subId });
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
