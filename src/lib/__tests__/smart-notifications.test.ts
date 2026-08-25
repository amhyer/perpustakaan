/**
 * Tests for smart notification triggers.
 *
 * Sprint N - Tier 1 #3: Smart notification system.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockNotify = vi.fn();
vi.mock("@/lib/notification-service", () => ({
  notify: (...args: any[]) => mockNotify(...args),
}));

vi.mock("../db", () => ({
  db: {
    member: { findUnique: vi.fn(), findMany: vi.fn() },
    book: { findUnique: vi.fn() },
    reservation: { findUnique: vi.fn() },
    pointTransaction: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  sendSmartNotification,
  triggerBookAvailable,
  triggerWishlistAvailable,
  triggerSimilarUsersLike,
  triggerStreakReminder,
  triggerLevelUp,
  triggerBadgeEarned,
  triggerPopularNow,
  triggerNewFavoriteAuthor,
  detectStreakAtRisk,
  getUserPreferences,
  _resetState,
  DEFAULT_PREFERENCES,
  type SmartNotificationPreferences,
  type SmartNotificationType,
} from "../smart-notifications";

describe("smart-notifications: pure functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetState();
  });

  describe("DEFAULT_PREFERENCES", () => {
    it("has master enabled=true", () => {
      expect(DEFAULT_PREFERENCES.enabled).toBe(true);
    });

    it("all trigger types are defined", () => {
      const types: SmartNotificationType[] = [
        "BOOK_AVAILABLE",
        "NEW_FAVORITE_AUTHOR",
        "WISHLIST_AVAILABLE",
        "SIMILAR_USERS_LIKE",
        "DUE_SOON_REMINDER",
        "OVERDUE_NUDGE",
        "STREAK_REMINDER",
        "LEVEL_UP",
        "BADGE_EARNED",
        "CHALLENGE_COMPLETE",
        "POPULAR_NOW",
        "RECOMMENDATION",
      ];
      types.forEach((t) => {
        expect(DEFAULT_PREFERENCES.triggers[t]).toBeDefined();
      });
    });

    it("POPULAR_NOW is opt-in (false by default)", () => {
      expect(DEFAULT_PREFERENCES.triggers.POPULAR_NOW).toBe(false);
    });
  });

  describe("getUserPreferences", () => {
    it("returns defaults when no stored prefs", () => {
      const prefs = getUserPreferences();
      expect(prefs.enabled).toBe(true);
      expect(prefs.maxPerDay).toBe(10);
    });

    it("merges stored overrides", () => {
      const prefs = getUserPreferences({ maxPerDay: 5 });
      expect(prefs.maxPerDay).toBe(5);
      expect(prefs.enabled).toBe(true); // other defaults preserved
    });

    it("merges trigger overrides", () => {
      const prefs = getUserPreferences({
        triggers: { POPULAR_NOW: true, LEVEL_UP: false },
      });
      expect(prefs.triggers.POPULAR_NOW).toBe(true);
      expect(prefs.triggers.LEVEL_UP).toBe(false);
      // Other triggers still use defaults
      expect(prefs.triggers.STREAK_REMINDER).toBe(true);
    });
  });

  describe("sendSmartNotification: throttling", () => {
    it("sends when enabled and within limits", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      const result = await sendSmartNotification({
        userId: "u1",
        type: "BOOK_AVAILABLE",
        dedupeKey: "key1",
        title: "Test",
        message: "Test",
      });
      expect(result.sent).toBe(true);
      expect(mockNotify).toHaveBeenCalled();
    });

    it("rejects when master switch disabled", async () => {
      const result = await sendSmartNotification({
        userId: "u1",
        type: "BOOK_AVAILABLE",
        dedupeKey: "key1",
        title: "Test",
        message: "Test",
        preferences: { ...DEFAULT_PREFERENCES, enabled: false },
      });
      expect(result.sent).toBe(false);
      expect(result.reason).toBe("notifications_disabled");
    });

    it("rejects when specific trigger disabled", async () => {
      const result = await sendSmartNotification({
        userId: "u1",
        type: "POPULAR_NOW",
        dedupeKey: "key1",
        title: "Test",
        message: "Test",
        preferences: {
          ...DEFAULT_PREFERENCES,
          triggers: { ...DEFAULT_PREFERENCES.triggers, POPULAR_NOW: false },
        },
      });
      expect(result.sent).toBe(false);
      expect(result.reason).toBe("trigger_disabled");
    });

    it("deduplicates same key within 24h", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      const opts = {
        userId: "u1",
        type: "BOOK_AVAILABLE" as const,
        dedupeKey: "duplicate-key",
        title: "Test",
        message: "Test",
      };

      const r1 = await sendSmartNotification(opts);
      expect(r1.sent).toBe(true);

      const r2 = await sendSmartNotification(opts);
      expect(r2.sent).toBe(false);
      expect(r2.reason).toBe("duplicate");
    });

    it("rate limits to maxPerDay", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      const prefs: SmartNotificationPreferences = {
        ...DEFAULT_PREFERENCES,
        maxPerDay: 3,
      };

      // First 3 succeed
      for (let i = 0; i < 3; i++) {
        const r = await sendSmartNotification({
          userId: "u1",
          type: "RECOMMENDATION",
          dedupeKey: `key-${i}`,
          title: "Test",
          message: "Test",
          preferences: prefs,
        });
        expect(r.sent).toBe(true);
      }

      // 4th is rate limited
      const r4 = await sendSmartNotification({
        userId: "u1",
        type: "RECOMMENDATION",
        dedupeKey: "key-4",
        title: "Test",
        message: "Test",
        preferences: prefs,
      });
      expect(r4.sent).toBe(false);
      expect(r4.reason).toBe("rate_limited");
    });

    it("respects quiet hours when enabled", async () => {
      // Mock Date to 22:00 UTC = 06:00 UTC+8 (within quiet hours 22-07)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T22:00:00Z"));

      const prefs: SmartNotificationPreferences = {
        ...DEFAULT_PREFERENCES,
        quietHoursEnabled: true,
        quietHoursStart: 22,
        quietHoursEnd: 7,
      };

      const result = await sendSmartNotification({
        userId: "u1",
        type: "BOOK_AVAILABLE",
        dedupeKey: "key-quiet",
        title: "Test",
        message: "Test",
        preferences: prefs,
      });
      expect(result.sent).toBe(false);
      expect(result.reason).toBe("quiet_hours");

      vi.useRealTimers();
    });

    it("does NOT block when quiet hours disabled", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      const prefs: SmartNotificationPreferences = {
        ...DEFAULT_PREFERENCES,
        quietHoursEnabled: false,
      };

      const result = await sendSmartNotification({
        userId: "u1",
        type: "BOOK_AVAILABLE",
        dedupeKey: "key-noquiet",
        title: "Test",
        message: "Test",
        preferences: prefs,
      });
      expect(result.sent).toBe(true);
    });
  });

  describe("sendSmartNotification: notification type mapping", () => {
    it("OVERDUE_NUDGE maps to OVERDUE type", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      await sendSmartNotification({
        userId: "u1",
        type: "OVERDUE_NUDGE",
        dedupeKey: "k1",
        title: "T",
        message: "M",
      });
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OVERDUE" })
      );
    });

    it("DUE_SOON_REMINDER maps to DUE_DATE type", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      await sendSmartNotification({
        userId: "u1",
        type: "DUE_SOON_REMINDER",
        dedupeKey: "k1",
        title: "T",
        message: "M",
      });
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "DUE_DATE" })
      );
    });

    it("LEVEL_UP maps to ANNOUNCEMENT type", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      await sendSmartNotification({
        userId: "u1",
        type: "LEVEL_UP",
        dedupeKey: "k1",
        title: "T",
        message: "M",
      });
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ANNOUNCEMENT" })
      );
    });

    it("BOOK_AVAILABLE maps to INFO type", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      await sendSmartNotification({
        userId: "u1",
        type: "BOOK_AVAILABLE",
        dedupeKey: "k1",
        title: "T",
        message: "M",
      });
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "INFO" })
      );
    });
  });
});

describe("smart-notifications: trigger functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetState();
  });

  describe("triggerBookAvailable", () => {
    it("looks up reservation and sends notification", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      vi.mocked(db.reservation.findUnique).mockResolvedValue({
        id: "r1",
        member: { user: { id: "u1" } },
        book: { title: "Buku A" },
        expiresAt: new Date("2024-12-31"),
      } as any);

      await triggerBookAvailable("r1");
      // type passed to notify is the mapped type (INFO), not the smart type
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u1",
          type: "INFO",
        })
      );
    });

    it("handles missing reservation gracefully", async () => {
      vi.mocked(db.reservation.findUnique).mockResolvedValue(null);
      await triggerBookAvailable("nonexistent");
      expect(mockNotify).not.toHaveBeenCalled();
    });
  });

  describe("triggerWishlistAvailable", () => {
    it("sends notification for member", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      vi.mocked(db.member.findUnique).mockResolvedValue({
        user: { id: "u1" },
      } as any);
      vi.mocked(db.book.findUnique).mockResolvedValue({
        title: "Wishlist Book",
      } as any);

      await triggerWishlistAvailable("m1", "b1");
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u1",
          type: "INFO",
        })
      );
    });

    it("skips when member not found", async () => {
      vi.mocked(db.member.findUnique).mockResolvedValue(null);
      await triggerWishlistAvailable("m1", "b1");
      expect(mockNotify).not.toHaveBeenCalled();
    });
  });

  describe("triggerSimilarUsersLike", () => {
    it("skips if similarCount < 2", async () => {
      await triggerSimilarUsersLike("m1", "b1", 1);
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("sends notification when enough similar users", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      vi.mocked(db.member.findUnique).mockResolvedValue({
        user: { id: "u1" },
      } as any);
      vi.mocked(db.book.findUnique).mockResolvedValue({
        title: "Popular Book",
      } as any);

      await triggerSimilarUsersLike("m1", "b1", 5);
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "INFO" })
      );
    });
  });

  describe("triggerStreakReminder", () => {
    it("skips for short streaks", async () => {
      await triggerStreakReminder("m1", 2);
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("sends for 3+ day streaks", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      vi.mocked(db.member.findUnique).mockResolvedValue({
        user: { id: "u1" },
      } as any);

      await triggerStreakReminder("m1", 5);
      // STREAK_REMINDER maps to ANNOUNCEMENT
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ANNOUNCEMENT" })
      );
    });
  });

  describe("triggerLevelUp", () => {
    it("sends level-up notification with perks", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      vi.mocked(db.member.findUnique).mockResolvedValue({
        user: { id: "u1" },
      } as any);

      await triggerLevelUp("m1", "Kutu Buku", ["+20% poin", "Pinjam 5 buku"]);
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ANNOUNCEMENT",
          title: expect.stringContaining("Naik Level"),
        })
      );
    });
  });

  describe("triggerBadgeEarned", () => {
    it("sends badge notification", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      vi.mocked(db.member.findUnique).mockResolvedValue({
        user: { id: "u1" },
      } as any);

      await triggerBadgeEarned("m1", "Kutu Buku");
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ANNOUNCEMENT" })
      );
    });
  });

  describe("triggerPopularNow", () => {
    it("skips for low popularity", async () => {
      await triggerPopularNow("m1", "b1", 3);
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("sends for popular books (5+ loans) when enabled", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      vi.mocked(db.member.findUnique).mockResolvedValue({
        user: { id: "u1" },
      } as any);
      vi.mocked(db.book.findUnique).mockResolvedValue({
        title: "Trending Book",
      } as any);

      // POPULAR_NOW is opt-in by default
      await triggerPopularNow("m1", "b1", 10, {
        ...DEFAULT_PREFERENCES,
        triggers: { ...DEFAULT_PREFERENCES.triggers, POPULAR_NOW: true },
      });
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "INFO" })
      );
    });

    it("respects POPULAR_NOW disabled preference", async () => {
      await triggerPopularNow("m1", "b1", 10);
      // Should not send because POPULAR_NOW is opt-in (false)
      expect(mockNotify).not.toHaveBeenCalled();
    });
  });

  describe("triggerNewFavoriteAuthor", () => {
    it("sends notification for new book by favorite author", async () => {
      mockNotify.mockResolvedValue({ inApp: true });
      vi.mocked(db.member.findUnique).mockResolvedValue({
        user: { id: "u1" },
      } as any);
      vi.mocked(db.book.findUnique).mockResolvedValue({
        title: "New Book",
      } as any);

      await triggerNewFavoriteAuthor("m1", "b1", "Andrea Hirata");
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: "INFO" })
      );
    });
  });
});

describe("smart-notifications: detectStreakAtRisk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetState();
  });

  it("notifies members with active streaks who haven't read today", async () => {
    mockNotify.mockResolvedValue({ inApp: true });
    vi.mocked(db.member.findMany).mockResolvedValue([
      { id: "m1", user: { id: "u1" } },
      { id: "m2", user: { id: "u2" } },
    ] as any);
    // m1 already read today
    vi.mocked(db.pointTransaction.findFirst).mockResolvedValueOnce({ id: "t1" } as any);
    // m2 hasn't read today, has 5-day streak ending yesterday
    vi.mocked(db.pointTransaction.findFirst).mockResolvedValueOnce(null);
    const yesterday = new Date(Date.now() - 86400000);
    // m1 skips findMany (already read), so the first findMany call is for m2
    vi.mocked(db.pointTransaction.findMany).mockResolvedValueOnce([
      { createdAt: yesterday },
      { createdAt: new Date(yesterday.getTime() - 86400000) },
      { createdAt: new Date(yesterday.getTime() - 2 * 86400000) },
      { createdAt: new Date(yesterday.getTime() - 3 * 86400000) },
      { createdAt: new Date(yesterday.getTime() - 4 * 86400000) },
    ] as any);

    const result = await detectStreakAtRisk();
    expect(result.notified).toBe(1);
  });

  it("returns 0 when no members have active streaks", async () => {
    vi.mocked(db.member.findMany).mockResolvedValue([]);
    const result = await detectStreakAtRisk();
    expect(result.notified).toBe(0);
  });
});
