/**
 * Unit tests untuk cohort analysis pure logic.
 */

import { describe, it, expect } from "vitest";

describe("Cohort Retention Calculation", () => {
  // Mirror logic
  function calculateRetention(
    cohortSize: number,
    activePerPeriod: number[]
  ): { [monthsAfter: number]: number } {
    const retention: { [k: number]: number } = {};
    activePerPeriod.forEach((active, idx) => {
      retention[idx] = cohortSize > 0 ? Math.round((active / cohortSize) * 100) : 0;
    });
    return retention;
  }

  it("100% retention at M+0 (cohort month)", () => {
    const result = calculateRetention(50, [50, 40, 30, 20]);
    expect(result[0]).toBe(100);
  });

  it("decreasing retention typical pattern", () => {
    const result = calculateRetention(50, [50, 40, 30, 20, 10]);
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(80);
    expect(result[2]).toBe(60);
    expect(result[3]).toBe(40);
    expect(result[4]).toBe(20);
  });

  it("handles zero cohort size", () => {
    const result = calculateRetention(0, [0, 0, 0]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
  });

  it("handles zero active members", () => {
    const result = calculateRetention(50, [0, 0, 0]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
  });

  it("rounds percentages correctly", () => {
    // 7/15 = 46.666% → should round to 47
    const result = calculateRetention(15, [15, 7, 3]);
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(47);
    expect(result[2]).toBe(20);
  });

  it("handles retention > 100% (impossible but defensive)", () => {
    // Shouldn't happen but defensive
    const result = calculateRetention(50, [50, 60, 55]);
    expect(result[1]).toBe(120); // 60/50 * 100
  });
});

describe("Cohort Summary calculation", () => {
  function averageRetention(
    cohorts: { retention: { [k: number]: number } }[],
    monthsAfter: number
  ): number {
    let sum = 0;
    let count = 0;
    for (const c of cohorts) {
      if (c.retention[monthsAfter] !== undefined) {
        sum += c.retention[monthsAfter];
        count++;
      }
    }
    return count > 0 ? Math.round(sum / count) : 0;
  }

  it("returns 0 for empty cohorts", () => {
    expect(averageRetention([], 1)).toBe(0);
  });

  it("calculates M+1 average", () => {
    const cohorts = [
      { retention: { 0: 100, 1: 80, 2: 60 } },
      { retention: { 0: 100, 1: 60, 2: 40 } },
      { retention: { 0: 100, 1: 90, 2: 70 } },
    ];
    expect(averageRetention(cohorts, 1)).toBe(77); // (80+60+90)/3 = 76.66
  });

  it("skips cohorts without M+N data", () => {
    const cohorts = [
      { retention: { 0: 100, 1: 80 } },
      { retention: { 0: 100 } }, // No M+1
      { retention: { 0: 100, 1: 60 } },
    ];
    expect(averageRetention(cohorts, 1)).toBe(70); // (80+60)/2
  });
});

describe("Cohort Grouping", () => {
  function getCohortKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  it("formats as YYYY-MM", () => {
    const jan = new Date(2026, 0, 15);
    expect(getCohortKey(jan)).toBe("2026-01");
    const dec = new Date(2026, 11, 1);
    expect(getCohortKey(dec)).toBe("2026-12");
  });

  it("uses zero-padded month", () => {
    const apr = new Date(2026, 3, 5);
    expect(getCohortKey(apr)).toBe("2026-04");
  });
});
