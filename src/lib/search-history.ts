/**
 * Search History — Track user searches for personalization.
 *
 * Sprint K Phase C - Search history & discoverability.
 *
 * Features:
 * - Track search queries (Command Palette + sidebar search)
 * - Deduplicate (same query = move to top)
 * - Limit to 10 most recent
 * - Persist to localStorage per user
 * - Clear history action
 * - Frequent queries boosted in command palette
 *
 * Privacy:
 * - Per-user (scoped by userId)
 * - Client-side only (no server tracking)
 * - Easy to clear
 */

import { logger } from "@/lib/logger";

// ===== Types =====

export interface SearchEntry {
  query: string;
  timestamp: number;
  count: number; // How many times searched
}

const MAX_HISTORY = 10;
const STORAGE_KEY_PREFIX = "ji-search-history";

// ===== Public API =====

/**
 * Get all search history for a user.
 */
export function getSearchHistory(userId: string): SearchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${userId}`);
    if (!stored) return [];
    return JSON.parse(stored) as SearchEntry[];
  } catch {
    return [];
  }
}

/**
 * Add or update a search query.
 * Same query is moved to top with count incremented.
 */
export function trackSearch(userId: string, query: string): void {
  if (typeof window === "undefined") return;
  if (!query || !query.trim() || query.length < 2) return;

  const cleanQuery = query.trim().toLowerCase();
  const history = getSearchHistory(userId);

  // Remove existing entry (case-insensitive match)
  const filtered = history.filter(
    (entry) => entry.query.toLowerCase() !== cleanQuery
  );

  // Add new entry at front
  const newEntry: SearchEntry = {
    query: cleanQuery,
    timestamp: Date.now(),
    count: 1,
  };

  // If was previously searched, increment count
  const existing = history.find(
    (e) => e.query.toLowerCase() === cleanQuery
  );
  if (existing) {
    newEntry.count = existing.count + 1;
  }

  const next = [newEntry, ...filtered].slice(0, MAX_HISTORY);
  saveHistory(userId, next);
}

/**
 * Get most frequent search queries.
 * Useful untuk "trending searches" atau "popular searches".
 */
export function getFrequentSearches(
  userId: string,
  limit: number = 5
): SearchEntry[] {
  const history = getSearchHistory(userId);
  return [...history]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get recent search queries.
 * Useful untuk command palette "Recent searches" section.
 */
export function getRecentSearches(
  userId: string,
  limit: number = 5
): SearchEntry[] {
  const history = getSearchHistory(userId);
  return history.slice(0, limit);
}

/**
 * Clear all search history for a user.
 */
export function clearSearchHistory(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${userId}`);
  } catch {
    // ignore
  }
  logger.info("Search history cleared", { userId });
}

/**
 * Delete a single search entry.
 */
export function deleteSearchEntry(userId: string, query: string): void {
  if (typeof window === "undefined") return;
  const history = getSearchHistory(userId);
  const next = history.filter((e) => e.query.toLowerCase() !== query.toLowerCase());
  saveHistory(userId, next);
}

/**
 * Get search suggestions based on history.
 * Returns queries that start with the input.
 */
export function getSearchSuggestions(
  userId: string,
  input: string,
  limit: number = 5
): string[] {
  if (!input || input.length < 2) return [];
  const history = getSearchHistory(userId);
  const lower = input.toLowerCase();
  return history
    .filter((e) => e.query.startsWith(lower))
    .slice(0, limit)
    .map((e) => e.query);
}

// ===== Helpers =====

function saveHistory(userId: string, history: SearchEntry[]): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}:${userId}`,
      JSON.stringify(history)
    );
  } catch (err) {
    logger.warn("Failed to save search history", { error: String(err) });
  }
}

/**
 * Get aggregated stats for analytics (optional).
 */
export function getSearchHistoryStats(userId: string): {
  total: number;
  unique: number;
  topQuery: string | null;
  totalCount: number;
} {
  const history = getSearchHistory(userId);
  const totalCount = history.reduce((sum, e) => sum + e.count, 0);
  const top = [...history].sort((a, b) => b.count - a.count)[0];
  return {
    total: history.length,
    unique: history.length,
    topQuery: top?.query || null,
    totalCount,
  };
}
