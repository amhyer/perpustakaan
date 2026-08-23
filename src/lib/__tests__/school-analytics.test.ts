/**
 * Tests for school analytics.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    loan: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    member: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    book: { count: vi.fn() },
    gamificationProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import { getSchoolAnalytics, getMemberReportCard, DAY_NAMES } from "../school-analytics";

describe("school-analytics: pure helpers", () => {
  it("DAY_NAMES has 7 entries", () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe("Minggu");
    expect(DAY_NAMES[1]).toBe("Senin");
  });
});

describe("school-analytics: getSchoolAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.loan.count).mockResolvedValue(0);
    vi.mocked(db.loan.findMany).mockResolvedValue([]);
    vi.mocked(db.loan.groupBy).mockResolvedValue([]);
    vi.mocked(db.member.count).mockResolvedValue(0);
    vi.mocked(db.member.findMany).mockResolvedValue([]);
    vi.mocked(db.book.count).mockResolvedValue(0);
  });

  it("returns full analytics object", async () => {
    const result = await getSchoolAnalytics();
    expect(result.monthlyTrends).toBeDefined();
    expect(result.weeklyVelocity).toBeDefined();
    expect(result.classComparison).toBeDefined();
    expect(result.genrePreferences).toBeDefined();
    expect(result.atRiskStudents).toBeDefined();
    expect(result.peakTimes).toBeDefined();
    expect(result.yearComparison).toBeDefined();
    expect(result.predictions).toBeDefined();
    expect(result.topReaders).toBeDefined();
  });

  it("monthly trends returns 6 entries by default", async () => {
    const result = await getSchoolAnalytics();
    expect(result.monthlyTrends).toHaveLength(6);
  });

  it("weekly velocity returns 12 weeks", async () => {
    const result = await getSchoolAnalytics();
    expect(result.weeklyVelocity).toHaveLength(12);
  });

  it("year comparison uses correct thisYear/lastYear", async () => {
    const result = await getSchoolAnalytics();
    expect(result.yearComparison).toBeDefined();
    expect(result.yearComparison.thisYear).toBeDefined();
    expect(result.yearComparison.lastYear).toBeDefined();
  });

  it("predictions are returned", async () => {
    const result = await getSchoolAnalytics();
    expect(result.predictions.nextMonthLoans).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high"]).toContain(result.predictions.confidence);
  });
});

describe("school-analytics: getMemberReportCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for non-existent member", async () => {
    vi.mocked(db.member.findUnique).mockResolvedValue(null);
    const result = await getMemberReportCard("nonexistent");
    expect(result).toBeNull();
  });

  it("returns report card for valid member", async () => {
    vi.mocked(db.member.findUnique).mockResolvedValue({
      id: "m1", fullName: "Budi", classGrade: "10-A", user: { name: "Budi" },
    } as any);
    vi.mocked(db.loan.count)
      .mockResolvedValueOnce(20).mockResolvedValueOnce(18).mockResolvedValueOnce(2).mockResolvedValueOnce(10);
    vi.mocked(db.loan.findMany).mockResolvedValue([
      { bookItem: { book: { category: { name: "Fiksi" }, author: "Andrea Hirata" } } },
    ] as any);
    vi.mocked(db.gamificationProfile.findUnique).mockResolvedValue({ points: 250 } as any);

    const result = await getMemberReportCard("m1");
    expect(result).not.toBeNull();
    expect(result?.memberName).toBe("Budi");
    expect(result?.totalLoans).toBe(20);
    expect(result?.favoriteCategory).toBe("Fiksi");
    expect(result?.favoriteAuthor).toBe("Andrea Hirata");
    expect(result?.level).toBe("Kutu Buku");
    expect(result?.points).toBe(250);
  });

  it("assigns correct level based on returned count", async () => {
    vi.mocked(db.member.findUnique).mockResolvedValue({
      id: "m1", fullName: "Test", classGrade: "10-A", user: { name: "Test" },
    } as any);
    vi.mocked(db.loan.count)
      .mockResolvedValueOnce(600).mockResolvedValueOnce(550).mockResolvedValueOnce(0).mockResolvedValueOnce(50);
    vi.mocked(db.loan.findMany).mockResolvedValue([]);
    vi.mocked(db.gamificationProfile.findUnique).mockResolvedValue(null);

    const result = await getMemberReportCard("m1");
    expect(result?.level).toBe("Legenda");
  });

  it("handles null category/author gracefully", async () => {
    vi.mocked(db.member.findUnique).mockResolvedValue({
      id: "m1", fullName: "Test", classGrade: "10-A", user: { name: "Test" },
    } as any);
    vi.mocked(db.loan.count)
      .mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    vi.mocked(db.loan.findMany).mockResolvedValue([
      { bookItem: { book: { category: null, author: "" } } },
    ] as any);
    vi.mocked(db.gamificationProfile.findUnique).mockResolvedValue(null);

    const result = await getMemberReportCard("m1");
    expect(result?.favoriteCategory).toBeNull();
    expect(result?.favoriteAuthor).toBeNull();
  });
});
