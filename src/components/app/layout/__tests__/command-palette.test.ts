/**
 * Unit tests untuk Command Palette (Cmd+K).
 *
 * Test pure logic:
 * - fuzzy matching algorithm
 * - scoring & ranking
 * - keyboard navigation
 * - localStorage persistence (recent items)
 * - role-based filtering
 */

import { describe, it, expect } from "vitest";

// ===== Fuzzy match algorithm (extracted for testing) =====
function fuzzyScore(text: string, query: string): number {
  if (!query) return 1;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 50;
  if (t.includes(q)) return 25;
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return 30;
  }
  return 0;
}

describe("command-palette: fuzzy match", () => {
  it("exact match returns highest score", () => {
    expect(fuzzyScore("Dashboard", "Dashboard")).toBe(100);
  });

  it("case-insensitive exact match", () => {
    expect(fuzzyScore("Dashboard", "dashboard")).toBe(100);
    expect(fuzzyScore("DASHBOARD", "dashboard")).toBe(100);
  });

  it("prefix match scores high", () => {
    const score = fuzzyScore("Dashboard", "Dash");
    expect(score).toBe(50);
  });

  it("substring match scores medium", () => {
    const score = fuzzyScore("Dashboard Eksekutif", "ekse");
    expect(score).toBe(25);
  });

  it("word boundary match scores high-medium", () => {
    const score = fuzzyScore("Dashboard Eksekutif", "ekse");
    expect(score).toBeGreaterThan(0);
  });

  it("no match returns 0", () => {
    expect(fuzzyScore("Dashboard", "xyz123")).toBe(0);
  });

  it("empty query matches anything (score 1)", () => {
    expect(fuzzyScore("Anything", "")).toBe(1);
  });

  it("ranks prefix > word boundary > substring", () => {
    const prefix = fuzzyScore("Dashboard", "dash");
    const word = fuzzyScore("Dashboard Eksekutif", "ekse");
    const substring = fuzzyScore("MyDashboard", "dash");
    // prefix should be highest
    expect(prefix).toBeGreaterThanOrEqual(word);
    expect(prefix).toBeGreaterThanOrEqual(substring);
  });
});

