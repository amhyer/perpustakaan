/**
 * Unit tests untuk src/lib/cache.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { cache, CACHE_TTL } from "../cache";

describe("TTLCache", () => {
  beforeEach(() => {
    cache.clear();
  });

  it("set dan get data", () => {
    cache.set("key1", { name: "Test" }, CACHE_TTL.ONE_MINUTE);
    expect(cache.get("key1")).toEqual({ name: "Test" });
  });

  it("return null untuk key yang tidak ada", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("expire setelah TTL", () => {
    vi.useFakeTimers();
    cache.set("expiring", "value", 1000);
    expect(cache.get("expiring")).toBe("value");
    vi.advanceTimersByTime(1100);
    expect(cache.get("expiring")).toBeNull();
    vi.useRealTimers();
  });

  it("invalidate by key", () => {
    cache.set("k1", "v1", CACHE_TTL.ONE_MINUTE);
    cache.set("k2", "v2", CACHE_TTL.ONE_MINUTE);
    cache.invalidate("k1");
    expect(cache.get("k1")).toBeNull();
    expect(cache.get("k2")).toBe("v2");
  });

  it("invalidate by tag — affect multiple keys", () => {
    cache.set("a", 1, CACHE_TTL.ONE_MINUTE, ["stats"]);
    cache.set("b", 2, CACHE_TTL.ONE_MINUTE, ["stats"]);
    cache.set("c", 3, CACHE_TTL.ONE_MINUTE, ["other"]);
    cache.invalidateTag("stats");
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
    expect(cache.get("c")).toBe(3);
  });

  it("multiple tags per entry", () => {
    cache.set("multi", "v", CACHE_TTL.ONE_MINUTE, ["t1", "t2"]);
    expect(cache.get("multi")).toBe("v");
    cache.invalidateTag("t1");
    expect(cache.get("multi")).toBeNull();
  });

  it("clear menghapus semua", () => {
    cache.set("a", 1, CACHE_TTL.ONE_MINUTE);
    cache.set("b", 2, CACHE_TTL.ONE_MINUTE);
    cache.clear();
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
  });

  it("stats", () => {
    cache.set("a", 1, CACHE_TTL.ONE_MINUTE, ["x"]);
    cache.set("b", 2, CACHE_TTL.ONE_MINUTE, ["y"]);
    const stats = cache.stats();
    expect(stats.size).toBe(2);
    expect(stats.tags).toContain("x");
    expect(stats.tags).toContain("y");
  });

  it("expired entry otomatis dihapus saat get", () => {
    vi.useFakeTimers();
    cache.set("k", "v", 1000);
    vi.advanceTimersByTime(2000);
    // First call should auto-cleanup
    expect(cache.get("k")).toBeNull();
    vi.useRealTimers();
  });
});
