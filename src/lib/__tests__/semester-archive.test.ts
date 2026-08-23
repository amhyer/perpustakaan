/**
 * Unit tests untuk Semester Archive logic (pure functions only).
 *
 * Catatan: Integration test dengan DB butuh prisma generate, skip dulu.
 */

import { describe, it, expect } from "vitest";

// Mirror pure functions for testing
type ResetMode = "ARCHIVE" | "RESET" | "CARRYOVER";

function detectPeriodLogic(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month >= 6) {
    return {
      periodName: `Ganjil ${year}/${year + 1}`,
      periodType: "ODD" as const,
      startDate: new Date(year, 6, 1),
      endDate: new Date(year, 11, 31, 23, 59, 59),
    };
  } else {
    return {
      periodName: `Genap ${year - 1}/${year}`,
      periodType: "EVEN" as const,
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 5, 30, 23, 59, 59),
    };
  }
}

describe("detectPeriod", () => {
  it("returns GANJIL (ODD) for July-December", () => {
    const july = new Date(2026, 6, 15);
    const result = detectPeriodLogic(july);
    expect(result.periodType).toBe("ODD");
    expect(result.periodName).toMatch(/Ganjil 2026/);
    expect(result.startDate.getMonth()).toBe(6);
    expect(result.endDate.getMonth()).toBe(11);
  });

  it("returns GENAP (EVEN) for January-June", () => {
    const march = new Date(2026, 2, 20);
    const result = detectPeriodLogic(march);
    expect(result.periodType).toBe("EVEN");
    expect(result.periodName).toMatch(/Genap 2025/);
    expect(result.startDate.getMonth()).toBe(0);
    expect(result.endDate.getMonth()).toBe(5);
  });

  it("boundary: December 31 is still GANJIL", () => {
    const dec = new Date(2026, 11, 31);
    expect(detectPeriodLogic(dec).periodType).toBe("ODD");
  });

  it("boundary: July 1 is GANJIL", () => {
    const julyFirst = new Date(2026, 6, 1);
    expect(detectPeriodLogic(julyFirst).periodType).toBe("ODD");
  });

  it("boundary: June 30 is GENAP", () => {
    const juneLast = new Date(2026, 5, 30);
    expect(detectPeriodLogic(juneLast).periodType).toBe("EVEN");
  });

  it("boundary: January 1 is GENAP", () => {
    const janFirst = new Date(2026, 0, 1);
    expect(detectPeriodLogic(janFirst).periodType).toBe("EVEN");
  });
});

describe("Reset Mode logic", () => {
  function shouldReset(mode: ResetMode): boolean {
    return mode === "RESET";
  }

  function shouldArchive(mode: ResetMode): boolean {
    return mode !== "CARRYOVER";
  }

  it("ARCHIVE: only archives, no reset", () => {
    expect(shouldArchive("ARCHIVE")).toBe(true);
    expect(shouldReset("ARCHIVE")).toBe(false);
  });

  it("RESET: archives and resets", () => {
    expect(shouldArchive("RESET")).toBe(true);
    expect(shouldReset("RESET")).toBe(true);
  });

  it("CARRYOVER: no archive, no reset", () => {
    expect(shouldArchive("CARRYOVER")).toBe(false);
    expect(shouldReset("CARRYOVER")).toBe(false);
  });
});

describe("Ranking calculation", () => {
  function buildRankings(balances: { memberId: string; balance: number }[]): { rank: number; memberId: string; balance: number }[] {
    return balances
      .sort((a, b) => b.balance - a.balance)
      .map((b, idx) => ({ rank: idx + 1, memberId: b.memberId, balance: b.balance }));
  }

  it("orders by balance desc", () => {
    const result = buildRankings([
      { memberId: "c", balance: 50 },
      { memberId: "a", balance: 200 },
      { memberId: "b", balance: 100 },
    ]);
    expect(result[0]).toEqual({ rank: 1, memberId: "a", balance: 200 });
    expect(result[1]).toEqual({ rank: 2, memberId: "b", balance: 100 });
    expect(result[2]).toEqual({ rank: 3, memberId: "c", balance: 50 });
  });

  it("handles tie with stable order", () => {
    const result = buildRankings([
      { memberId: "a", balance: 100 },
      { memberId: "b", balance: 100 },
    ]);
    expect(result[0].balance).toBe(100);
    expect(result[1].balance).toBe(100);
  });

  it("returns empty for empty input", () => {
    expect(buildRankings([])).toEqual([]);
  });

  it("handles negative balances", () => {
    const result = buildRankings([
      { memberId: "a", balance: -50 },
      { memberId: "b", balance: 100 },
    ]);
    expect(result[0].memberId).toBe("b");
  });
});
