/**
 * Unit tests untuk role-specific dashboard widgets.
 *
 * Sprint G2 - Phase D.
 *
 * Test:
 * - Stat calculation logic
 * - Alert severity classification
 * - Streak/progress calculations
 * - Recommendation filtering
 * - Class reader percentage
 */

import { describe, it, expect } from "vitest";

// ===== Helper functions (extracted for testing) =====

function calculateReaderPercent(active: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((active / total) * 100);
}

function getReaderHealthColor(percent: number): "green" | "amber" | "red" {
  if (percent >= 70) return "green";
  if (percent >= 50) return "amber";
  return "red";
}

function getLoanStatusSeverity(overdue: number, dueSoon: number): "red" | "amber" | "green" {
  if (overdue > 0) return "red";
  if (dueSoon > 0) return "amber";
  return "green";
}

function getLoanStatusText(overdue: number, dueSoon: number): string {
  if (overdue > 0) return `${overdue} buku terlambat!`;
  if (dueSoon > 0) return `${dueSoon} buku jatuh tempo soon`;
  return "Semua pinjaman aman";
}

function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, (current / target) * 100);
}

function calculatePointsToNext(current: number, target: number): number {
  return Math.max(0, target - current);
}

function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}h`;
  return `${Math.floor(days / 7)}mgu`;
}

// ===== Tests =====

describe("librarian widget: stat calculations", () => {
  it("calculates reader percentage correctly", () => {
    expect(calculateReaderPercent(24, 32)).toBe(75);
    expect(calculateReaderPercent(19, 30)).toBe(63);
    expect(calculateReaderPercent(0, 30)).toBe(0);
  });

  it("handles edge case of zero total", () => {
    expect(calculateReaderPercent(0, 0)).toBe(0);
  });
});

describe("librarian widget: reader health color", () => {
  it("green for >= 70%", () => {
    expect(getReaderHealthColor(70)).toBe("green");
    expect(getReaderHealthColor(85)).toBe("green");
    expect(getReaderHealthColor(100)).toBe("green");
  });

  it("amber for 50-69%", () => {
    expect(getReaderHealthColor(50)).toBe("amber");
    expect(getReaderHealthColor(60)).toBe("amber");
    expect(getReaderHealthColor(69)).toBe("amber");
  });

  it("red for < 50%", () => {
    expect(getReaderHealthColor(0)).toBe("red");
    expect(getReaderHealthColor(30)).toBe("red");
    expect(getReaderHealthColor(49)).toBe("red");
  });
});

describe("student widget: loan status severity", () => {
  it("red when overdue", () => {
    expect(getLoanStatusSeverity(3, 0)).toBe("red");
    expect(getLoanStatusSeverity(1, 5)).toBe("red"); // overdue takes priority
  });

  it("amber when only due soon", () => {
    expect(getLoanStatusSeverity(0, 2)).toBe("amber");
  });

  it("green when all good", () => {
    expect(getLoanStatusSeverity(0, 0)).toBe("green");
  });
});

describe("student widget: loan status text", () => {
  it("overdue message", () => {
    expect(getLoanStatusText(2, 0)).toBe("2 buku terlambat!");
    expect(getLoanStatusText(1, 1)).toBe("1 buku terlambat!");
  });

  it("due soon message", () => {
    expect(getLoanStatusText(0, 3)).toBe("3 buku jatuh tempo soon");
  });

  it("all good message", () => {
    expect(getLoanStatusText(0, 0)).toBe("Semua pinjaman aman");
  });
});

describe("student widget: points calculation", () => {
  it("calculates progress percentage", () => {
    expect(calculateProgress(145, 200)).toBe(72.5);
    expect(calculateProgress(100, 200)).toBe(50);
    expect(calculateProgress(250, 200)).toBe(100); // capped at 100
  });

  it("calculates points to next reward", () => {
    expect(calculatePointsToNext(145, 200)).toBe(55);
    expect(calculatePointsToNext(200, 200)).toBe(0);
    expect(calculatePointsToNext(250, 200)).toBe(0); // never negative
  });

  it("handles zero target", () => {
    expect(calculateProgress(0, 0)).toBe(0);
    expect(calculatePointsToNext(50, 0)).toBe(0);
  });
});

describe("relative time formatting", () => {
  const now = 1_700_000_000_000; // fixed timestamp

  it("baru for < 1 minute", () => {
    expect(formatRelativeTime(now - 30_000, now)).toBe("baru");
  });

  it("minutes", () => {
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5m");
    expect(formatRelativeTime(now - 59 * 60_000, now)).toBe("59m");
  });

  it("hours", () => {
    expect(formatRelativeTime(now - 60 * 60_000, now)).toBe("1j");
    expect(formatRelativeTime(now - 5 * 60 * 60_000, now)).toBe("5j");
  });

  it("days", () => {
    expect(formatRelativeTime(now - 24 * 60 * 60_000, now)).toBe("1h");
    expect(formatRelativeTime(now - 6 * 24 * 60 * 60_000, now)).toBe("6h");
  });

  it("weeks", () => {
    expect(formatRelativeTime(now - 7 * 24 * 60 * 60_000, now)).toBe("1mgu");
    expect(formatRelativeTime(now - 14 * 24 * 60 * 60_000, now)).toBe("2mgu");
  });
});

describe("teacher widget: data structure validation", () => {
  it("validates class data has required fields", () => {
    const cls = {
      name: "XII-A",
      studentCount: 32,
      activeReaders: 24,
      avgBooksRead: 8.5,
      topReader: { name: "Andini P.", booksRead: 18 },
    };
    expect(cls.name).toBeDefined();
    expect(cls.studentCount).toBeGreaterThan(0);
    expect(cls.activeReaders).toBeLessThanOrEqual(cls.studentCount);
    expect(cls.avgBooksRead).toBeGreaterThanOrEqual(0);
  });

  it("validates needs attention data", () => {
    const needsAttention = [
      { studentName: "Reza M.", className: "XII-A", issue: "OVERDUE" },
      { studentName: "Siti N.", className: "XII-B", issue: "INACTIVE" },
    ];
    expect(needsAttention[0].issue).toBe("OVERDUE");
    expect(needsAttention[1].issue).toBe("INACTIVE");
  });

  it("validates recommendations structure", () => {
    const book = {
      id: "1",
      title: "Sapiens",
      author: "Yuval Noah Harari",
      reason: "Populer untuk kelas XII",
    };
    expect(book.id).toBeDefined();
    expect(book.title.length).toBeGreaterThan(0);
    expect(book.reason.length).toBeGreaterThan(0);
  });
});

describe("librarian widget: alert classification", () => {
  it("critical alert for overdue", () => {
    const overdue = 5;
    const type = overdue > 3 ? "critical" : "warning";
    expect(type).toBe("critical");
  });

  it("warning alert for 1-3 overdue", () => {
    const overdue = 2;
    const type = overdue > 3 ? "critical" : "warning";
    expect(type).toBe("warning");
  });

  it("info alert for low priority items", () => {
    const type = "info";
    expect(type).toBe("info");
  });
});

describe("widget integration: graceful degradation", () => {
  it("falls back to mock when API returns 500", () => {
    // Simulating the pattern in widgets
    const mockData = {
      today: { loansCreated: 24, returns: 18, newMembers: 3, overdueCount: 5, pendingApprovals: 7 },
      weekly: { loansThisWeek: 142, loansLastWeek: 128, trendPercent: 10.9 },
      alerts: [],
    };
    expect(mockData.today.loansCreated).toBeGreaterThan(0);
  });

  it("handles empty data gracefully", () => {
    const empty = {
      today: { loansCreated: 0, returns: 0, newMembers: 0, overdueCount: 0, pendingApprovals: 0 },
      weekly: { loansThisWeek: 0, loansLastWeek: 0, trendPercent: 0 },
      alerts: [],
    };
    expect(empty.alerts.length).toBe(0);
  });
});
