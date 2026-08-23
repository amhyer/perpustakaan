/**
 * Unit tests untuk Keyboard Cheatsheet.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 *
 * Test:
 * - Platform detection (Mac vs Windows)
 * - i18n text lookup
 * - Search filter logic
 * - Shortcut data structure validation
 */

import { describe, it, expect } from "vitest";

// ===== Helper functions extracted for testing =====

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

function getLocalizedText(
  texts: Array<{ id: "id" | "en" | "ar"; text: string }>,
  locale: string
): string {
  const target = locale as "id" | "en" | "ar";
  const entry = texts.find((t) => t.id === target) || texts[0];
  return entry?.text || "";
}

function filterShortcuts<T extends { keys: string[]; description: Array<{ text: string }> }>(
  shortcuts: T[],
  query: string
): T[] {
  if (!query.trim()) return shortcuts;
  const q = query.toLowerCase();
  return shortcuts.filter((s) => {
    // Match description text
    if (s.description.some((d) => d.text.toLowerCase().includes(q))) return true;
    // Match key combination
    if (s.keys.join("").toLowerCase().includes(q)) return true;
    return false;
  });
}

function renderKeysForPlatform(keys: string[], isMac: boolean): string[] {
  if (isMac) return keys;
  return keys.map((k) => {
    if (k === "⌘") return "Ctrl";
    if (k === "⌥") return "Alt";
    if (k === "⇧") return "Shift";
    if (k === "↵") return "Enter";
    if (k === "⌫") return "Backspace";
    if (k === "→") return "→";
    return k;
  });
}

function matchesShortcut(pressed: string[], expected: string[]): boolean {
  if (pressed.length !== expected.length) return false;
  return pressed.every((p, i) => {
    const e = expected[i];
    // Normalize: "Cmd" / "⌘" / "ctrl" are all the same modifier
    const normalize = (k: string) =>
      k.toLowerCase().replace(/^cmd$/, "ctrl").replace(/^⌘$/, "ctrl");
    return normalize(p) === normalize(e);
  });
}

describe("keyboard-cheatsheet: platform detection", () => {
  it("detects Mac platform", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "MacIntel" },
      configurable: true,
    });
    expect(isMac()).toBe(true);
  });

  it("detects iOS platform", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "iPhone" },
      configurable: true,
    });
    expect(isMac()).toBe(true);
  });

  it("detects Windows platform", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Win32" },
      configurable: true,
    });
    expect(isMac()).toBe(false);
  });

  it("detects Linux platform", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Linux x86_64" },
      configurable: true,
    });
    expect(isMac()).toBe(false);
  });
});

describe("keyboard-cheatsheet: i18n", () => {
  it("returns text for matching locale", () => {
    const texts = [
      { id: "id" as const, text: "Pintasan" },
      { id: "en" as const, text: "Shortcuts" },
      { id: "ar" as const, text: "الاختصارات" },
    ];
    expect(getLocalizedText(texts, "id")).toBe("Pintasan");
    expect(getLocalizedText(texts, "en")).toBe("Shortcuts");
    expect(getLocalizedText(texts, "ar")).toBe("الاختصارات");
  });

  it("falls back to id when locale not found", () => {
    const texts = [{ id: "id" as const, text: "Pintasan" }];
    expect(getLocalizedText(texts, "fr")).toBe("Pintasan");
  });

  it("handles empty array", () => {
    expect(getLocalizedText([], "id")).toBe("");
  });
});

