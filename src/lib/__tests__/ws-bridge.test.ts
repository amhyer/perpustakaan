/**
 * Unit tests untuk src/lib/ws-bridge.ts
 *
 * Test the publishToWS function dan event mapping logic.
 * Mock fetch untuk avoid actual HTTP calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Set env var BEFORE module import (Vitest hoists imports)
vi.hoisted(() => {
  process.env.WS_WEBHOOK_SECRET = "test-secret";
});

vi.mock("../db", () => ({ db: {} }));
vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { publishToWS, notifyUser, broadcastAll, notifyRole, startEventBusBridge } from "../ws-bridge";

describe("ws-bridge: publishToWS", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns false when WS server not available", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await publishToWS("user:abc", { type: "test" });
    expect(result).toBe(false);
  });

  it("returns true on successful publish", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, clients: 5 }),
    });
    const result = await publishToWS("user:abc", { type: "test" });
    expect(result).toBe(true);
  });

  it("returns false when WS server returns error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal error",
    });
    const result = await publishToWS("user:abc", { type: "test" });
    expect(result).toBe(false);
  });

  it("uses default WS port 3003 when env not set", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    await publishToWS("global", { type: "test" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("localhost:3003"),
      expect.any(Object)
    );
  });

  it("sends authorization header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    await publishToWS("global", { type: "test" });
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers.Authorization).toMatch(/^Bearer /);
  });

  it("includes broadcast flag in body when set", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    await publishToWS("global", { type: "test" }, { broadcast: true });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.broadcast).toBe(true);
  });

  it("skipFetch option returns false immediately", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    const result = await publishToWS("global", { type: "test" }, { skipFetch: true });
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("ws-bridge: convenience functions", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("notifyUser publishes to user channel", async () => {
    await notifyUser("user-1", "test:event", { foo: "bar" });
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.channel).toBe("user:user-1");
    expect(body.data.event).toBe("test:event");
    expect(body.data.data.foo).toBe("bar");
  });

  it("broadcastAll uses global channel with broadcast flag", async () => {
    await broadcastAll("announcement:new", { title: "Test" });
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.channel).toBe("global");
    expect(body.broadcast).toBe(true);
    expect(body.data.event).toBe("announcement:new");
  });

  it("notifyRole publishes to role channel", async () => {
    await notifyRole("STUDENT", "loan:overdue", { memberId: "m1" });
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.channel).toBe("role:STUDENT");
    expect(body.data.event).toBe("loan:overdue");
  });
});

describe("ws-bridge: startEventBusBridge", () => {
  it("initializes without errors", () => {
    expect(() => startEventBusBridge()).not.toThrow();
  });

  it("does not initialize twice", () => {
    startEventBusBridge();
    // Second call should be no-op (no error)
    expect(() => startEventBusBridge()).not.toThrow();
  });
});
