"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface StreamEvent<T = any> {
  event: string;
  data: T;
  timestamp: string;
}

interface UseEventStreamOptions {
  /** Event types to listen to. Default: all */
  events?: string[];
  /** Called for every event */
  onEvent?: (e: StreamEvent) => void;
  /** Called for specific event type */
  handlers?: Record<string, (data: any) => void>;
  /** Auto reconnect on disconnect */
  reconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Enable toasts for important events */
  toastOnEvents?: string[];
}

/**
 * useEventStream — subscribe to Server-Sent Events.
 *
 * Example:
 *   useEventStream({
 *     handlers: {
 *       "notification:new": (data) => {
 *         toast.info(data.title);
 *       },
 *     },
 *   });
 */
export function useEventStream(options: UseEventStreamOptions = {}) {
  const {
    events,
    onEvent,
    handlers,
    reconnect = true,
    reconnectDelay = 3000,
    toastOnEvents = [],
  } = options;

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handlersRef = useRef(handlers);
  const toastOnRef = useRef(toastOnEvents);

  // Update refs
  useEffect(() => {
    handlersRef.current = handlers;
    toastOnRef.current = toastOnEvents;
  }, [handlers, toastOnEvents]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    // Cleanup existing
    if (sourceRef.current) {
      sourceRef.current.close();
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    const source = new EventSource("/api/events/stream");
    sourceRef.current = source;

    source.addEventListener("connected", () => {
      console.log("[SSE] Connected");
    });

    // Listen to specific events
    const eventsToListen = events || [
      "notification:new",
      "loan:created",
      "loan:returned",
      "loan:overdue",
      "reservation:ready",
      "announcement:new",
      "wishlist:available",
      "room:booked",
      "visitor:checkin",
      "data:changed",
    ];

    for (const event of eventsToListen) {
      source.addEventListener(event, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const eventObj: StreamEvent = { event, data, timestamp: new Date().toISOString() };

          // Call general handler
          onEvent?.(eventObj);

          // Call specific handler
          handlersRef.current?.[event]?.(data);

          // Auto-toast untuk important events
          if (toastOnRef.current.includes(event) && data.title) {
            toast(data.title, { description: data.message });
          }
        } catch (err) {
          console.error(`[SSE] Failed to parse ${event}:`, err);
        }
      });
    }

    source.onerror = () => {
      console.warn("[SSE] Connection error");
      source.close();
      sourceRef.current = null;

      if (reconnect) {
        reconnectTimerRef.current = setTimeout(() => {
          console.log("[SSE] Reconnecting...");
          connect();
        }, reconnectDelay);
      }
    };
  }, [events, onEvent, reconnect, reconnectDelay]);

  useEffect(() => {
    connect();
    return () => {
      if (sourceRef.current) {
        sourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  return {
    close: () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    },
  };
}
