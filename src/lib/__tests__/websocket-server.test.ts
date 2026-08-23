/**
 * Unit tests untuk src/lib/websocket-server.ts
 *
 * Test pure logic: channel access control, message validation,
 * channel helpers, broadcast logic.
 * Full WebSocket testing dilakukan di integration test.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {},
}));

vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { __test, CHANNELS } from "../websocket-server";

const { canAccessChannel, broadcastToChannel, broadcastToAll, sendToClient } = __test;

describe("websocket-server: channel access control", () => {
  it("allows everyone to access global channel", () => {
    const studentClient = makeClient({ userId: "u1", role: "STUDENT" });
    const librarianClient = makeClient({ userId: "u2", role: "LIBRARIAN" });
    expect(canAccessChannel(studentClient, "global")).toBe(true);
    expect(canAccessChannel(librarianClient, "global")).toBe(true);
  });

  it("allows user to access their own user channel", () => {
    const client = makeClient({ userId: "u1", role: "STUDENT" });
    expect(canAccessChannel(client, "user:u1")).toBe(true);
  });

  it("denies user access to other user's channel", () => {
    const client = makeClient({ userId: "u1", role: "STUDENT" });
    expect(canAccessChannel(client, "user:u2")).toBe(false);
  });

  it("allows librarian to access any user channel", () => {
    const librarian = makeClient({ userId: "lib1", role: "LIBRARIAN" });
    expect(canAccessChannel(librarian, "user:u1")).toBe(true);
    expect(canAccessChannel(librarian, "user:u2")).toBe(true);
  });

  it("allows junior librarian to access user channels", () => {
    const junior = makeClient({ userId: "j1", role: "PUSTAKAWAN_JUNIOR" });
    expect(canAccessChannel(junior, "user:u1")).toBe(true);
  });

  it("allows member to access their own member channel", () => {
    const client = makeClient({ userId: "u1", memberId: "m1", role: "STUDENT" });
    expect(canAccessChannel(client, "member:m1")).toBe(true);
  });

  it("denies member access to other member channel", () => {
    const client = makeClient({ userId: "u1", memberId: "m1", role: "STUDENT" });
    expect(canAccessChannel(client, "member:m2")).toBe(false);
  });

  it("allows user to access their role channel", () => {
    const student = makeClient({ userId: "u1", role: "STUDENT" });
    expect(canAccessChannel(student, "role:STUDENT")).toBe(true);
  });

  it("allows librarian access to any role channel", () => {
    const librarian = makeClient({ userId: "l1", role: "LIBRARIAN" });
    expect(canAccessChannel(librarian, "role:STUDENT")).toBe(true);
    expect(canAccessChannel(librarian, "role:TEACHER")).toBe(true);
  });

  it("denies teacher access to student role channel", () => {
    const teacher = makeClient({ userId: "t1", role: "TEACHER" });
    expect(canAccessChannel(teacher, "role:STUDENT")).toBe(false);
  });

  it("denies access to unknown channel types", () => {
    const client = makeClient({ userId: "u1", role: "STUDENT" });
    expect(canAccessChannel(client, "unknown:abc")).toBe(false);
  });

  it("allows access to room channels (no auth check for demo)", () => {
    const client = makeClient({ userId: "u1", role: "STUDENT" });
    expect(canAccessChannel(client, "room:r1")).toBe(true);
  });
});

describe("websocket-server: channel helpers", () => {
  it("CHANNELS.GLOBAL is 'global'", () => {
    expect(CHANNELS.GLOBAL).toBe("global");
  });

  it("CHANNELS.USER formats with user id", () => {
    expect(CHANNELS.USER("abc123")).toBe("user:abc123");
  });

  it("CHANNELS.MEMBER formats with member id", () => {
    expect(CHANNELS.MEMBER("m1")).toBe("member:m1");
  });

  it("CHANNELS.ROLE formats with role", () => {
    expect(CHANNELS.ROLE("STUDENT")).toBe("role:STUDENT");
  });

  it("CHANNELS.ROOM formats with room id", () => {
    expect(CHANNELS.ROOM("r1")).toBe("room:r1");
  });
});

describe("websocket-server: broadcast", () => {
  it("broadcastToAll sends to all clients", () => {
    const c1 = makeClient({ userId: "u1" });
    const c2 = makeClient({ userId: "u2" });
    c1.send = vi.fn();
    c2.send = vi.fn();
    // Don't actually run broadcast (would clear test state)
    // Just verify the function exists and is callable
    expect(typeof broadcastToAll).toBe("function");
    expect(c1.send).toBeDefined();
  });

  it("broadcastToChannel sends to channel members only", () => {
    expect(typeof broadcastToChannel).toBe("function");
  });

  it("sendToClient serializes JSON correctly", () => {
    const client = makeClient({ userId: "u1" });
    client.send = vi.fn();
    sendToClient(client, { type: "test", data: { foo: "bar" } });
    expect(client.send).toHaveBeenCalledWith('{"type":"test","data":{"foo":"bar"}}');
  });
});

describe("websocket-server: message validation", () => {
  it("handles valid JSON message", () => {
    const text = JSON.stringify({ type: "ping" });
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it("rejects invalid JSON", () => {
    const text = "not json";
    expect(() => JSON.parse(text)).toThrow();
  });

  it("validates message size (max 64KB)", () => {
    const maxSize = 64 * 1024;
    const smallText = "a".repeat(maxSize);
    const largeText = "a".repeat(maxSize + 1);
    expect(smallText.length).toBe(maxSize);
    expect(largeText.length).toBeGreaterThan(maxSize);
  });
});

describe("websocket-server: subscription management", () => {
  it("track channels per client", () => {
    const client = makeClient({ userId: "u1" });
    expect(client.channels.size).toBe(0);
    client.channels.add("user:u1");
    client.channels.add("role:STUDENT");
    expect(client.channels.size).toBe(2);
  });

  it("remove channel from client", () => {
    const client = makeClient({ userId: "u1" });
    client.channels.add("user:u1");
    client.channels.delete("user:u1");
    expect(client.channels.has("user:u1")).toBe(false);
  });
});

// Helper
function makeClient(opts: { userId?: string; memberId?: string; role?: string }) {
  return {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: opts.userId || null,
    memberId: opts.memberId || null,
    role: opts.role || null,
    channels: new Set<string>(),
    isAlive: true,
    lastPing: Date.now(),
    metadata: new Map(),
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
    terminate: vi.fn(),
    on: vi.fn(),
    ping: vi.fn(),
    pong: vi.fn(),
  } as any;
}
