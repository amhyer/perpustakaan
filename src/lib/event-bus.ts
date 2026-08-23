/**
 * Server-side event bus.
 *
 * Lightweight in-process pub/sub untuk real-time features.
 * - SSE endpoint subscribe ke bus
 * - API routes publish events
 * - Multiple clients per user (different tabs)
 *
 * Untuk multi-instance production, ganti dengan Redis pub/sub atau
 *专门的 service seperti Ably / Pusher / Supabase Realtime.
 */

type EventHandler = (data: any) => void;

interface Subscription {
  id: string;
  userId: string;
  handler: EventHandler;
}

class EventBus {
  private subscriptions = new Map<string, Subscription>();
  private eventLog: { event: string; data: any; timestamp: Date }[] = [];
  private maxLogSize = 100; // Untuk debugging

  /**
   * Subscribe to events for a specific user.
   * Returns subscription ID untuk cleanup.
   */
  subscribe(userId: string, handler: EventHandler): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.subscriptions.set(id, { id, userId, handler });
    return id;
  }

  /**
   * Unsubscribe.
   */
  unsubscribe(id: string): void {
    this.subscriptions.delete(id);
  }

  /**
   * Publish event ke semua subscribers untuk user tertentu.
   */
  publish(userId: string, event: string, data: any): void {
    const logEntry = { event, data, timestamp: new Date() };
    this.eventLog.push(logEntry);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    for (const sub of this.subscriptions.values()) {
      if (sub.userId === userId) {
        try {
          sub.handler({ event, data, timestamp: logEntry.timestamp });
        } catch (err) {
          console.error("[EventBus] Subscriber error:", err);
        }
      }
    }
  }

  /**
   * Broadcast ke semua user (untuk announcements, dll)
   */
  broadcast(event: string, data: any): void {
    const logEntry = { event, data, timestamp: new Date() };
    this.eventLog.push(logEntry);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    for (const sub of this.subscriptions.values()) {
      try {
        sub.handler({ event, data, timestamp: logEntry.timestamp });
      } catch (err) {
        console.error("[EventBus] Broadcast subscriber error:", err);
      }
    }
  }

  /**
   * Stats untuk monitoring.
   */
  stats() {
    return {
      activeSubscriptions: this.subscriptions.size,
      recentEvents: this.eventLog.slice(-10),
    };
  }

  /**
   * Get active subscriptions count untuk user tertentu.
   */
  countForUser(userId: string): number {
    let count = 0;
    for (const sub of this.subscriptions.values()) {
      if (sub.userId === userId) count++;
    }
    return count;
  }
}

// Global singleton
const globalForBus = globalThis as unknown as { __eventBus: EventBus | undefined };
export const eventBus = globalForBus.__eventBus ?? new EventBus();
if (process.env.NODE_ENV !== "production") globalForBus.__eventBus = eventBus;

// ============================================================
// Event type constants
// ============================================================
export const EVENTS = {
  NOTIFICATION_NEW: "notification:new",
  LOAN_CREATED: "loan:created",
  LOAN_RETURNED: "loan:returned",
  LOAN_OVERDUE: "loan:overdue",
  RESERVATION_READY: "reservation:ready",
  ANNOUNCEMENT_NEW: "announcement:new",
  WISHLIST_AVAILABLE: "wishlist:available",
  ROOM_BOOKED: "room:booked",
  VISITOR_CHECKIN: "visitor:checkin",
  // Sync events
  DATA_CHANGED: "data:changed",
  // Reward System events
  POINTS_EARNED: "reward:points-earned",
  REDEMPTION_CREATED: "reward:claim-pending",
  REDEMPTION_APPROVED: "reward:claim-approved",
  REDEMPTION_DELIVERED: "reward:claim-delivered",
  REDEMPTION_REJECTED: "reward:claim-rejected",
  LEADERBOARD_UPDATED: "reward:leaderboard-updated",
  STREAK_BONUS: "reward:streak-bonus",
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
