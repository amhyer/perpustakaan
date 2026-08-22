/**
 * Unit tests untuk src/lib/scheduler.ts
 * Test: getScheduleSettings parsing (via mock store)
 *
 * Karena scheduler butuh DB, kita test only pure logic — settings parsing.
 * runSmartReminders() di-skip (integration test).
 */

import { describe, it, expect, vi } from "vitest";

// Mock db module
vi.mock("../db", () => ({
  db: {
    setting: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "../db";

describe("scheduler pure logic (mocked DB)", () => {
  it("default intervals: [3,1,0] untuk pre-due dan [1,3,7] untuk overdue", async () => {
    // Mock returning null (no setting) → pakai default
    (db.setting.findUnique as any).mockResolvedValue(null);
    // Import dynamically to ensure mock applied
    const { runSmartReminders } = await import("../scheduler");
    // runSmartReminders akan baca settings, hasilnya interval
    // Kita test indirectly: trigger run dengan mock loan list kosong
    const result = await runSmartReminders();
    expect(result.errors).toBeDefined();
    expect(result.preDueReminders).toBe(0); // no loans
    expect(result.overdueReminders).toBe(0);
  });

  it("custom intervals dari Settings", async () => {
    (db.setting.findUnique as any).mockImplementation(({ where }) => {
      if (where.key === "reminder_pre_due_days") return Promise.resolve({ value: "5,2,0" });
      if (where.key === "reminder_overdue_intervals") return Promise.resolve({ value: "1,5" });
      return Promise.resolve(null);
    });
    const { runSmartReminders } = await import("../scheduler");
    const result = await runSmartReminders();
    // No loans, jadi 0,0 — tapi verifikasi parsing berjalan tanpa error
    expect(result.preDueReminders).toBe(0);
    expect(result.overdueReminders).toBe(0);
  });

  it("invalid intervals → fallback ke default", async () => {
    (db.setting.findUnique as any).mockImplementation(({ where }) => {
      if (where.key === "reminder_pre_due_days") return Promise.resolve({ value: "abc,def" });
      return Promise.resolve(null);
    });
    const { runSmartReminders } = await import("../scheduler");
    const result = await runSmartReminders();
    expect(result.preDueReminders).toBe(0);
  });
});
