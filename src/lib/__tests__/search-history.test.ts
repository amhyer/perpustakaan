/**
 * Unit tests untuk search history library.
 *
 * Sprint K Phase C.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Setup localStorage mock
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

const USER_ID = "user-123";

describe("search-history: trackSearch", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("adds new query", () => {
    trackSearch(USER_ID, "katalog");
    const history = getSearchHistory(USER_ID);
    expect(history.length).toBe(1);
    expect(history[0].query).toBe("katalog");
    expect(history[0].count).toBe(1);
  });

  it("ignores empty query", () => {
    trackSearch(USER_ID, "");
    trackSearch(USER_ID, "   ");
    expect(getSearchHistory(USER_ID).length).toBe(0);
  });

  it("ignores single character query", () => {
    trackSearch(USER_ID, "a");
    expect(getSearchHistory(USER_ID).length).toBe(0);
  });

  it("normalizes query (lowercase, trim)", () => {
    trackSearch(USER_ID, "  KATALOG  ");
    const history = getSearchHistory(USER_ID);
    expect(history[0].query).toBe("katalog");
  });

  it("deduplicates same query (case-insensitive)", () => {
    trackSearch(USER_ID, "katalog");
    trackSearch(USER_ID, "KATALOG");
    trackSearch(USER_ID, "Katalog");
    const history = getSearchHistory(USER_ID);
    expect(history.length).toBe(1);
    expect(history[0].count).toBe(3);
  });

  it("moves duplicate to top", () => {
    trackSearch(USER_ID, "first");
    trackSearch(USER_ID, "second");
    trackSearch(USER_ID, "first");
    const history = getSearchHistory(USER_ID);
    expect(history[0].query).toBe("first");
    expect(history[1].query).toBe("second");
  });

  it("limits to MAX_HISTORY", () => {
    for (let i = 0; i < 15; i++) {
      trackSearch(USER_ID, `query${i}`);
    }
    const history = getSearchHistory(USER_ID);
    expect(history.length).toBe(10);
    // Most recent first
    expect(history[0].query).toBe("query14");
  });
});

describe("search-history: getFrequentSearches", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("sorts by count descending", () => {
    trackSearch(USER_ID, "popular");
    trackSearch(USER_ID, "popular");
    trackSearch(USER_ID, "popular");
    trackSearch(USER_ID, "rare");
    const frequent = getFrequentSearches(USER_ID);
    expect(frequent[0].query).toBe("popular");
    expect(frequent[0].count).toBe(3);
  });

  it("respects limit", () => {
    for (let i = 0; i < 10; i++) {
      trackSearch(USER_ID, `q${i}`);
    }
    const frequent = getFrequentSearches(USER_ID, 3);
    expect(frequent.length).toBe(3);
  });

  it("returns empty for no history", () => {
    expect(getFrequentSearches(USER_ID)).toEqual([]);
  });
});

describe("search-history: getRecentSearches", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("returns most recent first", () => {
    trackSearch(USER_ID, "old");
    trackSearch(USER_ID, "new");
    const recent = getRecentSearches(USER_ID);
    expect(recent[0].query).toBe("new");
    expect(recent[1].query).toBe("old");
  });

  it("respects limit", () => {
    for (let i = 0; i < 10; i++) {
      trackSearch(USER_ID, `q${i}`);
    }
    const recent = getRecentSearches(USER_ID, 3);
    expect(recent.length).toBe(3);
  });
});

describe("search-history: clearSearchHistory", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("removes all entries", () => {
    trackSearch(USER_ID, "a");
    trackSearch(USER_ID, "b");
    clearSearchHistory(USER_ID);
    expect(getSearchHistory(USER_ID)).toEqual([]);
  });
});

describe("search-history: deleteSearchEntry", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("removes specific entry", () => {
    trackSearch(USER_ID, "keep");
    trackSearch(USER_ID, "remove");
    deleteSearchEntry(USER_ID, "remove");
    const history = getSearchHistory(USER_ID);
    expect(history.length).toBe(1);
    expect(history[0].query).toBe("keep");
  });

  it("case-insensitive delete", () => {
    trackSearch(USER_ID, "katalog");
    deleteSearchEntry(USER_ID, "KATALOG");
    expect(getSearchHistory(USER_ID).length).toBe(0);
  });
});

describe("search-history: getSearchSuggestions", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("returns queries starting with input", () => {
    trackSearch(USER_ID, "katalog");
    trackSearch(USER_ID, "kategori");
    trackSearch(USER_ID, "buku");
    const suggestions = getSearchSuggestions(USER_ID, "kat");
    expect(suggestions).toContain("katalog");
    expect(suggestions).toContain("kategori");
    expect(suggestions).not.toContain("buku");
  });

  it("returns empty for too-short input", () => {
    trackSearch(USER_ID, "katalog");
    expect(getSearchSuggestions(USER_ID, "k")).toEqual([]);
  });

  it("returns empty for no match", () => {
    trackSearch(USER_ID, "katalog");
    expect(getSearchSuggestions(USER_ID, "xyz")).toEqual([]);
  });
});

describe("search-history: getSearchHistoryStats", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("returns aggregated stats", () => {
    trackSearch(USER_ID, "popular");
    trackSearch(USER_ID, "popular");
    trackSearch(USER_ID, "popular");
    trackSearch(USER_ID, "rare");
    const stats = getSearchHistoryStats(USER_ID);
    expect(stats.total).toBe(2);
    expect(stats.totalCount).toBe(4);
    expect(stats.topQuery).toBe("popular");
  });

  it("returns zeros for empty", () => {
    const stats = getSearchHistoryStats(USER_ID);
    expect(stats.total).toBe(0);
    expect(stats.totalCount).toBe(0);
    expect(stats.topQuery).toBeNull();
  });
});

describe("search-history: per-user isolation", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("isolates history per user", () => {
    trackSearch("user-A", "a-query");
    trackSearch("user-B", "b-query");
    expect(getSearchHistory("user-A").length).toBe(1);
    expect(getSearchHistory("user-B").length).toBe(1);
    expect(getSearchHistory("user-A")[0].query).toBe("a-query");
    expect(getSearchHistory("user-B")[0].query).toBe("b-query");
  });
});
