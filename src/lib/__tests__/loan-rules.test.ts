/**
 * Unit tests untuk src/lib/loan-rules.ts
 * Test: computeDueDate (holiday shifting), toDateKey format
 *
 * Note: ini test pure functions saja (computeDueDate + toDateKey via exported wrapper).
 * getLoanRules, getHolidayDateSet, computeDueDateWithHolidays butuh DB → skip di unit test.
 */

import { describe, it, expect } from "vitest";
import { computeDueDate } from "../loan-rules";

describe("computeDueDate", () => {
  it("baseDate + loanDays (no holidays)", () => {
    const base = new Date("2026-01-15T10:00:00");
    const result = computeDueDate(base, 7, new Set());
    expect(result.dueDate.getTime()).toBe(base.getTime() + 7 * 86400000);
    expect(result.shiftedDays).toBe(0);
  });

  it("shift maju 1 hari kalau dueDate jatuh di hari libur", () => {
    const base = new Date("2026-01-10"); // + 7 = 2026-01-17 (libur)
    const holidays = new Set(["2026-01-17"]);
    const result = computeDueDate(base, 7, holidays);
    expect(result.dueDate.getDate()).toBe(18);
    expect(result.shiftedDays).toBe(1);
  });

  it("shift terus sampai dapat hari non-libur", () => {
    const base = new Date("2026-01-10"); // + 7 = 17
    const holidays = new Set(["2026-01-17", "2026-01-18", "2026-01-19"]);
    const result = computeDueDate(base, 7, holidays);
    expect(result.dueDate.getDate()).toBe(20);
    expect(result.shiftedDays).toBe(3);
  });

  it("holiday di baseDate tidak masalah (cuma cek dueDate)", () => {
    const base = new Date("2026-01-15"); // base di libur
    const holidays = new Set(["2026-01-15"]); // base di libur
    const result = computeDueDate(base, 7, holidays);
    // dueDate = 22, bukan di holidays, jadi tidak shift
    expect(result.dueDate.getDate()).toBe(22);
    expect(result.shiftedDays).toBe(0);
  });

  it("safety limit (max 365 hari geser)", () => {
    const base = new Date("2026-01-10");
    // bikin 400 hari libur berturut-turut
    const holidays = new Set();
    for (let i = 17; i < 420; i++) {
      const d = new Date(2026, 0, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      holidays.add(`${y}-${m}-${day}`);
    }
    const result = computeDueDate(base, 7, holidays);
    // Harus ada safety cutoff, tidak infinite loop
    expect(result.shiftedDays).toBeLessThanOrEqual(365);
  });

  it("dueDate dengan format YYYY-MM-DD cocok dengan holiday set", () => {
    // verify toDateKey menggunakan local time (bukan UTC)
    const base = new Date(2026, 0, 10); // 10 Jan 2026
    const holidays = new Set(["2026-01-17"]);
    const result = computeDueDate(base, 7, holidays);
    expect(result.shiftedDays).toBe(1);
  });
});
