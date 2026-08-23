/**
 * Integration test untuk streak detection.
 *
 * Catatan: Test ini butuh DB. Saat ini kita test pure helper functions
 * dan pattern matching saja. Integration test dengan real DB menyusul.
 */

import { describe, it, expect } from "vitest";

describe("Streak Calculation Logic", () => {
  // Mirror of calculateStreak logic
  function calcStreakLogic(txns: { createdAt: Date }[]): number {
    if (txns.length === 0) return 0;
    const days = new Set<string>();
    for (const t of txns) {
      days.add(t.createdAt.toISOString().split("T")[0]);
    }
    const sortedDays = Array.from(days).sort((a, b) => b.localeCompare(a));

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diffDays = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / 86400000
      );
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  it("returns 0 for empty transactions", () => {
    expect(calcStreakLogic([])).toBe(0);
  });

  it("returns 1 for single today", () => {
    expect(calcStreakLogic([{ createdAt: new Date() }])).toBe(1);
  });

  it("returns 1 for single yesterday", () => {
    const yesterday = new Date(Date.now() - 86400000);
    expect(calcStreakLogic([{ createdAt: yesterday }])).toBe(1);
  });

  it("returns 0 if last transaction is 2+ days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    expect(calcStreakLogic([{ createdAt: twoDaysAgo }])).toBe(0);
  });

  it("returns 7 for 7 consecutive days ending today", () => {
    const txns = Array.from({ length: 7 }, (_, i) => ({
      createdAt: new Date(Date.now() - i * 86400000),
    }));
    expect(calcStreakLogic(txns)).toBe(7);
  });

  it("returns 30 for 30 consecutive days", () => {
    const txns = Array.from({ length: 30 }, (_, i) => ({
      createdAt: new Date(Date.now() - i * 86400000),
    }));
    expect(calcStreakLogic(txns)).toBe(30);
  });

  it("breaks streak on gap", () => {
    const txns = [
      { createdAt: new Date() },
      { createdAt: new Date(Date.now() - 86400000) },
      // gap on day 2
      { createdAt: new Date(Date.now() - 3 * 86400000) },
      { createdAt: new Date(Date.now() - 4 * 86400000) },
    ];
    expect(calcStreakLogic(txns)).toBe(2);
  });

  it("handles multiple transactions on same day", () => {
    // 2 transactions on today, 1 on yesterday
    const txns = [
      { createdAt: new Date() },
      { createdAt: new Date() },
      { createdAt: new Date(Date.now() - 86400000) },
    ];
    expect(calcStreakLogic(txns)).toBe(2);
  });
});

describe("CSV Export", () => {
  // Mirror of csvEscape logic
  function csvEscape(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  it("returns empty string for null", () => {
    expect(csvEscape(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(csvEscape(undefined)).toBe("");
  });

  it("passes through simple strings", () => {
    expect(csvEscape("hello")).toBe("hello");
    expect(csvEscape("123")).toBe("123");
  });

  it("quotes strings with commas", () => {
    expect(csvEscape("hello, world")).toBe('"hello, world"');
  });

  it("escapes quotes inside strings", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes strings with newlines", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("Streak Bonus Eligibility", () => {
  // Test logic for when to award streak bonus
  function shouldAwardStreak7(streak: number): boolean {
    return streak >= 7 && streak % 7 === 0;
  }

  function shouldAwardStreak30(streak: number): boolean {
    return streak >= 30 && streak % 30 === 0;
  }

  it("STREAK_7 awarded at 7, 14, 21, 28, 35", () => {
    [7, 14, 21, 28, 35].forEach((d) => {
      expect(shouldAwardStreak7(d)).toBe(true);
    });
  });

  it("STREAK_7 NOT awarded at 1, 5, 8, 13", () => {
    [1, 5, 8, 13].forEach((d) => {
      expect(shouldAwardStreak7(d)).toBe(false);
    });
  });

  it("STREAK_30 awarded at 30, 60, 90", () => {
    [30, 60, 90].forEach((d) => {
      expect(shouldAwardStreak30(d)).toBe(true);
    });
  });

  it("STREAK_30 NOT awarded at 7, 15, 31, 45", () => {
    [7, 15, 31, 45].forEach((d) => {
      expect(shouldAwardStreak30(d)).toBe(false);
    });
  });
});
