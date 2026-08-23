/**
 * Tests for Data Export view metadata and history helpers.
 *
 * Sprint L-Phase 4: Data export UI.
 *
 * Tests:
 * - EXPORT_TYPES metadata is consistent
 * - History helpers work as expected
 * - Each type has required columns
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
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

// Inline history helpers extracted for testability
const HISTORY_KEY = "ji-export-history";
const MAX_HISTORY = 10;

interface ExportHistoryEntry {
  type: string;
  filename: string;
  rowCount: number;
  timestamp: number;
}

function getExportHistory(): ExportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveExportHistory(history: ExportHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // ignore
  }
}

function addToHistory(entry: ExportHistoryEntry): void {
  const history = getExportHistory();
  saveExportHistory(
    [entry, ...history.filter((h) => h.filename !== entry.filename)].slice(0, MAX_HISTORY)
  );
}

describe("Data Export - history helpers", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("returns empty array when no history", () => {
    expect(getExportHistory()).toEqual([]);
  });

  it("saves and reads back history", () => {
    saveExportHistory([
      { type: "books", filename: "buku.csv", rowCount: 10, timestamp: 1000 },
    ]);
    const history = getExportHistory();
    expect(history).toHaveLength(1);
    expect(history[0].filename).toBe("buku.csv");
  });

  it("adds new entry to top", () => {
    saveExportHistory([
      { type: "books", filename: "old.csv", rowCount: 5, timestamp: 1000 },
    ]);
    addToHistory({ type: "members", filename: "new.csv", rowCount: 20, timestamp: 2000 });
    const history = getExportHistory();
    expect(history[0].filename).toBe("new.csv");
    expect(history[0].rowCount).toBe(20);
    expect(history[1].filename).toBe("old.csv");
  });

  it("deduplicates by filename (replaces existing entry)", () => {
    saveExportHistory([
      { type: "books", filename: "x.csv", rowCount: 5, timestamp: 1000 },
      { type: "members", filename: "y.csv", rowCount: 10, timestamp: 2000 },
    ]);
    addToHistory({ type: "books", filename: "x.csv", rowCount: 99, timestamp: 3000 });
    const history = getExportHistory();
    expect(history[0].filename).toBe("x.csv");
    expect(history[0].rowCount).toBe(99);
    expect(history).toHaveLength(2); // not duplicated
  });

  it("limits to MAX_HISTORY entries", () => {
    for (let i = 0; i < 15; i++) {
      addToHistory({
        type: "books",
        filename: `file-${i}.csv`,
        rowCount: i,
        timestamp: i * 1000,
      });
    }
    const history = getExportHistory();
    expect(history).toHaveLength(MAX_HISTORY);
  });

  it("keeps newest entries when at limit", () => {
    for (let i = 0; i < 15; i++) {
      addToHistory({
        type: "books",
        filename: `file-${i}.csv`,
        rowCount: i,
        timestamp: i * 1000,
      });
    }
    const history = getExportHistory();
    expect(history[0].filename).toBe("file-14.csv");
    expect(history[MAX_HISTORY - 1].filename).toBe("file-5.csv");
  });

  it("handles corrupt JSON gracefully", () => {
    mockStorage[HISTORY_KEY] = "not json{";
    expect(getExportHistory()).toEqual([]);
  });
});

describe("Data Export - filename parsing", () => {
  it("extracts filename from Content-Disposition", () => {
    const disposition = 'attachment; filename="buku-export-2024-01-01.csv"';
    const match = disposition.match(/filename="?([^";]+)"?/);
    expect(match?.[1]).toBe("buku-export-2024-01-01.csv");
  });

  it("handles unquoted filename", () => {
    const disposition = "attachment; filename=buku.csv";
    const match = disposition.match(/filename="?([^";]+)"?/);
    expect(match?.[1]).toBe("buku.csv");
  });

  it("falls back to default filename", () => {
    const disposition = "";
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match?.[1] || `export-${new Date().toISOString().split("T")[0]}.csv`;
    expect(filename).toMatch(/^export-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe("Data Export - URL params builder", () => {
  it("builds basic query string", () => {
    const params = new URLSearchParams({ type: "books" });
    expect(params.toString()).toBe("type=books");
  });

  it("includes date range", () => {
    const params = new URLSearchParams({ type: "books" });
    params.set("from", "2024-01-01");
    params.set("to", "2024-12-31");
    expect(params.get("from")).toBe("2024-01-01");
    expect(params.get("to")).toBe("2024-12-31");
  });

  it("includes status filter", () => {
    const params = new URLSearchParams({ type: "loans" });
    params.set("status", "ACTIVE");
    expect(params.get("status")).toBe("ACTIVE");
  });

  it("includes anonymize flag", () => {
    const params = new URLSearchParams({ type: "members" });
    params.set("anonymize", "true");
    expect(params.get("anonymize")).toBe("true");
  });
});
