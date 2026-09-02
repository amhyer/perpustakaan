"use client";

/**
 * useWebSocket — React hook untuk WebSocket connection.
 *
 * Features:
 * - Auto-connect on mount
 * - Auto-reconnect dengan exponential backoff
 * - Subscribe/unsubscribe channels
 * - Listen to specific event types
 * - Send messages ke server
 * - Track connection status
 * - Heartbeat ping
 *
 * Example:
 *   const { status, subscribe, send } = useWebSocket({
 *     onEvent: (e) => console.log(e),
 *   });
 *
 *   useEffect(() => {
 *     const unsub = subscribe("user:123", (data) => {
 *       console.log("Got data on user:123", data);
 *     });
 *     return unsub;
 *   }, []);
 */

import { useEffect, useRef, useState, useCallback } from "react";

export type WSStatus = "connecting" | "open" | "closing" | "closed" | "error";

export interface WSMessage<T = any> {
  type: string;
  id?: string;
  channel?: string;
  data?: T;
  timestamp?: string;
}

export interface UseWebSocketOptions {
  /** WebSocket URL (default: ws(s)://host/api/ws) */
  url?: string;
  /** Called for every incoming event */
  onEvent?: (msg: WSMessage) => void;
  /** Called for specific event types */
  handlers?: Record<string, (msg: WSMessage) => void>;
  /** Auto-reconnect on disconnect (default: true) */
  reconnect?: boolean;
  /** Reconnect delay base (ms, default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-ping interval (ms, default: 25000) */
  pingInterval?: number;
}

interface UseWebSocketReturn {
  status: WSStatus;
  isConnected: boolean;
  subscribe: (channel: string, handler: (data: any) => void) => () => void;
  unsubscribe: (channel: string) => void;
  send: (msg: any) => boolean;
  publish: (channel: string, data: any) => boolean;
  reconnectNow: () => void;
  disconnect: () => void;
  lastError: string | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url,
    reconnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 10,
    debug = false,
    pingInterval = 25_000,
    onEvent,
    handlers,
  } = options;

  const [status, setStatus] = useState<WSStatus>("closed");
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);
  const channelHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const pendingMessagesRef = useRef<any[]>([]);

  const getUrl = useCallback((): string => {
    if (url) return url;
    if (typeof window === "undefined") return "";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Default to standalone WS server on port 3003
    const port = process.env.NEXT_PUBLIC_WS_PORT || "3003";
    const isDefaultPort =
      (window.location.protocol === "https:" && window.location.port === "443") ||
      (window.location.protocol === "http:" && window.location.port === "80") ||
      (window.location.protocol === "http:" && window.location.port === "3001");
    const host = isDefaultPort ? window.location.hostname : window.location.host;
    return `${protocol}//${host}:${port}/`;
  }, [url]);

  const log = useCallback(
    (...args: any[]) => {
      if (debug) console.log("[useWebSocket]", ...args);
    },
    [debug]
  );

  // Connect
  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    const wsUrl = getUrl();
    if (!wsUrl) return;

    intentionalCloseRef.current = false;
    setStatus("connecting");
    setLastError(null);

    try {
      wsRef.current = new WebSocket(wsUrl);
    } catch (err) {
      setLastError(String(err));
      setStatus("error");
      scheduleReconnect();
      return;
    }

    wsRef.current.onopen = () => {
      log("Connected");
      setStatus("open");
      setLastError(null);
      reconnectAttemptsRef.current = 0;

      // Re-subscribe to all channels
      for (const channel of channelHandlersRef.current.keys()) {
        sendRaw({ type: "subscribe", channel });
      }

      // Send any pending messages
      while (pendingMessagesRef.current.length > 0) {
        const msg = pendingMessagesRef.current.shift();
        sendRaw(msg);
      }

      // Start ping
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        sendRaw({ type: "ping" });
      }, pingInterval);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        log("Message:", msg);

        // Dispatch to global handler
        onEvent?.(msg);

        // Dispatch to type-specific handlers
        if (msg.type && handlers?.[msg.type]) {
          handlers[msg.type](msg);
        }

        // Dispatch to channel-specific handlers
        if (msg.channel) {
          const channelHandlers = channelHandlersRef.current.get(msg.channel);
          if (channelHandlers && msg.data !== undefined) {
            channelHandlers.forEach((h) => {
              try {
                h(msg.data);
              } catch (err) {
                console.error("Channel handler error:", err);
              }
            });
          }
        }
      } catch (err) {
        log("Failed to parse message:", err);
      }
    };

    wsRef.current.onerror = (event) => {
      log("Error:", event);
      setLastError("WebSocket error");
      setStatus("error");
    };

    wsRef.current.onclose = () => {
      log("Closed");
      setStatus("closed");
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      if (!intentionalCloseRef.current) {
        scheduleReconnect();
      }
    };
  }, [getUrl, log, onEvent, handlers, pingInterval]);

  const scheduleReconnect = useCallback(() => {
    if (!reconnect) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      log("Max reconnect attempts reached");
      return;
    }
    reconnectAttemptsRef.current++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
    log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [reconnect, reconnectDelay, maxReconnectAttempts, connect, log]);

  const sendRaw = useCallback((msg: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
        return true;
      } catch (err) {
        console.error("WS send error:", err);
        return false;
      }
    }
    // Queue for when connection opens
    pendingMessagesRef.current.push(msg);
    return false;
  }, []);

  const send = useCallback(
    (msg: any): boolean => {
      return sendRaw(msg);
    },
    [sendRaw]
  );

  const subscribe = useCallback(
    (channel: string, handler: (data: any) => void): (() => void) => {
      if (!channelHandlersRef.current.has(channel)) {
        channelHandlersRef.current.set(channel, new Set());
      }
      channelHandlersRef.current.get(channel)!.add(handler);

      // Send subscribe message if connected
      sendRaw({ type: "subscribe", channel });

      // Return unsubscribe function
      return () => {
        const handlers = channelHandlersRef.current.get(channel);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            channelHandlersRef.current.delete(channel);
            sendRaw({ type: "unsubscribe", channel });
          }
        }
      };
    },
    [sendRaw]
  );

  const unsubscribe = useCallback(
    (channel: string) => {
      channelHandlersRef.current.delete(channel);
      sendRaw({ type: "unsubscribe", channel });
    },
    [sendRaw]
  );

  const publish = useCallback(
    (channel: string, data: any): boolean => {
      return sendRaw({ type: "publish", channel, data });
    },
    [sendRaw]
  );

  const reconnectNow = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        console.error("Failed to close WebSocket on reconnect:", e);
      }
    }
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (wsRef.current) {
      setStatus("closing");
      try {
        wsRef.current.close();
      } catch (e) {
        console.error("Failed to close WebSocket on disconnect:", e);
      }
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    isConnected: status === "open",
    subscribe,
    unsubscribe,
    send,
    publish,
    reconnectNow,
    disconnect,
    lastError,
  };
}

/**
 * useWebSocketEvent — Subscribe ke specific event type.
 * Convenience wrapper around useWebSocket.
 */
export function useWebSocketEvent(
  eventType: string,
  handler: (data: any) => void,
  options: UseWebSocketOptions = {}
) {
  const ws = useWebSocket({
    ...options,
    handlers: {
      [eventType]: (msg) => handler(msg.data),
    },
  });
  return ws;
}
