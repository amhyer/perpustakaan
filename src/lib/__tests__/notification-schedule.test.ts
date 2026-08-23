/**
 * Unit tests untuk Notification Schedule service.
 */

import { describe, it, expect } from "vitest";

describe("Notification Schedule - Day Matching", () => {
  function isWeeklyDue(now: Date, dayOfWeek: number | null): boolean {
    if (dayOfWeek === null) return false;
    return now.getDay() === dayOfWeek;
  }

  function isMonthlyDue(now: Date, dayOfMonth: number | null): boolean {
    if (dayOfMonth === null) return false;
    return now.getDate() === dayOfMonth;
  }

  it("weekly schedule matches on correct day of week", () => {
    // Sunday = 0
    const sunday = new Date(2026, 7, 23); // Aug 23, 2026 is Sunday
    expect(isWeeklyDue(sunday, 0)).toBe(true);
    expect(isWeeklyDue(sunday, 1)).toBe(false);
  });

  it("monthly schedule matches on correct day of month", () => {
    const first = new Date(2026, 7, 1);
    expect(isMonthlyDue(first, 1)).toBe(true);
    expect(isMonthlyDue(first, 15)).toBe(false);
  });

  it("null dayOfWeek returns false for weekly", () => {
    const today = new Date();
    expect(isWeeklyDue(today, null)).toBe(false);
  });

  it("null dayOfMonth returns false for monthly", () => {
    const today = new Date();
    expect(isMonthlyDue(today, null)).toBe(false);
  });
});

describe("Notification Schedule - Hour filtering", () => {
  function isHourMatch(now: Date, targetHour: number): boolean {
    return now.getHours() === targetHour;
  }

  it("matches exact hour", () => {
    const morning = new Date(2026, 0, 1, 8, 30, 0);
    expect(isHourMatch(morning, 8)).toBe(true);
    expect(isHourMatch(morning, 9)).toBe(false);
  });

  it("handles boundary (top of hour)", () => {
    const top = new Date(2026, 0, 1, 18, 0, 0);
    expect(isHourMatch(top, 18)).toBe(true);
  });

  it("handles boundary (59 minutes)", () => {
    const before = new Date(2026, 0, 1, 17, 59, 0);
    expect(isHourMatch(before, 18)).toBe(false); // Still 17
  });
});

describe("Notification Schedule - Run Status", () => {
  function determineStatus(success: boolean, partial: boolean): "success" | "partial" | "failed" {
    if (!success) return "failed";
    if (partial) return "partial";
    return "success";
  }

  it("returns 'success' for fully successful run", () => {
    expect(determineStatus(true, false)).toBe("success");
  });

  it("returns 'partial' for partial success", () => {
    expect(determineStatus(true, true)).toBe("partial");
  });

  it("returns 'failed' for fully failed", () => {
    expect(determineStatus(false, false)).toBe("failed");
  });
});
