/**
 * Tests for reading challenges system.
 *
 * Sprint M - Tier 1 #2: Gamification lanjutan.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    loan: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    pointTransaction: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    review: {
      count: vi.fn(),
    },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  CHALLENGE_TEMPLATES,
  getPeriodDates,
  calculateProgressPercent,
  determineStatus,
  daysRemaining,
  isOnTrack,
  getTemplate,
  createChallengeFromTemplate,
  computeChallengeProgress,
  formatChallengeSummary,
  type Challenge,
  type ChallengeType,
} from "../reading-challenges";

describe("reading-challenges: pure functions", () => {
  describe("getPeriodDates", () => {
    it("daily period gives 1 day range", () => {
      const start = new Date("2024-06-15T10:00:00Z");
      const { startDate, endDate } = getPeriodDates("DAILY", start);
      const diff = endDate.getTime() - startDate.getTime();
      expect(diff).toBe(86400000); // 24h
    });

    it("weekly period gives 7 days range", () => {
      const start = new Date("2024-06-15T10:00:00Z");
      const { startDate, endDate } = getPeriodDates("WEEKLY", start);
      const diff = endDate.getTime() - startDate.getTime();
      expect(diff).toBe(7 * 86400000);
    });

    it("monthly period gives ~30 days range", () => {
      const start = new Date(2024, 5, 15); // June 15 local
      const { endDate } = getPeriodDates("MONTHLY", start);
      const diff = endDate.getTime() - start.getTime();
      // 30 days (June 15 + 30 = July 15)
      expect(diff).toBe(30 * 86400000);
    });

    it("yearly period gives ~365 days", () => {
      const start = new Date(2024, 5, 15); // June 15 local
      const { endDate } = getPeriodDates("YEARLY", start);
      const diff = endDate.getTime() - start.getTime();
      // 365 days (2024-06-15 to 2025-06-15, no leap day in between)
      expect(diff).toBe(365 * 86400000);
    });

    it("normalizes start to midnight", () => {
      const start = new Date("2024-06-15T15:34:22Z");
      const { startDate } = getPeriodDates("DAILY", start);
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);
    });
  });

  describe("calculateProgressPercent", () => {
    it("0 of 10 = 0%", () => {
      expect(calculateProgressPercent(0, 10)).toBe(0);
    });

    it("5 of 10 = 50%", () => {
      expect(calculateProgressPercent(5, 10)).toBe(50);
    });

    it("10 of 10 = 100%", () => {
      expect(calculateProgressPercent(10, 10)).toBe(100);
    });

    it("caps at 100% even if over", () => {
      expect(calculateProgressPercent(15, 10)).toBe(100);
    });

    it("handles target 0", () => {
      expect(calculateProgressPercent(5, 0)).toBe(0);
    });

    it("rounds to nearest integer", () => {
      expect(calculateProgressPercent(1, 3)).toBe(33);
      expect(calculateProgressPercent(2, 3)).toBe(67);
    });
  });

  describe("determineStatus", () => {
    const now = new Date("2024-06-15T10:00:00Z");
    const future = new Date("2024-12-31T10:00:00Z");
    const past = new Date("2024-01-01T10:00:00Z");

    it("returns COMPLETED when current >= target", () => {
      expect(determineStatus(10, 10, future, now)).toBe("COMPLETED");
    });

    it("returns EXPIRED when past endDate", () => {
      expect(determineStatus(5, 10, past, now)).toBe("EXPIRED");
    });

    it("returns ACTIVE when in progress and before end", () => {
      expect(determineStatus(5, 10, future, now)).toBe("ACTIVE");
    });
  });

  describe("daysRemaining", () => {
    it("returns 0 for past dates", () => {
      const past = new Date(Date.now() - 5 * 86400000);
      expect(daysRemaining(past)).toBe(0);
    });

    it("returns positive for future dates", () => {
      const future = new Date(Date.now() + 3 * 86400000);
      const days = daysRemaining(future);
      expect(days).toBeGreaterThanOrEqual(2);
      expect(days).toBeLessThanOrEqual(4);
    });
  });

  describe("isOnTrack", () => {
    it("returns true when completed", () => {
      const start = new Date("2024-06-01");
      const end = new Date("2024-06-30");
      const now = new Date("2024-06-15");
      expect(isOnTrack(10, 10, start, end, now)).toBe(true);
    });

    it("returns false when not started", () => {
      const start = new Date("2024-06-15");
      const end = new Date("2024-06-30");
      const now = new Date("2024-06-15");
      expect(isOnTrack(0, 10, start, end, now)).toBe(false);
    });

    it("returns true when on pace", () => {
      // 15 days into 30 day challenge, target 10 books
      // Should be at ~5 books (50% of 10 = 5)
      const start = new Date("2024-06-01");
      const end = new Date("2024-06-30");
      const now = new Date("2024-06-15");
      expect(isOnTrack(5, 10, start, end, now)).toBe(true);
    });

    it("returns false when behind pace", () => {
      // 15 days into 30 day challenge, target 10 books
      // Should be at ~5, but user only has 1
      const start = new Date("2024-06-01");
      const end = new Date("2024-06-30");
      const now = new Date("2024-06-15");
      expect(isOnTrack(1, 10, start, end, now)).toBe(false);
    });

    it("returns true when 80% of expected pace", () => {
      // Halfway through, target 10. Need 5. User has 4 (80%).
      const start = new Date("2024-06-01");
      const end = new Date("2024-06-30");
      const now = new Date("2024-06-15");
      expect(isOnTrack(4, 10, start, end, now)).toBe(true);
    });

    it("returns false when challenge expired and not completed", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-30");
      const now = new Date("2024-02-15");
      expect(isOnTrack(5, 10, start, end, now)).toBe(false);
    });
  });

  describe("getTemplate", () => {
    it("returns matching template", () => {
      const t = getTemplate("BOOK_COUNT");
      expect(t?.title).toBe("Membaca Marathon");
    });

    it("returns undefined for invalid type", () => {
      expect(getTemplate("INVALID" as ChallengeType)).toBeUndefined();
    });
  });

  describe("CHALLENGE_TEMPLATES integrity", () => {
    it("has 6 templates", () => {
      expect(CHALLENGE_TEMPLATES).toHaveLength(6);
    });

    it("all templates have required fields", () => {
      CHALLENGE_TEMPLATES.forEach((t) => {
        expect(t.title).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.icon).toBeTruthy();
        expect(t.color).toBeTruthy();
        expect(t.defaultTarget).toBeGreaterThan(0);
        expect(t.defaultPeriod).toBeTruthy();
      });
    });
  });

  describe("createChallengeFromTemplate", () => {
    it("uses template defaults", () => {
      const c = createChallengeFromTemplate(CHALLENGE_TEMPLATES[0]);
      expect(c.type).toBe("BOOK_COUNT");
      expect(c.target).toBe(10);
      expect(c.period).toBe("MONTHLY");
      expect(c.rewardPoints).toBe(100);
    });

    it("overrides target and reward", () => {
      const c = createChallengeFromTemplate(CHALLENGE_TEMPLATES[0], {
        target: 25,
        rewardPoints: 200,
      });
      expect(c.target).toBe(25);
      expect(c.rewardPoints).toBe(200);
    });

    it("respects custom start date", () => {
      const start = new Date("2024-12-01T00:00:00Z");
      const c = createChallengeFromTemplate(CHALLENGE_TEMPLATES[0], {
        startDate: start,
      });
      expect(c.startDate.getTime()).toBeLessThanOrEqual(start.getTime());
    });

    it("sets isPublic by default to true", () => {
      const c = createChallengeFromTemplate(CHALLENGE_TEMPLATES[0]);
      expect(c.isPublic).toBe(true);
    });
  });
});

describe("reading-challenges: database operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseChallenge: Challenge = {
    id: "ch1",
    title: "Test",
    description: "Test",
    type: "BOOK_COUNT",
    period: "MONTHLY",
    target: 10,
    startDate: new Date("2024-06-01"),
    endDate: new Date("2024-06-30"),
    rewardPoints: 100,
    icon: "BookOpen",
    color: "blue",
    isPublic: true,
  };

  describe("computeChallengeProgress: BOOK_COUNT", () => {
    it("counts returned loans in period", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(7);
      const progress = await computeChallengeProgress("m1", baseChallenge);
      expect(progress.current).toBe(7);
      expect(progress.target).toBe(10);
      expect(progress.percent).toBe(70);
    });

    it("marks COMPLETED when target reached", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(10);
      const progress = await computeChallengeProgress("m1", baseChallenge);
      expect(progress.status).toBe("COMPLETED");
      expect(progress.percent).toBe(100);
    });
  });

  describe("computeChallengeProgress: CATEGORY_DIVERSITY", () => {
    it("counts unique categories", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([
        { bookItem: { book: { categoryId: "c1" } } },
        { bookItem: { book: { categoryId: "c1" } } },
        { bookItem: { book: { categoryId: "c2" } } },
        { bookItem: { book: { categoryId: "c3" } } },
      ] as any);
      const c: Challenge = { ...baseChallenge, type: "CATEGORY_DIVERSITY", target: 3 };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(3);
      expect(progress.percent).toBe(100);
      expect(progress.status).toBe("COMPLETED");
    });

    it("handles null categoryId", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([
        { bookItem: { book: { categoryId: null } } },
        { bookItem: { book: { categoryId: "c1" } } },
      ] as any);
      const c: Challenge = { ...baseChallenge, type: "CATEGORY_DIVERSITY", target: 2 };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(1); // null not counted
    });
  });

  describe("computeChallengeProgress: STREAK", () => {
    it("counts unique days with LOAN_RETURNED txns", async () => {
      vi.mocked(db.pointTransaction.findMany).mockResolvedValue([
        { createdAt: new Date("2024-06-10") },
        { createdAt: new Date("2024-06-10T15:00:00") },
        { createdAt: new Date("2024-06-11") },
        { createdAt: new Date("2024-06-12") },
      ] as any);
      const c: Challenge = { ...baseChallenge, type: "STREAK", target: 3 };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(3); // 3 unique days
      expect(progress.percent).toBe(100);
    });

    it("returns 0 when no transactions", async () => {
      vi.mocked(db.pointTransaction.findMany).mockResolvedValue([]);
      const c: Challenge = { ...baseChallenge, type: "STREAK", target: 3 };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(0);
    });
  });

  describe("computeChallengeProgress: POINTS_EARN", () => {
    it("sums EARN transactions", async () => {
      vi.mocked(db.pointTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 350 },
      } as any);
      const c: Challenge = { ...baseChallenge, type: "POINTS_EARN", target: 500 };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(350);
      expect(progress.percent).toBe(70);
    });

    it("handles null sum", async () => {
      vi.mocked(db.pointTransaction.aggregate).mockResolvedValue({
        _sum: { amount: null },
      } as any);
      const c: Challenge = { ...baseChallenge, type: "POINTS_EARN", target: 500 };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(0);
    });
  });

  describe("computeChallengeProgress: GENRE_EXPLORER", () => {
    it("counts loans in specific category", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(2);
      const c: Challenge = {
        ...baseChallenge,
        type: "GENRE_EXPLORER",
        target: 3,
        targetCategoryId: "cat-fiksi",
      };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(2);
    });

    it("returns 0 if no targetCategoryId", async () => {
      const c: Challenge = {
        ...baseChallenge,
        type: "GENRE_EXPLORER",
        target: 3,
      };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(0);
    });
  });

  describe("computeChallengeProgress: REVIEW_WRITER", () => {
    it("returns 0 (placeholder)", async () => {
      const c: Challenge = { ...baseChallenge, type: "REVIEW_WRITER", target: 5 };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.current).toBe(0);
    });
  });

  describe("computeChallengeProgress: metadata", () => {
    it("includes onTrack analysis", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(3);
      const start = new Date("2024-06-01");
      const end = new Date("2024-06-30");
      // Use a now that's in the past so challenge is active
      const c: Challenge = { ...baseChallenge, target: 6, startDate: start, endDate: end };
      const progress = await computeChallengeProgress("m1", c);
      expect(typeof progress.onTrack).toBe("boolean");
    });

    it("calculates daysLeft for active challenges", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(0);
      const c: Challenge = {
        ...baseChallenge,
        startDate: new Date(Date.now() - 5 * 86400000),
        endDate: new Date(Date.now() + 10 * 86400000),
      };
      const progress = await computeChallengeProgress("m1", c);
      expect(progress.daysLeft).toBeGreaterThan(0);
      expect(progress.daysLeft).toBeLessThanOrEqual(10);
    });

    it("returns null daysLeft for completed", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(10);
      const progress = await computeChallengeProgress("m1", baseChallenge);
      expect(progress.status).toBe("COMPLETED");
      expect(progress.daysLeft).toBeNull();
    });

    it("sets completedAt when completed", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(15);
      const progress = await computeChallengeProgress("m1", baseChallenge);
      expect(progress.completedAt).not.toBeNull();
    });

    it("completedAt is null for active", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(5);
      const progress = await computeChallengeProgress("m1", baseChallenge);
      expect(progress.completedAt).toBeNull();
    });
  });
});

describe("reading-challenges: formatting", () => {
  const sampleChallenge: Challenge = {
    id: "ch1",
    title: "Marathon",
    description: "Test",
    type: "BOOK_COUNT",
    period: "MONTHLY",
    target: 10,
    startDate: new Date("2024-06-01"),
    endDate: new Date("2024-06-30"),
    rewardPoints: 100,
    icon: "BookOpen",
    color: "blue",
    isPublic: true,
  };

  describe("formatChallengeSummary", () => {
    it("formats ACTIVE status with days left", () => {
      const summary = formatChallengeSummary(sampleChallenge, {
        challengeId: "ch1",
        memberId: "m1",
        current: 5,
        target: 10,
        percent: 50,
        status: "ACTIVE",
        startedAt: new Date(),
        completedAt: null,
        daysLeft: 10,
        onTrack: true,
      });
      expect(summary.title).toBe("Marathon");
      expect(summary.status).toBe("Aktif");
      expect(summary.message).toContain("5/10");
      expect(summary.message).toContain("10 hari");
    });

    it("formats COMPLETED status", () => {
      const summary = formatChallengeSummary(sampleChallenge, {
        challengeId: "ch1",
        memberId: "m1",
        current: 10,
        target: 10,
        percent: 100,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        daysLeft: null,
        onTrack: true,
      });
      expect(summary.status).toBe("Selesai");
      expect(summary.message).toContain("🎉");
    });

    it("formats EXPIRED status", () => {
      const summary = formatChallengeSummary(sampleChallenge, {
        challengeId: "ch1",
        memberId: "m1",
        current: 3,
        target: 10,
        percent: 30,
        status: "EXPIRED",
        startedAt: new Date(),
        completedAt: null,
        daysLeft: null,
        onTrack: false,
      });
      expect(summary.status).toBe("Berakhir");
      expect(summary.message).toContain("3/10");
    });

    it("picks emoji based on color", () => {
      const colors: Array<[string, string]> = [
        ["blue", "📘"],
        ["emerald", "🌿"],
        ["orange", "🔥"],
        ["amber", "🏆"],
        ["violet", "✨"],
        ["rose", "💬"],
      ];
      colors.forEach(([color, emoji]) => {
        const c = { ...sampleChallenge, color };
        const summary = formatChallengeSummary(c, {
          challengeId: "ch1",
          memberId: "m1",
          current: 5,
          target: 10,
          percent: 50,
          status: "ACTIVE",
          startedAt: new Date(),
          completedAt: null,
          daysLeft: 10,
          onTrack: true,
        });
        expect(summary.emoji).toBe(emoji);
      });
    });
  });
});
