/**
 * Unit tests untuk recommendation engine scoring.
 */

import { describe, it, expect } from "vitest";

// ===== Pure functions (mirrors dari recommendation-engine.ts) =====

function calculateScore(
  cfUsers: number,
  isSameCategory: boolean,
  isSameAuthor: boolean,
  trendingCount: number
): number {
  const cfScore = cfUsers / 10;
  const categoryBoost = isSameCategory ? 0.3 : 0;
  const authorBoost = isSameAuthor ? 0.2 : 0;
  const trendingBoost = Math.min(0.2, trendingCount / 20);
  return Math.min(1, cfScore + categoryBoost + authorBoost + trendingBoost);
}

function buildReason(
  cfUsers: number,
  isSameCategory: boolean,
  categoryName: string | null,
  isSameAuthor: boolean,
  author: string,
  trendingCount: number
): string {
  const reasons: string[] = [];
  if (cfUsers > 0) reasons.push(`${cfUsers} siswa juga pinjam`);
  if (isSameCategory && categoryName) reasons.push(`kategori ${categoryName}`);
  if (isSameAuthor) reasons.push(`karya ${author}`);
  if (trendingCount > 5) reasons.push(`trending bulan ini`);
  return reasons.length > 0 ? reasons.join(" • ") : "Mungkin kamu suka";
}

// ===== Tests =====

describe("Recommendation Scoring", () => {
  it("CF score dominates for highly shared books", () => {
    const score = calculateScore(15, false, false, 0);
    // cfScore = 1.5, capped at 1
    expect(score).toBe(1);
  });

  it("category boost adds 0.3", () => {
    const without = calculateScore(2, false, false, 0);
    const withCat = calculateScore(2, true, false, 0);
    expect(withCat - without).toBeCloseTo(0.3, 2);
  });

  it("author boost adds 0.2", () => {
    const without = calculateScore(2, false, false, 0);
    const withAuthor = calculateScore(2, false, true, 0);
    expect(withAuthor - without).toBeCloseTo(0.2, 2);
  });

  it("trending boost caps at 0.2", () => {
    // trendingCount/20 — when count=5, boost = 5/20 = 0.25 → capped at 0.2
    // when count=10, boost = 10/20 = 0.5 → capped at 0.2
    // So both at high count are 0.2
    const at5 = calculateScore(0, false, false, 5);
    const at100 = calculateScore(0, false, false, 100);
    expect(at5).toBe(0.2);
    expect(at100).toBe(0.2);
    expect(at100).toBe(at5);
  });

  it("trending boost below cap", () => {
    // count=2 → 2/20 = 0.1 (below 0.2)
    const at2 = calculateScore(0, false, false, 2);
    expect(at2).toBeCloseTo(0.1, 2);
  });

  it("total score caps at 1", () => {
    const max = calculateScore(20, true, true, 100);
    expect(max).toBe(1);
  });
});

describe("Reason Generation", () => {
  it("builds reason from multiple signals", () => {
    const reason = buildReason(5, true, "Fiksi", true, "Andrea Hirata", 10);
    expect(reason).toContain("5 siswa");
    expect(reason).toContain("Fiksi");
    expect(reason).toContain("Andrea Hirata");
  });

  it("falls back to default reason when no signals", () => {
    const reason = buildReason(0, false, null, false, "", 0);
    expect(reason).toBe("Mungkin kamu suka");
  });

  it("single signal works", () => {
    const reason = buildReason(3, false, null, false, "", 0);
    expect(reason).toBe("3 siswa juga pinjam");
  });
});
