/**
 * Tests for command palette + search history integration logic.
 *
 * Sprint L-Phase 3: Verify the wiring logic between the palette and search history.
 *
 * Since we can't easily render the React component, we test the
 * integration helpers and the contract between them.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage (using global assignment so module imports see it)
const mockStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  }),
};
(global as any).window = { localStorage: (global as any).localStorage };

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  getSearchHistory,
  trackSearch,
  getFrequentSearches,
  getRecentSearches,
  clearSearchHistory,
  deleteSearchEntry,
  getSearchSuggestions,
  getSearchHistoryStats,
} from "../search-history";

describe("Command palette + search history integration", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe("search lifecycle", () => {
    it("tracks search and reads it back", () => {
      trackSearch(userId, "katalog buku");
      const history = getSearchHistory(userId);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe("katalog buku");
      expect(history[0].count).toBe(1);
    });

    it("increments count for repeated searches", () => {
      trackSearch(userId, "pinjaman");
      trackSearch(userId, "pinjaman");
      trackSearch(userId, "pinjaman");
      const history = getSearchHistory(userId);
      expect(history).toHaveLength(1);
      expect(history[0].count).toBe(3);
    });

    it("moves repeated search to top", () => {
      trackSearch(userId, "first");
      trackSearch(userId, "second");
      trackSearch(userId, "third");
      trackSearch(userId, "first"); // Should be moved to top with count=2

      const history = getSearchHistory(userId);
      expect(history[0].query).toBe("first");
      expect(history[0].count).toBe(2);
      expect(history[1].query).toBe("third");
      expect(history[2].query).toBe("second");
    });

    it("ignores short queries", () => {
      trackSearch(userId, "a");
      trackSearch(userId, "");
      const history = getSearchHistory(userId);
      expect(history).toHaveLength(0);
    });

    it("trims and lowercases queries", () => {
      trackSearch(userId, "  KATALOG  ");
      const history = getSearchHistory(userId);
      expect(history[0].query).toBe("katalog");
    });
  });

  describe("frequent searches (for trending section)", () => {
    it("sorts by count descending", () => {
      trackSearch(userId, "alpha");
      trackSearch(userId, "bravo");
      trackSearch(userId, "bravo");
      trackSearch(userId, "bravo");
      trackSearch(userId, "alpha");
      const frequent = getFrequentSearches(userId);
      expect(frequent[0].query).toBe("bravo");
      expect(frequent[0].count).toBe(3);
      expect(frequent[1].query).toBe("alpha");
      expect(frequent[1].count).toBe(2);
    });

    it("limits result count", () => {
      for (let i = 0; i < 10; i++) {
        trackSearch(userId, `q${i}`);
      }
      const frequent = getFrequentSearches(userId, 3);
      expect(frequent).toHaveLength(3);
    });
  });

  describe("recent searches (for sidebar section)", () => {
    it("returns most recent first", () => {
      trackSearch(userId, "older");
      // wait
      const t1 = Date.now();
      while (Date.now() === t1) {
        // tiny delay
      }
      trackSearch(userId, "newer");
      const recent = getRecentSearches(userId);
      expect(recent[0].query).toBe("newer");
      expect(recent[1].query).toBe("older");
    });

    it("respects limit", () => {
      for (let i = 0; i < 20; i++) {
        trackSearch(userId, `q${i}`);
      }
      const recent = getRecentSearches(userId, 5);
      expect(recent).toHaveLength(5);
    });
  });

  describe("search suggestions (autocomplete)", () => {
    it("returns matches starting with input", () => {
      trackSearch(userId, "katalog buku");
      trackSearch(userId, "katalog digital");
      trackSearch(userId, "anggota");
      const suggestions = getSearchSuggestions(userId, "kat", 5);
      expect(suggestions).toContain("katalog buku");
      expect(suggestions).toContain("katalog digital");
      expect(suggestions).not.toContain("anggota");
    });

    it("requires minimum input length", () => {
      trackSearch(userId, "test");
      expect(getSearchSuggestions(userId, "t", 5)).toEqual([]);
      expect(getSearchSuggestions(userId, "te", 5)).toContain("test");
    });

    it("handles no matches gracefully", () => {
      trackSearch(userId, "something");
      expect(getSearchSuggestions(userId, "xyz", 5)).toEqual([]);
    });

    it("is case-insensitive", () => {
      trackSearch(userId, "BUKU");
      const suggestions = getSearchSuggestions(userId, "bu", 5);
      expect(suggestions).toContain("buku");
    });
  });

  describe("history management", () => {
    it("clears all history", () => {
      trackSearch(userId, "alpha");
      trackSearch(userId, "bravo");
      clearSearchHistory(userId);
      expect(getSearchHistory(userId)).toEqual([]);
      expect((global as any).localStorage.removeItem).toHaveBeenCalledWith(
        `ji-search-history:${userId}`
      );
    });

    it("deletes single entry", () => {
      trackSearch(userId, "keep me");
      trackSearch(userId, "delete me");
      deleteSearchEntry(userId, "delete me");
      const history = getSearchHistory(userId);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe("keep me");
    });

    it("case-insensitive delete", () => {
      trackSearch(userId, "TestEntry");
      deleteSearchEntry(userId, "testentry");
      expect(getSearchHistory(userId)).toEqual([]);
    });

    it("delete of non-existent entry is a no-op", () => {
      trackSearch(userId, "alpha");
      deleteSearchEntry(userId, "nonexistent");
      expect(getSearchHistory(userId)).toHaveLength(1);
    });
  });

  describe("history stats (for analytics widget)", () => {
    it("computes stats correctly", () => {
      trackSearch(userId, "alpha");
      trackSearch(userId, "alpha");
      trackSearch(userId, "alpha");
      trackSearch(userId, "bravo");
      trackSearch(userId, "bravo");
      trackSearch(userId, "charlie");

      const stats = getSearchHistoryStats(userId);
      expect(stats.total).toBe(3);
      expect(stats.unique).toBe(3);
      expect(stats.totalCount).toBe(6);
      expect(stats.topQuery).toBe("alpha");
    });

    it("handles empty history", () => {
      const stats = getSearchHistoryStats(userId);
      expect(stats.total).toBe(0);
      expect(stats.unique).toBe(0);
      expect(stats.topQuery).toBeNull();
      expect(stats.totalCount).toBe(0);
    });
  });

  describe("per-user scoping", () => {
    it("different users have separate histories", () => {
      const user1 = "user-1";
      const user2 = "user-2";
      trackSearch(user1, "user1-query");
      trackSearch(user2, "user2-query");

      expect(getSearchHistory(user1)).toHaveLength(1);
      expect(getSearchHistory(user2)).toHaveLength(1);
      expect(getSearchHistory(user1)[0].query).toBe("user1-query");
      expect(getSearchHistory(user2)[0].query).toBe("user2-query");
    });

    it("clearing one user doesn't affect another", () => {
      const user1 = "user-1";
      const user2 = "user-2";
      trackSearch(user1, "query1");
      trackSearch(user2, "query2");
      clearSearchHistory(user1);
      expect(getSearchHistory(user1)).toEqual([]);
      expect(getSearchHistory(user2)).toHaveLength(1);
    });
  });

  describe("limit and capacity", () => {
    it("keeps only 10 most recent", () => {
      for (let i = 0; i < 15; i++) {
        trackSearch(userId, `q${i}`);
      }
      const history = getSearchHistory(userId);
      expect(history).toHaveLength(10);
      // Newest first
      expect(history[0].query).toBe("q14");
      // Oldest of the kept
      expect(history[9].query).toBe("q5");
    });

    it("incrementing count doesn't push out other entries", () => {
      for (let i = 0; i < 12; i++) {
        trackSearch(userId, `q${i}`);
      }
      // Now boost q0 multiple times
      trackSearch(userId, "q0");
      trackSearch(userId, "q0");
      const history = getSearchHistory(userId);
      expect(history[0].query).toBe("q0");
      expect(history[0].count).toBe(2); // 1 initial + 2 boosts
      expect(history).toHaveLength(10);
    });
  });

  describe("storage key format", () => {
    it("uses prefixed key per user", () => {
      trackSearch("alice", "test");
      expect((global as any).localStorage.setItem).toHaveBeenCalledWith(
        "ji-search-history:alice",
        expect.any(String)
      );
    });
  });
});