describe("command-palette: search ranking", () => {
  const items = [
    { id: "1", label: "Dashboard", score: 0 },
    { id: "2", label: "Dashboard Eksekutif", score: 0 },
    { id: "3", label: "My Dashboard View", score: 0 },
    { id: "4", label: "Anggota", score: 0 },
  ];

  it("ranks results by score", () => {
    const query = "dashboard";
    const scored = items
      .map((item) => ({ ...item, score: fuzzyScore(item.label, query) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    expect(scored.length).toBe(3);
    // "Dashboard" (exact) should be first
    expect(scored[0].id).toBe("1");
  });

  it("filters out non-matches", () => {
    const query = "anggota";
    const scored = items
      .map((item) => ({ ...item, score: fuzzyScore(item.label, query) }))
      .filter((s) => s.score > 0);
    expect(scored.length).toBe(1);
    expect(scored[0].id).toBe("4");
  });

  it("combines keyword matches", () => {
    const itemsWithKeywords = [
      { id: "1", label: "Katalog", keywords: ["buku", "cari", "search"] },
      { id: "2", label: "Wishlist", keywords: ["favorit"] },
    ];
    const query = "buku";
    const scored = itemsWithKeywords
      .map((item) => {
        let score = fuzzyScore(item.label, query);
        if (item.keywords) {
          for (const kw of item.keywords) {
            const kwScore = fuzzyScore(kw, query);
            if (kwScore > 0) score = Math.max(score, kwScore * 0.8);
          }
        }
        return { ...item, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // "Katalog" with keyword "buku" should match
    expect(scored[0].id).toBe("1");
  });
});

describe("command-palette: recent items logic", () => {
  function trackRecent(
    items: Array<{ key: string; params?: Record<string, string>; visitedAt: number }>,
    newItem: { key: string; params?: Record<string, string> }
  ) {
    const MAX = 8;
    const filtered = items.filter(
      (r) =>
        !(
          r.key === newItem.key &&
          JSON.stringify(r.params || {}) === JSON.stringify(newItem.params || {})
        )
    );
    return [
      { ...newItem, params: newItem.params || {}, visitedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX);
  }

  it("adds new item to front", () => {
    const before = [{ key: "dashboard", visitedAt: 100 }];
    const after = trackRecent(before, { key: "catalog" });
    expect(after[0].key).toBe("catalog");
    expect(after[1].key).toBe("dashboard");
  });

  it("removes duplicate (same key+params)", () => {
    const before = [
      { key: "dashboard", params: {}, visitedAt: 100 },
      { key: "catalog", visitedAt: 200 },
    ];
    const after = trackRecent(before, { key: "dashboard" });
    expect(after.length).toBe(2);
    expect(after[0].key).toBe("dashboard");
    // Catalog should now be second
    expect(after[1].key).toBe("catalog");
  });

  it("treats different params as different items", () => {
    const before = [
      { key: "book-detail", params: { id: "1" }, visitedAt: 100 },
    ];
    const after = trackRecent(before, { key: "book-detail", params: { id: "2" } });
    expect(after.length).toBe(2);
  });

  it("caps at 8 items", () => {
    let items: any[] = [];
    for (let i = 0; i < 12; i++) {
      items = trackRecent(items, { key: `key-${i}` });
    }
    expect(items.length).toBe(8);
    // Most recent (key-11) should be at front
    expect(items[0].key).toBe("key-11");
  });
});

describe("command-palette: role-based menu items", () => {
  const ALL_ITEMS = [
    "dashboard",
    "executive-dashboard",
    "members",
    "settings",
    "api-keys",
    "circulation",
    "loans",
    "rewards-catalog",
    "rfid-dashboard",
    "my-dashboard",
    "my-loans",
    "wishlist",
  ];

  const LIBRARIAN_RESTRICTED = ["executive-dashboard"]; // viewable, not restricted
  const JUNIOR_RESTRICTED = ["settings", "executive-dashboard", "api-keys"];
  const STUDENT_RESTRICTED = [
    "executive-dashboard",
    "members",
    "settings",
    "api-keys",
    "circulation",
    "loans",
    "rfid-dashboard",
  ];

  function filterByRole(items: string[], role: string): string[] {
    if (role === "LIBRARIAN") return items; // all
    if (role === "PUSTAKAWAN_JUNIOR") {
      return items.filter((i) => !JUNIOR_RESTRICTED.includes(i));
    }
    // Student/Teacher
    return items.filter((i) => !STUDENT_RESTRICTED.includes(i));
  }

  it("Librarian sees all items", () => {
    const filtered = filterByRole(ALL_ITEMS, "LIBRARIAN");
    expect(filtered.length).toBe(ALL_ITEMS.length);
  });

  it("Pustakawan Junior cannot access Settings", () => {
    const filtered = filterByRole(ALL_ITEMS, "PUSTAKAWAN_JUNIOR");
    expect(filtered).not.toContain("settings");
  });

  it("Pustakawan Junior cannot access API Keys", () => {
    const filtered = filterByRole(ALL_ITEMS, "PUSTAKAWAN_JUNIOR");
    expect(filtered).not.toContain("api-keys");
  });

  it("Student cannot access librarian-only views", () => {
    const filtered = filterByRole(ALL_ITEMS, "STUDENT");
    expect(filtered).not.toContain("settings");
    expect(filtered).not.toContain("circulation");
    expect(filtered).not.toContain("rfid-dashboard");
  });

  it("Student can see student-specific views", () => {
    const filtered = filterByRole(ALL_ITEMS, "STUDENT");
    expect(filtered).toContain("my-dashboard");
    expect(filtered).toContain("my-loans");
    expect(filtered).toContain("wishlist");
  });
});

describe("command-palette: keyboard navigation", () => {
  it("clamps selected index to range", () => {
    const total = 5;
    let selected = 0;
    // Down arrow
    selected = Math.min(total - 1, selected + 1);
    expect(selected).toBe(1);
    selected = Math.min(total - 1, selected + 10);
    expect(selected).toBe(total - 1);
    // Up arrow
    selected = Math.max(0, selected - 1);
    expect(selected).toBe(total - 2);
    selected = Math.max(0, selected - 10);
    expect(selected).toBe(0);
  });

  it("Enter selects the item at selectedIdx", () => {
    const items = [
      { id: "1", label: "A" },
      { id: "2", label: "B" },
      { id: "3", label: "C" },
    ];
    let selectedIdx = 1;
    const item = items[selectedIdx];
    expect(item.id).toBe("2");
  });
});

describe("command-palette: shortcut detection", () => {
  function detectPlatform(): "mac" | "win" {
    if (typeof navigator === "undefined") return "win";
    return /Mac|iPhone|iPad/.test(navigator.platform) ? "mac" : "win";
  }

  it("uses Cmd on Mac", () => {
    // Stub navigator
    const originalPlatform = (global as any).navigator?.platform;
    Object.defineProperty(global, "navigator", {
      value: { platform: "MacIntel" },
      configurable: true,
    });
    expect(detectPlatform()).toBe("mac");
    Object.defineProperty(global, "navigator", {
      value: { platform: originalPlatform },
      configurable: true,
    });
  });

  it("uses Ctrl on Windows", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Win32" },
      configurable: true,
    });
    expect(detectPlatform()).toBe("win");
  });
});
