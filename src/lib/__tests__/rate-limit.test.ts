/**
 * Unit tests untuk src/lib/rate-limit.ts
 * Test: sliding window, expired reset, getClientIdentifier, presets
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  rateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "../rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("mengizinkan request dalam limit", () => {
    const r = rateLimit({ key: "test-1", limit: 3, windowMs: 60_000 });
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(2);
    expect(r.retryAfter).toBe(0);
  });

  it("menolak request setelah mencapai limit", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: "test-2", limit: 3, windowMs: 60_000 });
    }
    const r = rateLimit({ key: "test-2", limit: 3, windowMs: 60_000 });
    expect(r.success).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it("reset counter setelah windowMs kadaluwarsa", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: "test-3", limit: 3, windowMs: 1000 });
    }
    vi.advanceTimersByTime(1100);
    const r = rateLimit({ key: "test-3", limit: 3, windowMs: 1000 });
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("key berbeda independen", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: "key-A", limit: 3, windowMs: 60_000 });
    }
    // key-B tidak terpengaruh
    const r = rateLimit({ key: "key-B", limit: 3, windowMs: 60_000 });
    expect(r.success).toBe(true);
  });

  it("reset timestamp benar", () => {
    const now = Date.now();
    const r = rateLimit({ key: "test-4", limit: 5, windowMs: 30_000 });
    // reset harus sekitar now + 30_000
    expect(r.reset).toBeGreaterThanOrEqual(now);
    expect(r.reset).toBeLessThanOrEqual(now + 30_000);
  });

  it("cleanup otomatis entry kadaluwarsa", () => {
    rateLimit({ key: "test-5", limit: 3, windowMs: 1000 });
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // lebih dari CLEANUP_INTERVAL_MS
    // next call harusnya masih jalan tanpa crash
    const r = rateLimit({ key: "test-5", limit: 3, windowMs: 1000 });
    expect(r.success).toBe(true);
  });
});

describe("getClientIdentifier", () => {
  it("mengambil IP dari X-Forwarded-For", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIdentifier(req)).toBe("192.168.1.1");
  });

  it("fallback ke X-Real-IP jika tidak ada forwarded", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "10.0.0.5" },
    });
    expect(getClientIdentifier(req)).toBe("10.0.0.5");
  });

  it("return 'unknown' jika tidak ada IP header", () => {
    const req = new Request("http://localhost");
    expect(getClientIdentifier(req)).toBe("unknown");
  });

  it("trim whitespace dari IP", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  192.168.1.1  , 10.0.0.1" },
    });
    expect(getClientIdentifier(req)).toBe("192.168.1.1");
  });
});

describe("rateLimitResponse", () => {
  it("return response 429 dengan header yang benar", () => {
    const res = rateLimitResponse({ success: false, remaining: 0, reset: Date.now() + 5000, retryAfter: 5 });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("body berisi error message", async () => {
    const res = rateLimitResponse(
      { success: false, remaining: 0, reset: Date.now() + 5000, retryAfter: 5 },
      "Custom error"
    );
    const body = await res.json();
    expect(body.error).toBe("Custom error");
    expect(body.retryAfter).toBe(5);
  });
});

describe("RATE_LIMITS presets", () => {
  it("semua preset punya limit dan windowMs yang valid", () => {
    for (const [name, preset] of Object.entries(RATE_LIMITS)) {
      expect(preset.limit, `${name}.limit`).toBeGreaterThan(0);
      expect(preset.windowMs, `${name}.windowMs`).toBeGreaterThan(0);
    }
  });

  it("LOGIN limit reasonable (5/menit)", () => {
    expect(RATE_LIMITS.LOGIN.limit).toBe(5);
    expect(RATE_LIMITS.LOGIN.windowMs).toBe(60_000);
  });

  it("FORGOT_PASSWORD lebih ketat dari LOGIN", () => {
    // max attempt forgot password harus <= login
    expect(RATE_LIMITS.FORGOT_PASSWORD.limit).toBeLessThanOrEqual(RATE_LIMITS.LOGIN.limit);
  });
});
