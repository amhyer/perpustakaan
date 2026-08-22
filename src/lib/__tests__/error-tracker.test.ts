/**
 * Unit tests untuk src/lib/error-tracker.ts
 * Test: logError (mocked DB), withErrorTracking wrapper
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  db: {
    errorLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
  },
}));

import { db } from "../db";
import { logError, withErrorTracking } from "../error-tracker";

describe("logError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("log error object", async () => {
    const err = new Error("Test error");
    await logError(err, { level: "ERROR" });
    expect(db.errorLog.create).toHaveBeenCalledTimes(1);
    const data = (db.errorLog.create as any).mock.calls[0][0].data;
    expect(data.message).toBe("Test error");
    expect(data.level).toBe("ERROR");
  });

  it("log string error", async () => {
    await logError("Plain string error");
    const data = (db.errorLog.create as any).mock.calls[0][0].data;
    expect(data.message).toBe("Plain string error");
  });

  it("default level = ERROR", async () => {
    await logError(new Error("x"));
    const data = (db.errorLog.create as any).mock.calls[0][0].data;
    expect(data.level).toBe("ERROR");
  });

  it("truncate message > 500 char", async () => {
    const longMsg = "x".repeat(1000);
    await logError(new Error(longMsg));
    const data = (db.errorLog.create as any).mock.calls[0][0].data;
    expect(data.message.length).toBeLessThanOrEqual(500);
  });

  it("truncate stack > 2000 char", async () => {
    const err = new Error("x");
    err.stack = "y".repeat(5000);
    await logError(err);
    const data = (db.errorLog.create as any).mock.calls[0][0].data;
    expect(data.stack.length).toBeLessThanOrEqual(2000);
  });

  it("serialize context ke JSON string", async () => {
    await logError(new Error("x"), {
      context: { userId: "u1", url: "https://x.com" },
    });
    const data = (db.errorLog.create as any).mock.calls[0][0].data;
    expect(data.context).toBe(JSON.stringify({ userId: "u1", url: "https://x.com" }));
  });

  it("null context → null", async () => {
    await logError(new Error("x"));
    const data = (db.errorLog.create as any).mock.calls[0][0].data;
    expect(data.context).toBeNull();
  });

  it("tidak throw saat DB error (silent fail)", async () => {
    (db.errorLog.create as any).mockRejectedValueOnce(new Error("DB down"));
    await expect(logError(new Error("x"))).resolves.toBeUndefined();
  });
});

describe("withErrorTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("return response handler jika success", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    const wrapped = withErrorTracking(handler);
    const req = new Request("http://x.com");
    const res = await wrapped(req, {} as any);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it("catch error dan return 500", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Handler boom"));
    const wrapped = withErrorTracking(handler);
    const req = new Request("http://x.com/api/test");
    const res = await wrapped(req, {} as any);
    expect(res.status).toBe(500);
    expect(db.errorLog.create).toHaveBeenCalled();
  });

  it("error response berisi pesan generik", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Sensitive info"));
    const wrapped = withErrorTracking(handler);
    const res = await wrapped(new Request("http://x.com"), {} as any);
    const body = await res.json();
    expect(body.error).toContain("Terjadi kesalahan");
    expect(body.error).not.toContain("Sensitive info"); // tidak bocorkan
  });

  it("log error dengan URL dan method context", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("x"));
    const wrapped = withErrorTracking(handler);
    await wrapped(new Request("http://x.com/api/foo"), {} as any);
    const data = (db.errorLog.create as any).mock.calls[0][0].data;
    expect(data.url).toBe("http://x.com/api/foo");
    expect(data.method).toBe("GET");
  });
});
