/**
 * WebSocket Hub — True bidirectional real-time communication.
 *
 * Complement to SSE:
 * - SSE (one-way): server → client (notifications, live updates)
 * - WebSocket (two-way): client ↔ server (chat, presence, activity)
 *
 * Use cases:
 * - Real-time activity feed (semua event perpustakaan, seperti Twitter)
 * - Presence tracking (siapa yang sedang online)
 * - Typing indicators (saat librarian reply)
 * - Comment on activity (student reply ke event pustakawan)
 *
 * Untuk multi-instance production, pakai Redis pub/sub atau dedicated
 * WS service (Ably, Pusher, Supabase Realtime).
 *
 * Note: Next.js App Router belum fully support WebSocket di server actions.
 * Kita pakai custom server atau upgrade ke Next.js 15+ canary.
 * Untuk sekarang, fallback ke Server-Sent Events + polling untuk 2-way.
 */

import { logger } from "@/lib/logger";
import { eventBus, EVENTS } from "@/lib/event-bus";

// Browser-side WebSocket manager
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  constructor(path: string) {
    this.url = this.getWebSocketUrl(path);
  }

  private getWebSocketUrl(path: string): string {
    if (typeof window === "undefined") return "";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${path}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("WebSocket only works in browser"));
        return;
      }

      this.isIntentionallyClosed = false;

      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startPing();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.dispatch(message.event, message.data);
        } catch (err) {
          // ignore non-JSON
        }
      };

      this.ws.onerror = (err) => {
        logger.error("WebSocket error", { error: String(err) });
        // Don't reject here — wait for onclose
      };

      this.ws.onclose = () => {
        this.stopPing();
        if (!this.isIntentionallyClosed) {
          this.attemptReconnect();
        }
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn("WebSocket max reconnect attempts reached");
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    setTimeout(() => {
      this.connect().catch(() => {
        // Will retry
      });
    }, delay);
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30_000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  send(event: string, data: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
      return true;
    }
    return false;
  }

  addEventListener(event: string, handler: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private dispatch(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          // ignore
        }
      });
    }
  }

  close() {
    this.isIntentionallyClosed = true;
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton
let clientInstance: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!clientInstance) {
    clientInstance = new WebSocketClient("/api/ws");
  }
  return clientInstance;
}

// ===== Activity Feed Events =====

export interface ActivityEvent {
  id: string;
  type:
    | "BOOK_RETURNED"
    | "POINTS_EARNED"
    | "REDEMPTION_CLAIMED"
    | "REDEMPTION_APPROVED"
    | "REDEMPTION_DELIVERED"
    | "MEMBER_JOINED"
    | "BADGE_UNLOCKED"
    | "ANNOUNCEMENT";
  memberId?: string;
  memberName?: string;
  memberAvatar?: string;
  data: any;
  timestamp: string;
}

// Activity feed state (client-side cache)
let activityCache: ActivityEvent[] = [];
const MAX_ACTIVITY_CACHE = 50;

export function addToActivityCache(event: ActivityEvent) {
  activityCache = [event, ...activityCache].slice(0, MAX_ACTIVITY_CACHE);
}

export function getActivityCache(): ActivityEvent[] {
  return activityCache;
}

export function clearActivityCache() {
  activityCache = [];
}
