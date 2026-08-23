/**
 * Unit tests untuk performance monitor.
 *
 * Sprint H - Production Readiness.
 */

import { describe, it, expect, beforeEach } from "vitest";

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  recordRequest,
  getRouteMetrics,
  getAllRouteMetrics,
  getSystemMetrics,
  resetMetrics,
} from "../performance-monitor";

describe("performance-monitor: recordRequest", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("records basic request", () => {
    recordRequest("/api/books", "GET", 100);
    const m = getRouteMetrics("/api/books");
    expect(m).not.toBeNull();
    expect(m!.requestCount).toBe(1);
    expect(m!.totalDurationMs).toBe(100);
    expect(m!.minDurationMs).toBe(100);
    expect(m!.maxDurationMs).toBe(100);
  });

  it("increments request count", () => {
    recordRequest("/api/books", "GET", 100);
    recordRequest("/api/books", "GET", 200);
    recordRequest("/api/books", "GET", 300);
    const m = getRouteMetrics("/api/books");
    expect(m!.requestCount).toBe(3);
    expect(m!.totalDurationMs).toBe(600);
    expect(m!.avgDurationMs).toBe(200);
  });

  it("calculates percentiles", () => {
    for (let i = 1; i <= 100; i++) {
      recordRequest("/api/test", "GET", i);
    }
    const m = getRouteMetrics("/api/test");
    expect(m!.p50DurationMs).toBeGreaterThanOrEqual(50);
    expect(m!.p50DurationMs).toBeLessThanOrEqual(51);
    expect(m!.p95DurationMs).toBeGreaterThanOrEqual(95);
    expect(m!.p99DurationMs).toBeGreaterThanOrEqual(99);
  });

  it("tracks errors separately", () => {
    recordRequest("/api/error", "POST", 100, false);
    recordRequest("/api/error", "POST", 200, true); // error
    recordRequest("/api/error", "POST", 50, true); // error
    const m = getRouteMetrics("/api/error", "POST");
    expect(m!.errorCount).toBe(2);
    expect(m!.errorRate).toBeCloseTo(0.666, 2);
  });

  it("normalizes routes with cuids (long hex)", () => {
    recordRequest("/api/books/abc123def4567890abcdef1234567890", "GET", 100);
    recordRequest("/api/books/abc123def4567890abcdef1234567891", "GET", 200);
    const m = getRouteMetrics("/api/books/:id");
    expect(m).not.toBeNull();
    expect(m!.requestCount).toBe(2);
  });

  it("normalizes numeric IDs", () => {
    recordRequest("/api/books/123", "GET", 100);
    recordRequest("/api/books/456", "GET", 200);
    const m = getRouteMetrics("/api/books/:id");
    expect(m!.requestCount).toBe(2);
  });

  it("separates routes by method", () => {
    recordRequest("/api/books", "GET", 100);
    recordRequest("/api/books", "POST", 200);
    const get = getRouteMetrics("/api/books", "GET");
    const post = getRouteMetrics("/api/books", "POST");
    expect(get!.requestCount).toBe(1);
    expect(post!.requestCount).toBe(1);
  });
});

describe("performance-monitor: getAllRouteMetrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("returns all routes sorted by traffic", () => {
    recordRequest("/api/a", "GET", 100);
    recordRequest("/api/a", "GET", 100);
    recordRequest("/api/a", "GET", 100);
    recordRequest("/api/b", "GET", 100);
    const all = getAllRouteMetrics();
    expect(all.length).toBe(2);
    expect(all[0].route).toBe("/api/a");
    expect(all[0].requestCount).toBe(3);
  });

  it("returns empty when no requests", () => {
    expect(getAllRouteMetrics().length).toBe(0);
  });
});

describe("performance-monitor: getSystemMetrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("returns basic system info", () => {
    const m = getSystemMetrics();
    // uptime could be 0 if module just loaded (rounded to seconds)
    expect(m.uptime).toBeGreaterThanOrEqual(0);
    expect(m.totalRequests).toBe(0);
    expect(m.errorRate).toBe(0);
    expect(m.timestamp).toBeDefined();
  });

  it("tracks total requests and errors", () => {
    recordRequest("/api/a", "GET", 100, false);
    recordRequest("/api/b", "GET", 200, true);
    recordRequest("/api/c", "GET", 300, false);
    const m = getSystemMetrics();
    expect(m.totalRequests).toBe(3);
    expect(m.totalErrors).toBe(1);
    expect(m.errorRate).toBeCloseTo(0.333, 2);
  });

  it("includes memory info", () => {
    const m = getSystemMetrics();
    expect(m.memory.rssMB).toBeGreaterThan(0);
    expect(m.memory.heapUsedMB).toBeGreaterThan(0);
  });

  it("identifies slow routes", () => {
    recordRequest("/api/slow", "GET", 500); // 500ms — slow but not very slow
    const m = getSystemMetrics();
    // Note: threshold is 100ms avg for slowRoutes
    // 500ms is above 100 so should be in slowRoutes
    expect(m.slowRoutes.length).toBeGreaterThan(0);
  });
});

describe("performance-monitor: edge cases", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("handles zero requests gracefully", () => {
    const m = getSystemMetrics();
    expect(m.avgResponseTime).toBe(0);
    expect(m.p95ResponseTime).toBe(0);
  });

  it("handles single request", () => {
    recordRequest("/api/single", "GET", 100);
    const m = getRouteMetrics("/api/single");
    expect(m!.p50DurationMs).toBe(100);
    expect(m!.p95DurationMs).toBe(100);
    expect(m!.p99DurationMs).toBe(100);
  });

  it("limits max routes (eviction)", () => {
    // Add many unique routes to test eviction
    for (let i = 0; i < 250; i++) {
      recordRequest(`/api/route-${i}`, "GET", 100);
    }
    const all = getAllRouteMetrics();
    expect(all.length).toBeLessThanOrEqual(200);
  });
});
