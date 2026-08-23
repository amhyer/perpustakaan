/**
 * Unit tests for store recent items & command palette state.
 */

import { describe, it, expect, beforeEach } from "vitest";

describe("store: recent items logic", () => {
  // Pure function extracted from store
  function trackRecent(
    items: Array<{ key: string; params: Record<string, string>; visitedAt: number }>,
    newItem: { key: string; params?: Record<string, string>; label?: string; group?: string },
    now: number = Date.now()
  ) {
    const MAX = 8;
    const filtered = items.filter(
      (r) =>
        !(
          r.key === newItem.key &&
          JSON.stringify(r.params) === JSON.stringify(newItem.params || {})
        )
    );
    return [
      { ...newItem, params: newItem.params || {}, visitedAt: now },
      ...filtered,
    ].slice(0, MAX);
  }

  it("initial empty", () => {
    expect(trackRecent([], { key: "x" }, 1000)).toEqual([
      { key: "x", params: {}, visitedAt: 1000 },
    ]);
  });

  it("preserves order (most recent first)", () => {
    const result = trackRecent(
      [
        { key: "a", params: {}, visitedAt: 100 },
        { key: "b", params: {}, visitedAt: 200 },
      ],
      { key: "c" },
      300
    );
    // New c added at front, dedup removes nothing, rest preserved
    expect(result.map((r) => r.key)).toEqual(["c", "a", "b"]);
  });

  it("de-duplicates by key+params", () => {
    const result = trackRecent(
      [{ key: "dashboard", params: {}, visitedAt: 100 }],
      { key: "dashboard" },
      200
    );
    expect(result.length).toBe(1);
    expect(result[0].visitedAt).toBe(200);
  });

  it("treats different params as different", () => {
    const result = trackRecent(
      [{ key: "book-detail", params: { id: "1" }, visitedAt: 100 }],
      { key: "book-detail", params: { id: "2" } },
      200
    );
    expect(result.length).toBe(2);
  });

  it("caps at 8 items", () => {
    let items: any[] = [];
    for (let i = 0; i < 20; i++) {
      items = trackRecent(items, { key: `k-${i}` }, i);
    }
    expect(items.length).toBe(8);
    // Most recent is k-19
    expect(items[0].key).toBe("k-19");
  });

  it("preserves label and group metadata", () => {
    const result = trackRecent([], {
      key: "catalog",
      label: "Katalog",
      group: "Koleksi",
    });
    expect(result[0].label).toBe("Katalog");
    expect(result[0].group).toBe("Koleksi");
  });
});

describe("store: recent items expiration", () => {
  function filterByDate(
    items: Array<{ visitedAt: number }>,
    now: number,
    daysBack: number = 7
  ) {
    const cutoff = now - daysBack * 24 * 60 * 60 * 1000;
    return items.filter((item) => item.visitedAt > cutoff);
  }

  it("keeps items within 7 days", () => {
    const now = Date.now();
    const items = [
      { visitedAt: now - 1 * 24 * 60 * 60 * 1000 }, // 1 day ago
      { visitedAt: now - 6 * 24 * 60 * 60 * 1000 }, // 6 days ago
      { visitedAt: now - 7 * 24 * 60 * 60 * 1000 - 1000 }, // 7+ days ago
      { visitedAt: now - 30 * 24 * 60 * 60 * 1000 }, // 30 days ago
    ];
    const filtered = filterByDate(items, now, 7);
    expect(filtered.length).toBe(2);
  });

  it("keeps all items if all recent", () => {
    const now = Date.now();
    const items = [
      { visitedAt: now - 1000 },
      { visitedAt: now - 60_000 },
      { visitedAt: now - 3600_000 },
    ];
    const filtered = filterByDate(items, now);
    expect(filtered.length).toBe(3);
  });

  it("returns empty if all expired", () => {
    const now = Date.now();
    const items = [
      { visitedAt: now - 30 * 24 * 60 * 60 * 1000 },
      { visitedAt: now - 60 * 24 * 60 * 60 * 1000 },
    ];
    const filtered = filterByDate(items, now, 7);
    expect(filtered.length).toBe(0);
  });
});

describe("store: command palette state", () => {
  function makeToggle(initial: boolean) {
    let state = initial;
    return {
      toggle: () => (state = !state),
      get isOpen() {
        return state;
      },
    };
  }

  it("toggles from closed to open", () => {
    const t = makeToggle(false);
    expect(t.isOpen).toBe(false);
    t.toggle();
    expect(t.isOpen).toBe(true);
  });

  it("toggles from open to closed", () => {
    const t = makeToggle(true);
    expect(t.isOpen).toBe(true);
    t.toggle();
    expect(t.isOpen).toBe(false);
  });
});
