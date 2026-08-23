/**
 * Unit tests untuk performance utilities.
 *
 * Sprint J Phase D - Performance.
 */

import { describe, it, expect, vi } from "vitest";

import {
  debounce,
  throttle,
  byteSize as _byteSize,
  perfMark,
  perfMeasure,
  timeAsync,
  buildSrcSet,
  formatBytes,
  estimateSize,
} from "../perf-utils";

describe("perf-utils: debounce", () => {
  it("delays execution", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("cancels previous calls", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("passes arguments", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced("a", 1, { key: "val" });
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("a", 1, { key: "val" });
    vi.useRealTimers();
  });
});

describe("perf-utils: throttle", () => {
  it("limits to one call per period", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("allows call after period", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("perf-utils: perfMark/Measure", () => {
  it("creates performance marks", () => {
    const mark = vi.spyOn(performance, "mark").mockImplementation(() => {});
    perfMark("test-mark");
    expect(mark).toHaveBeenCalledWith("test-mark");
    mark.mockRestore();
  });

  it("returns 0 when measure fails", () => {
    // performance.measure throws for unknown marks
    const result = perfMeasure("non-existent-a", "non-existent-b");
    expect(result).toBe(0);
  });
});

describe("perf-utils: timeAsync", () => {
  it("times async function", async () => {
    const { result, duration } = await timeAsync(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "done";
    });
    expect(result).toBe("done");
    expect(duration).toBeGreaterThanOrEqual(10);
  });

  it("handles errors", async () => {
    await expect(
      timeAsync(async () => {
        throw new Error("test");
      })
    ).rejects.toThrow("test");
  });
});

describe("perf-utils: buildSrcSet", () => {
  it("generates srcset string", () => {
    const result = buildSrcSet("https://cdn.example.com/img.jpg", [320, 640]);
    expect(result).toContain("320w");
    expect(result).toContain("640w");
  });

  it("uses default widths", () => {
    const result = buildSrcSet("https://cdn.example.com/img.jpg");
    expect(result).toContain("320w");
    expect(result).toContain("1920w");
  });

  it("returns empty for empty URL", () => {
    expect(buildSrcSet("")).toBe("");
  });
});

describe("perf-utils: formatBytes", () => {
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats KB", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  it("formats MB", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });

  it("formats GB", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("handles decimals", () => {
    expect(formatBytes(1536, 1)).toBe("1.5 KB");
  });
});

describe("perf-utils: estimateSize", () => {
  it("estimates null/undefined", () => {
    expect(estimateSize(null)).toBe(0);
    expect(estimateSize(undefined)).toBe(0);
  });

  it("estimates strings", () => {
    expect(estimateSize("hello")).toBe(10); // 5 chars * 2
  });

  it("estimates numbers", () => {
    expect(estimateSize(42)).toBe(8);
  });

  it("estimates arrays", () => {
    const size = estimateSize([1, 2, 3]);
    expect(size).toBeGreaterThan(0);
  });

  it("estimates objects", () => {
    const size = estimateSize({ a: 1, b: "hello" });
    expect(size).toBeGreaterThan(0);
  });

  it("estimates nested structures", () => {
    const size = estimateSize({
      user: { name: "John", age: 30 },
      items: [{ id: 1 }, { id: 2 }],
    });
    expect(size).toBeGreaterThan(20);
  });
});
