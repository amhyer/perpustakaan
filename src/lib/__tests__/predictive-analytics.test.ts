/**
 * Unit tests untuk Predictive Analytics pure functions.
 */

import { describe, it, expect } from "vitest";

// Mirror of linearRegression
function linearRegression(points: { x: number; y: number }[]) {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y || 0, r2: 0 };

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const sumYY = points.reduce((s, p) => s + p.y * p.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce(
    (s, p) => s + (p.y - (slope * p.x + intercept)) ** 2,
    0
  );
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
}

describe("linearRegression", () => {
  it("returns y = 2x for perfect linear data", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
    ];
    const r = linearRegression(points);
    expect(r.slope).toBeCloseTo(2, 5);
    expect(r.intercept).toBeCloseTo(0, 5);
    expect(r.r2).toBeCloseTo(1, 5);
  });

  it("returns positive slope for increasing data", () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 7 },
      { x: 2, y: 9 },
      { x: 3, y: 12 },
    ];
    const r = linearRegression(points);
    expect(r.slope).toBeGreaterThan(0);
  });

  it("returns negative slope for decreasing data", () => {
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 80 },
      { x: 2, y: 60 },
      { x: 3, y: 40 },
    ];
    const r = linearRegression(points);
    expect(r.slope).toBeLessThan(0);
  });

  it("handles constant data (slope = 0)", () => {
    const points = [
      { x: 0, y: 50 },
      { x: 1, y: 50 },
      { x: 2, y: 50 },
      { x: 3, y: 50 },
    ];
    const r = linearRegression(points);
    expect(r.slope).toBeCloseTo(0, 5);
    expect(r.intercept).toBeCloseTo(50, 5);
  });

  it("handles single point", () => {
    const r = linearRegression([{ x: 5, y: 10 }]);
    expect(r.slope).toBe(0);
    expect(r.intercept).toBe(10);
  });

  it("returns 0 R² for very noisy data", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 100 },
      { x: 2, y: 0 },
      { x: 3, y: 100 },
    ];
    const r = linearRegression(points);
    expect(r.r2).toBeLessThan(0.5);
  });
});

describe("Anomaly detection thresholds", () => {
  function isAnomaly(value: number, mean: number, std: number): boolean {
    if (std === 0) return false;
    return Math.abs((value - mean) / std) > 2;
  }

  it("flags value > 2 std deviations", () => {
    expect(isAnomaly(30, 10, 5)).toBe(true); // +4 std
    expect(isAnomaly(20.1, 10, 5)).toBe(true); // just over 2 std
  });

  it("does not flag value within 2 std", () => {
    expect(isAnomaly(15, 10, 5)).toBe(false); // +1 std
    expect(isAnomaly(12, 10, 5)).toBe(false);
  });

  it("handles std = 0 (constant data)", () => {
    expect(isAnomaly(20, 10, 0)).toBe(false);
  });
});

describe("Stock prediction (months until out)", () => {
  function monthsUntilOut(currentStock: number, monthlyRate: number): number {
    if (monthlyRate === 0) return Infinity;
    return currentStock / monthlyRate;
  }

  it("calculates months correctly", () => {
    expect(monthsUntilOut(10, 2)).toBe(5);
    expect(monthsUntilOut(20, 4)).toBe(5);
  });

  it("returns infinity for zero rate", () => {
    expect(monthsUntilOut(10, 0)).toBe(Infinity);
  });

  it("classifies risk correctly", () => {
    function classifyRisk(months: number): "HIGH" | "MEDIUM" | "LOW" {
      if (months < 1) return "HIGH";
      if (months < 3) return "MEDIUM";
      return "LOW";
    }
    expect(classifyRisk(0.5)).toBe("HIGH");
    expect(classifyRisk(2)).toBe("MEDIUM");
    expect(classifyRisk(6)).toBe("LOW");
  });
});
