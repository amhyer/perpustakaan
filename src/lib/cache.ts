/**
 * In-memory TTL cache untuk data yang jarang berubah.
 *
 * Usage:
 *   const cached = cache.get<{data: string}>("key");
 *   if (cached) return Response.json(cached);
 *   const fresh = await fetchExpensiveData();
 *   cache.set("key", fresh, 60_000); // 1 menit
 *   return Response.json(fresh);
 *
 * Untuk multi-instance production, ganti dengan Redis (Upstash dll).
 * Interface tetap sama.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  // Optional tags untuk invalidation
  tags?: string[];
}

class TTLCache {
  private store = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>(); // tag → set of keys

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      // Cleanup tag index
      if (entry.tags) {
        for (const tag of entry.tags) {
          this.tagIndex.get(tag)?.delete(key);
        }
      }
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number, tags: string[] = []): void {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
      tags,
    };
    this.store.set(key, entry);
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }
  }

  /**
   * Invalidate by key
   */
  invalidate(key: string): void {
    const entry = this.store.get(key);
    if (entry?.tags) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }
    this.store.delete(key);
  }

  /**
   * Invalidate by tag — useful saat ada mutasi yang affect banyak data
   */
  invalidateTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (!keys) return;
    for (const key of keys) {
      this.store.delete(key);
    }
    this.tagIndex.delete(tag);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
    this.tagIndex.clear();
  }

  /**
   * Stats untuk monitoring
   */
  stats() {
    return {
      size: this.store.size,
      tags: Array.from(this.tagIndex.keys()),
    };
  }
}

// Global singleton (satu instance per proses)
const globalForCache = globalThis as unknown as { __cache: TTLCache | undefined };
export const cache = globalForCache.__cache ?? new TTLCache();
if (process.env.NODE_ENV !== "production") globalForCache.__cache = cache;

// Preset TTL (ms)
export const CACHE_TTL = {
  ONE_MINUTE: 60_000,
  FIVE_MINUTES: 5 * 60_000,
  FIFTEEN_MINUTES: 15 * 60_000,
  ONE_HOUR: 60 * 60_000,
  ONE_DAY: 24 * 60_60_000,
} as const;

// Cache tags untuk invalidation
export const CACHE_TAGS = {
  STATS: "stats",
  CATEGORIES: "categories",
  LOCATIONS: "locations",
  SETTINGS: "settings",
  BOOKS: "books",
  MEMBERS: "members",
  LOANS: "loans",
  ROOMS: "rooms",
  VISITORS: "visitors",
} as const;
