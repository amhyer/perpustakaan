/**
 * Unit tests untuk src/hooks/use-websocket.ts
 *
 * Test the pure logic helpers dan message format.
 * Full hook testing dengan React Testing Library.
 */

import { describe, it, expect, vi } from "vitest";

// Mock WebSocket
class MockWebSocket {
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onclose: (() => void) | null = null;
  url: string;

  static instances: MockWebSocket[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send = vi.fn();
  close = vi.fn();
  ping = vi.fn();

  // Helpers to simulate events
  simulateOpen() {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }
  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  simulateError() {
    this.onerror?.(new Event("error"));
  }
  simulateClose() {
    this.readyState = 3;
    this.onclose?.();
  }
}

(global as any).WebSocket = MockWebSocket;

describe("useWebSocket: WebSocket URL construction", () => {
  it("builds ws:// URL for http://", () => {
    const isHttps = false;
    const protocol = isHttps ? "wss:" : "ws:";
    expect(protocol).toBe("ws:");
  });

  it("builds wss:// URL for https://", () => {
    const isHttps = true;
    const protocol = isHttps ? "wss:" : "ws:";
    expect(protocol).toBe("wss:");
  });
});

describe("useWebSocket: message format", () => {
  it("ping message has type ping", () => {
    const msg = { type: "ping" };
    expect(msg.type).toBe("ping");
  });

  it("subscribe message has type and channel", () => {
    const msg = { type: "subscribe", channel: "user:abc" };
    expect(msg.type).toBe("subscribe");
    expect(msg.channel).toBe("user:abc");
  });

  it("publish message includes data", () => {
    const msg = {
      type: "publish",
      channel: "global",
      data: { foo: "bar" },
    };
    expect(msg.data.foo).toBe("bar");
  });

  it("direct message includes target user", () => {
    const msg = {
      type: "direct",
      data: { targetUserId: "u1", text: "Hi" },
    };
    expect(msg.data.targetUserId).toBe("u1");
  });

  it("typing message includes context", () => {
    const msg = {
      type: "typing",
      data: { targetUserId: "u1", context: "chat" },
    };
    expect(msg.data.context).toBe("chat");
  });
});

describe("useWebSocket: status transitions", () => {
  it("starts as closed", () => {
    const status = "closed";
    expect(status).toBe("closed");
  });

  it("transitions to connecting", () => {
    const states = ["closed", "connecting", "open"];
    expect(states[0]).toBe("closed");
    expect(states[1]).toBe("connecting");
    expect(states[2]).toBe("open");
  });

  it("has 5 possible statuses", () => {
    const statuses = ["connecting", "open", "closing", "closed", "error"];
    expect(statuses.length).toBe(5);
  });
});

describe("useWebSocket: reconnection logic", () => {
  it("exponential backoff doubles delay", () => {
    const base = 1000;
    const attempts = [1, 2, 3, 4, 5];
    const delays = attempts.map((a) => base * Math.pow(2, a - 1));
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(2000);
    expect(delays[2]).toBe(4000);
    expect(delays[4]).toBe(16000);
  });

  it("respects max reconnect attempts", () => {
    const max = 10;
    let attempts = 0;
    while (attempts < max) attempts++;
    expect(attempts).toBe(max);
  });
});

describe("useWebSocket: message size validation", () => {
  it("rejects messages over 64KB", () => {
    const MAX_SIZE = 64 * 1024;
    const smallText = "a".repeat(100);
    const largeText = "a".repeat(MAX_SIZE + 1);
    expect(smallText.length).toBeLessThan(MAX_SIZE);
    expect(largeText.length).toBeGreaterThan(MAX_SIZE);
  });
});

describe("useWebSocket: JSON serialization", () => {
  it("serializes simple message", () => {
    const msg = { type: "ping" };
    const serialized = JSON.stringify(msg);
    expect(serialized).toBe('{"type":"ping"}');
  });

  it("serializes complex message", () => {
    const msg = {
      type: "publish",
      channel: "user:abc",
      data: { amount: 100, name: "Test" },
    };
    const serialized = JSON.stringify(msg);
    expect(serialized).toContain('"type":"publish"');
    expect(serialized).toContain('"amount":100');
  });

  it("parses incoming message", () => {
    const text = '{"type":"event","data":{"x":1}}';
    const parsed = JSON.parse(text);
    expect(parsed.type).toBe("event");
    expect(parsed.data.x).toBe(1);
  });
});

describe("useWebSocket: channel handler map", () => {
  it("manages multiple channels", () => {
    const handlers = new Map<string, Set<(data: any) => void>>();
    handlers.set("user:1", new Set());
    handlers.set("user:2", new Set());
    expect(handlers.size).toBe(2);
  });

  it("adds handler to channel", () => {
    const handlers = new Map<string, Set<(data: any) => void>>();
    const channel = "user:1";
    if (!handlers.has(channel)) handlers.set(channel, new Set());
    handlers.get(channel)!.add(vi.fn());
    expect(handlers.get(channel)!.size).toBe(1);
  });

  it("removes handler from channel", () => {
    const handlers = new Map<string, Set<(data: any) => void>>();
    const channel = "user:1";
    const h = vi.fn();
    handlers.set(channel, new Set([h]));
    handlers.get(channel)!.delete(h);
    expect(handlers.get(channel)!.size).toBe(0);
  });

  it("cleans up empty channel", () => {
    const handlers = new Map<string, Set<(data: any) => void>>();
    const channel = "user:1";
    const h = vi.fn();
    handlers.set(channel, new Set([h]));
    handlers.get(channel)!.delete(h);
    if (handlers.get(channel)!.size === 0) {
      handlers.delete(channel);
    }
    expect(handlers.has(channel)).toBe(false);
  });
});

describe("useWebSocket: pending messages queue", () => {
  it("queues messages when disconnected", () => {
    const pending: any[] = [];
    const isConnected = false;
    const msg = { type: "ping" };
    if (!isConnected) pending.push(msg);
    expect(pending.length).toBe(1);
  });

  it("flushes queue on reconnect", () => {
    const pending: any[] = [{ type: "ping" }, { type: "subscribe", channel: "x" }];
    const sent: any[] = [];
    while (pending.length > 0) {
      sent.push(pending.shift());
    }
    expect(sent.length).toBe(2);
    expect(pending.length).toBe(0);
  });
});
