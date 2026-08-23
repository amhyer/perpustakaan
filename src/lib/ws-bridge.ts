/**
 * WebSocket Bridge — Forward events dari Next.js event bus ke WS server.
 *
 * Pattern: API routes publish ke event bus → bridge.listen() →
 * POST ke WS server /webhook → broadcast ke clients.
 *
 * Lebih reliable daripada SSE-only untuk multi-tab scenarios
 * dan bidirectional communication.
 */

import { eventBus, EVENTS, type EventType } from "@/lib/event-bus";
import { logger } from "@/lib/logger";

const WS_PORT = process.env.WS_PORT || "3003";
const WS_SECRET = process.env.WS_WEBHOOK_SECRET || "ws-internal-secret";

let isListening = false;

/**
 * Publish event to WS server.
 * Returns success status; logs warning kalau WS server unavailable.
 */
export async function publishToWS(
  channel: string,
  data: any,
  options: { broadcast?: boolean; skipFetch?: boolean } = {}
): Promise<boolean> {
  if (options.skipFetch) return false;

  try {
    const res = await fetch(`http://localhost:${WS_PORT}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WS_SECRET}`,
      },
      body: JSON.stringify({
        channel,
        data,
        broadcast: options.broadcast || false,
      }),
    });

    if (!res.ok) {
      logger.warn("WS publish failed", { status: res.status, channel });
      return false;
    }
    return true;
  } catch (err) {
    // WS server not running — silently fail (development mode OK)
    return false;
  }
}

/**
 * Forward event bus events ke WS server.
 * Set up sekali di app startup.
 */
export function startEventBusBridge() {
  if (isListening) {
    logger.warn("Event bus bridge already started");
    return;
  }
  isListening = true;

  // Mapping dari event bus ke WS channels
  const eventToChannel: Partial<Record<EventType, (data: any) => string>> = {
    [EVENTS.NOTIFICATION_NEW]: (data) => `user:${data.userId}`,
    [EVENTS.LOAN_CREATED]: (data) => `user:${data.userId}`,
    [EVENTS.LOAN_RETURNED]: (data) => `user:${data.userId}`,
    [EVENTS.LOAN_OVERDUE]: (data) => `user:${data.userId}`,
    [EVENTS.RESERVATION_READY]: (data) => `user:${data.userId}`,
    [EVENTS.ANNOUNCEMENT_NEW]: () => "global",
    [EVENTS.WISHLIST_AVAILABLE]: (data) => `user:${data.userId}`,
    [EVENTS.ROOM_BOOKED]: (data) => `room:${data.roomId}`,
    [EVENTS.VISITOR_CHECKIN]: () => "global",
    [EVENTS.POINTS_EARNED]: (data) => `user:${data.userId}`,
    [EVENTS.REDEMPTION_CREATED]: (data) => `user:${data.userId}`,
    [EVENTS.REDEMPTION_APPROVED]: (data) => `user:${data.userId}`,
    [EVENTS.REDEMPTION_DELIVERED]: (data) => `user:${data.userId}`,
    [EVENTS.REDEMPTION_REJECTED]: (data) => `user:${data.userId}`,
    [EVENTS.LEADERBOARD_UPDATED]: () => "global",
    [EVENTS.STREAK_BONUS]: (data) => `user:${data.userId}`,
  };

  // Listen to all events on the bus and forward
  for (const [eventKey, channelFn] of Object.entries(eventToChannel)) {
    if (!channelFn) continue;
    // We need to subscribe to broadcast events; eventBus.publish doesn't directly
    // support wildcards, so we hook into the publish call via the broadcast mechanism
  }

  // The cleaner approach: hook all API routes to call publishToWS directly.
  // This function is mainly for reference/documentation.
  logger.info("Event bus bridge initialized (manual publishToWS recommended)");
}

/**
 * Convenience: publish to a user's WS channel.
 */
export async function notifyUser(userId: string, eventType: string, data: any) {
  return publishToWS(`user:${userId}`, { event: eventType, data });
}

/**
 * Convenience: broadcast to all connected clients.
 */
export async function broadcastAll(eventType: string, data: any) {
  return publishToWS("global", { event: eventType, data }, { broadcast: true });
}

/**
 * Convenience: publish to a role's channel.
 */
export async function notifyRole(role: string, eventType: string, data: any) {
  return publishToWS(`role:${role}`, { event: eventType, data });
}
