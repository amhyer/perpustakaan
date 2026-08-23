/**
 * Tests for reading level system.
 *
 * Sprint M - Tier 1 #2: Gamification lanjutan.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    loan: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  READING_LEVELS,
  getLevelFromBooks,
  getNextLevel,
  getLevelProgress,
  getMaxBooksForLevel,
  getPointMultiplier,
  computeReadingLevel,
  getAllLevels,
} from "../reading-level";

describe("reading-level: pure functions", () => {
  describe("getLevelFromBooks", () => {
    it("returns Pemula for 0 books", () => {
      const level = getLevelFromBooks(0);
      expect(level.id).toBe("pemula");
    });

    it("returns Pemula for 4 books (upper boundary)", () => {
      const level = getLevelFromBooks(4);
      expect(level.id).toBe("pemula");
    });

    it("returns Pembaca for 5 books", () => {
      const level = getLevelFromBooks(5);
      expect(level.id).toBe("pembaca");
    });

    it("returns Kutu Buku for 15 books", () => {
      const level = getLevelFromBooks(15);
      expect(level.id).toBe("kutu-buku");
    });

    it("returns Kolektor for 50 books", () => {
      const level = getLevelFromBooks(50);
      expect(level.id).toBe("kolektor");
    });

    it("returns Penjelajah for 100 books", () => {
      const level = getLevelFromBooks(100);
      expect(level.id).toBe("penjelajah");
    });

    it("returns Maestro for 200 books", () => {
      const level = getLevelFromBooks(200);
      expect(level.id).toBe("maestro");
    });

    it("returns Legenda for 500 books", () => {
      const level = getLevelFromBooks(500);
      expect(level.id).toBe("legenda");
    });

    it("returns Legenda for very high book counts", () => {
      expect(getLevelFromBooks(1000).id).toBe("legenda");
      expect(getLevelFromBooks(9999).id).toBe("legenda");
    });
  });

  describe("getNextLevel", () => {
    it("returns next level when not at max", () => {
      const next = getNextLevel("pemula");
      expect(next?.id).toBe("pembaca");
    });

    it("returns null for top level", () => {
      expect(getNextLevel("legenda")).toBeNull();
    });

    it("returns null for invalid level", () => {
      expect(getNextLevel("invalid")).toBeNull();
    });
  });

  describe("getLevelProgress", () => {
    it("returns 0% progress for new readers", () => {
      const p = getLevelProgress(0);
      expect(p.current.id).toBe("pemula");
      expect(p.next?.id).toBe("pembaca");
      expect(p.progressPercent).toBe(0);
      expect(p.booksToNext).toBe(5);
    });

    it("returns 50% progress at midpoint of level", () => {
      // Pemula 0-4, Pembaca 5-14
      // Midpoint of Pemula → Pembaca transition = book 2-3
      const p = getLevelProgress(2);
      // 2/5 = 40%
      expect(p.progressPercent).toBe(40);
    });

    it("returns 100% for top level", () => {
      const p = getLevelProgress(1000);
      expect(p.next).toBeNull();
      expect(p.progressPercent).toBe(100);
      expect(p.booksToNext).toBeNull();
    });

    it("correctly calculates books to next level", () => {
      // Kutu Buku 15-49, Kolektor 50-99
      // At book 30, need 20 more
      const p = getLevelProgress(30);
      expect(p.current.id).toBe("kutu-buku");
      expect(p.next?.id).toBe("kolektor");
      expect(p.booksToNext).toBe(20);
    });
  });

  describe("getMaxBooksForLevel", () => {
    it("returns default 3 for Pemula", () => {
      const level = getLevelFromBooks(0);
      expect(getMaxBooksForLevel(level)).toBe(3);
    });

    it("returns 5 for Kutu Buku", () => {
      const level = getLevelFromBooks(15);
      expect(getMaxBooksForLevel(level)).toBe(5);
    });

    it("returns 10 for Penjelajah", () => {
      const level = getLevelFromBooks(100);
      expect(getMaxBooksForLevel(level)).toBe(10);
    });

    it("returns 20 for Legenda", () => {
      const level = getLevelFromBooks(500);
      expect(getMaxBooksForLevel(level)).toBe(20);
    });
  });

  describe("getPointMultiplier", () => {
    it("returns 1.0 for Pemula", () => {
      expect(getPointMultiplier(READING_LEVELS[0])).toBe(1.0);
    });

    it("returns increasing multipliers", () => {
      const multipliers = READING_LEVELS.map(getPointMultiplier);
      for (let i = 1; i < multipliers.length; i++) {
        expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1]);
      }
    });

    it("Legenda has 2x multiplier (DOUBLE)", () => {
      const legenda = READING_LEVELS.find((l) => l.id === "legenda")!;
      expect(getPointMultiplier(legenda)).toBe(2.0);
    });
  });

  describe("READING_LEVELS integrity", () => {
    it("has 7 levels", () => {
      expect(READING_LEVELS).toHaveLength(7);
    });

    it("all levels have unique IDs", () => {
      const ids = READING_LEVELS.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("all levels have minBooks < next level minBooks", () => {
      for (let i = 1; i < READING_LEVELS.length; i++) {
        expect(READING_LEVELS[i].minBooks).toBeGreaterThan(READING_LEVELS[i - 1].minBooks);
      }
    });

    it("all levels have required fields", () => {
      READING_LEVELS.forEach((l) => {
        expect(l.name).toBeTruthy();
        expect(l.icon).toBeTruthy();
        expect(l.color).toBeTruthy();
        expect(l.emoji).toBeTruthy();
        expect(l.description).toBeTruthy();
        expect(l.perks.length).toBeGreaterThan(0);
        expect(l.pointMultiplier).toBeGreaterThanOrEqual(1);
      });
    });

    it("last level has null maxBooks (infinity)", () => {
      expect(READING_LEVELS[READING_LEVELS.length - 1].maxBooks).toBeNull();
    });
  });

  describe("getAllLevels", () => {
    it("returns all levels", () => {
      const all = getAllLevels();
      expect(all).toHaveLength(READING_LEVELS.length);
    });
  });
});

describe("reading-level: database operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeReadingLevel", () => {
    it("returns level data for member with no books", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(0);
      vi.mocked(db.member.findUnique).mockResolvedValue({
        classGrade: "10-A",
      } as any);
      vi.mocked(db.loan.groupBy).mockResolvedValue([
        { memberId: "other-member", _count: { _all: 5 } },
      ] as any);
      vi.mocked(db.member.findMany).mockResolvedValue([
        { id: "other-member" },
      ] as any);

      const result = await computeReadingLevel("m1");
      expect(result.booksRead).toBe(0);
      expect(result.level.id).toBe("pemula");
      expect(result.next?.id).toBe("pembaca");
      expect(result.classGrade).toBe("10-A");
      // m1 not in groupBy (0 books), so rank is null
      expect(result.rank).toBeNull();
    });

    it("calculates rank correctly (top 1)", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(50);
      vi.mocked(db.member.findUnique).mockResolvedValue({
        classGrade: null,
      } as any);
      vi.mocked(db.loan.groupBy).mockResolvedValue([
        { memberId: "m1", _count: { _all: 50 } },
        { memberId: "m2", _count: { _all: 30 } },
      ] as any);
      vi.mocked(db.member.findMany).mockResolvedValue([] as any);

      const result = await computeReadingLevel("m1");
      expect(result.booksRead).toBe(50);
      expect(result.level.id).toBe("kolektor");
      expect(result.rank).toBe(1);
      expect(result.rankInClass).toBeNull();
    });

    it("calculates class rank correctly", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(20);
      vi.mocked(db.member.findUnique).mockResolvedValue({
        classGrade: "11-B",
      } as any);
      vi.mocked(db.loan.groupBy).mockResolvedValue([
        { memberId: "m1", _count: { _all: 20 } },
        { memberId: "m2", _count: { _all: 25 } },
        { memberId: "m3", _count: { _all: 15 } },
      ] as any);
      // Class 11-B has m1 and m2
      vi.mocked(db.member.findMany).mockResolvedValue([
        { id: "m1" },
        { id: "m2" },
      ] as any);

      const result = await computeReadingLevel("m1");
      // m1 (20) is rank 2 in class (m2 has 25)
      expect(result.rankInClass).toBe(2);
      // Overall: m1 (20) is rank 2 (m2 is 25 first)
      expect(result.rank).toBe(2);
    });

    it("returns null for class rank if member not in class list", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(5);
      vi.mocked(db.member.findUnique).mockResolvedValue({
        classGrade: "10-A",
      } as any);
      vi.mocked(db.loan.groupBy).mockResolvedValue([
        { memberId: "other", _count: { _all: 100 } },
      ] as any);
      vi.mocked(db.member.findMany).mockResolvedValue([
        { id: "other" },
      ] as any);

      const result = await computeReadingLevel("m1");
      expect(result.rankInClass).toBeNull();
    });

    it("handles null classGrade", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(5);
      vi.mocked(db.member.findUnique).mockResolvedValue({
        classGrade: null,
      } as any);
      vi.mocked(db.loan.groupBy).mockResolvedValue([] as any);
      vi.mocked(db.member.findMany).mockResolvedValue([] as any);

      const result = await computeReadingLevel("m1");
      expect(result.classGrade).toBeNull();
      expect(result.rankInClass).toBeNull();
    });

    it("handles member with null classGrade in DB", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(5);
      vi.mocked(db.member.findUnique).mockResolvedValue(null);
      vi.mocked(db.loan.groupBy).mockResolvedValue([] as any);
      vi.mocked(db.member.findMany).mockResolvedValue([] as any);

      const result = await computeReadingLevel("m1");
      expect(result.classGrade).toBeNull();
    });

    it("computes Legenda level for high book counts", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(500);
      vi.mocked(db.member.findUnique).mockResolvedValue({
        classGrade: "12-A",
      } as any);
      vi.mocked(db.loan.groupBy).mockResolvedValue([
        { memberId: "m1", _count: { _all: 500 } },
      ] as any);
      vi.mocked(db.member.findMany).mockResolvedValue([{ id: "m1" }] as any);

      const result = await computeReadingLevel("m1");
      expect(result.level.id).toBe("legenda");
      expect(result.next).toBeNull();
      expect(result.progressPercent).toBe(100);
    });

    it("returns rank null if member has no loans (not in top list)", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(0);
      vi.mocked(db.member.findUnique).mockResolvedValue({
        classGrade: null,
      } as any);
      vi.mocked(db.loan.groupBy).mockResolvedValue([
        { memberId: "other", _count: { _all: 10 } },
      ] as any);
      vi.mocked(db.member.findMany).mockResolvedValue([] as any);

      const result = await computeReadingLevel("m1");
      expect(result.rank).toBeNull(); // m1 not in groupBy
    });
  });
});