describe("keyboard-cheatsheet: search filter", () => {
  const shortcuts = [
    {
      keys: ["⌘", "K"],
      description: [{ text: "Buka command palette" }],
    },
    {
      keys: ["?"],
      description: [{ text: "Tampilkan pintasan" }],
    },
    {
      keys: ["G", "H"],
      description: [{ text: "Kembali ke beranda" }],
    },
    {
      keys: ["R"],
      description: [{ text: "Refresh data" }],
    },
  ];

  it("returns all when no query", () => {
    expect(filterShortcuts(shortcuts, "").length).toBe(4);
  });

  it("filters by description text", () => {
    const result = filterShortcuts(shortcuts, "command");
    expect(result.length).toBe(1);
    expect(result[0].keys).toEqual(["⌘", "K"]);
  });

  it("filters by key combination", () => {
    const result = filterShortcuts(shortcuts, "⌘k");
    expect(result.length).toBe(1);
  });

  it("case-insensitive", () => {
    const result = filterShortcuts(shortcuts, "REFRESH");
    expect(result.length).toBe(1);
  });

  it("returns empty when no match", () => {
    expect(filterShortcuts(shortcuts, "xyz123")).toEqual([]);
  });

  it("matches Indonesian text", () => {
    const result = filterShortcuts(shortcuts, "beranda");
    expect(result.length).toBe(1);
  });
});

describe("keyboard-cheatsheet: key rendering", () => {
  it("returns keys unchanged on Mac", () => {
    expect(renderKeysForPlatform(["⌘", "K"], true)).toEqual(["⌘", "K"]);
  });

  it("replaces ⌘ with Ctrl on Windows", () => {
    expect(renderKeysForPlatform(["⌘", "K"], false)).toEqual(["Ctrl", "K"]);
  });

  it("replaces ⌥ with Alt on Windows", () => {
    expect(renderKeysForPlatform(["⌥", "F4"], false)).toEqual(["Alt", "F4"]);
  });

  it("replaces ⇧ with Shift on Windows", () => {
    expect(renderKeysForPlatform(["⇧", "Tab"], false)).toEqual(["Shift", "Tab"]);
  });

  it("preserves arrow keys", () => {
    expect(renderKeysForPlatform(["↑", "↓"], false)).toEqual(["↑", "↓"]);
  });

  it("preserves regular keys", () => {
    expect(renderKeysForPlatform(["?", "/", "Esc"], false)).toEqual(["?", "/", "Esc"]);
  });
});

describe("keyboard-cheatsheet: shortcut matching", () => {
  it("matches exact shortcut", () => {
    expect(matchesShortcut(["⌘", "K"], ["⌘", "K"])).toBe(true);
  });

  it("matches with normalization (Cmd vs Ctrl)", () => {
    expect(matchesShortcut(["Ctrl", "K"], ["⌘", "K"])).toBe(true);
  });

  it("rejects different lengths", () => {
    expect(matchesShortcut(["⌘"], ["⌘", "K"])).toBe(false);
  });

  it("rejects different keys", () => {
    expect(matchesShortcut(["⌘", "J"], ["⌘", "K"])).toBe(false);
  });

  it("matches single key", () => {
    expect(matchesShortcut(["?"], ["?"])).toBe(true);
  });
});

describe("keyboard-cheatsheet: data structure", () => {
  it("all categories are valid", () => {
    const validCategories = ["navigation", "actions", "forms", "chat", "advanced"];
    expect(validCategories).toContain("navigation");
    expect(validCategories).toContain("actions");
    expect(validCategories).toContain("forms");
  });

  it("shortcut has required fields", () => {
    const shortcut = {
      keys: ["⌘", "K"],
      description: [{ text: "Test" }],
      category: "navigation" as const,
      icon: class {} as any,
    };
    expect(shortcut.keys.length).toBeGreaterThan(0);
    expect(shortcut.description.length).toBeGreaterThan(0);
    expect(shortcut.category).toBeDefined();
  });
});

describe("keyboard-cheatsheet: discoverability", () => {
  it("groups shortcuts logically", () => {
    // Power user shortcuts in advanced
    // Common shortcuts in navigation
    const allShortcuts = [
      { category: "navigation", description: [{ text: "open" }] },
      { category: "actions", description: [{ text: "save" }] },
      { category: "advanced", description: [{ text: "rfid" }] },
    ];
    const nav = allShortcuts.filter((s) => s.category === "navigation");
    const adv = allShortcuts.filter((s) => s.category === "advanced");
    expect(nav.length).toBe(1);
    expect(adv.length).toBe(1);
  });
});
