/**
 * Unit tests untuk src/lib/constants.ts
 * Test: formatRupiah, formatDate, daysBetween, calculateFine
 */

import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatDate,
  formatDateShort,
  daysBetween,
  calculateFine,
  COVER_COLORS,
  LOAN_RULES,
} from "../constants";

describe("formatRupiah", () => {
  it("format 0 → 'Rp 0'", () => {
    expect(formatRupiah(0)).toContain("0");
  });

  it("format 1500 → 'Rp 1.500'", () => {
    const result = formatRupiah(1500);
    expect(result).toContain("1.500");
    expect(result).toContain("Rp");
  });

  it("format jutaan", () => {
    const result = formatRupiah(2_500_000);
    expect(result).toContain("2.500.000");
  });

  it("tanpa desimal", () => {
    expect(formatRupiah(1000.5)).not.toMatch(/,\s*5/);
  });
});

describe("formatDate", () => {
  it("format ISO string ke Bahasa Indonesia", () => {
    const result = formatDate("2026-01-15");
    expect(result).toContain("2026");
    expect(result).toMatch(/Januari/i);
  });

  it("accept Date object", () => {
    const result = formatDate(new Date("2026-12-25"));
    expect(result).toContain("2026");
    expect(result).toMatch(/Desember/i);
  });
});

describe("formatDateShort", () => {
  it("format DD/MM/YYYY", () => {
    const result = formatDateShort("2026-03-15");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/03/);
    expect(result).toMatch(/2026/);
  });
});

describe("daysBetween", () => {
  it("same date = 0", () => {
    expect(daysBetween(new Date("2026-01-15"), new Date("2026-01-15"))).toBe(0);
  });

  it("5 hari kemudian", () => {
    expect(daysBetween(new Date("2026-01-20"), new Date("2026-01-15"))).toBe(5);
  });

  it("cross month", () => {
    expect(daysBetween(new Date("2026-02-05"), new Date("2026-01-30"))).toBe(6);
  });

  it("cross year", () => {
    expect(daysBetween(new Date("2026-01-05"), new Date("2025-12-30"))).toBe(6);
  });

  it("normalize ke awal hari (ignore jam)", () => {
    const a = new Date("2026-01-15T08:00:00");
    const b = new Date("2026-01-15T22:00:00");
    expect(daysBetween(a, b)).toBe(0);
  });

  it("handle leap year", () => {
    expect(daysBetween(new Date("2024-03-01"), new Date("2024-02-28"))).toBe(2);
  });
});

describe("calculateFine", () => {
  it("return 0 jika tidak terlambat", () => {
    const due = new Date("2026-01-15");
    const ret = new Date("2026-01-15");
    expect(calculateFine(due, ret, 1000)).toBe(0);
  });

  it("return 0 jika kembalikan lebih awal", () => {
    const due = new Date("2026-01-15");
    const ret = new Date("2026-01-10");
    expect(calculateFine(due, ret, 1000)).toBe(0);
  });

  it("hitung denda untuk keterlambatan", () => {
    const due = new Date("2026-01-15");
    const ret = new Date("2026-01-20"); // 5 hari telat
    expect(calculateFine(due, ret, 1000)).toBe(5000);
  });

  it("use current date jika returnDate null", () => {
    const due = new Date();
    due.setDate(due.getDate() - 5); // 5 hari lalu
    // Kemungkinan bisa flaky jika test berjalan tepat di midnight
    // Set ke tanggal yang lebih pasti
    const duePast = new Date("2020-01-01");
    const fine = calculateFine(duePast, null, 1000);
    expect(fine).toBeGreaterThan(0);
  });

  it("fine per day 0 → 0 (untuk pustakawan)", () => {
    const due = new Date("2020-01-01");
    const ret = new Date("2020-01-10");
    expect(calculateFine(due, ret, 0)).toBe(0);
  });

  it("normalize jam — kembalikan di hari yang sama meskipun beda jam", () => {
    const due = new Date("2026-01-15T10:00:00");
    const ret = new Date("2026-01-15T20:00:00");
    expect(calculateFine(due, ret, 1000)).toBe(0);
  });
});

describe("LOAN_RULES", () => {
  it("semua role punya rule", () => {
    expect(LOAN_RULES.LIBRARIAN).toBeDefined();
    expect(LOAN_RULES.PUSTAKAWAN_JUNIOR).toBeDefined();
    expect(LOAN_RULES.TEACHER).toBeDefined();
    expect(LOAN_RULES.STUDENT).toBeDefined();
  });

  it("maxBooks > 0 untuk semua", () => {
    for (const r of Object.values(LOAN_RULES)) {
      expect(r.maxBooks).toBeGreaterThan(0);
    }
  });

  it("loanDays > 0 untuk semua", () => {
    for (const r of Object.values(LOAN_RULES)) {
      expect(r.loanDays).toBeGreaterThan(0);
    }
  });

  it("fine per day non-negatif", () => {
    for (const r of Object.values(LOAN_RULES)) {
      expect(r.finePerDay).toBeGreaterThanOrEqual(0);
    }
  });

  it("pustakawan tidak kena denda", () => {
    expect(LOAN_RULES.LIBRARIAN.finePerDay).toBe(0);
    expect(LOAN_RULES.PUSTAKAWAN_JUNIOR.finePerDay).toBe(0);
  });

  it("siswa lebih ketat dari guru", () => {
    expect(LOAN_RULES.STUDENT.maxBooks).toBeLessThanOrEqual(LOAN_RULES.TEACHER.maxBooks);
    expect(LOAN_RULES.STUDENT.loanDays).toBeLessThanOrEqual(LOAN_RULES.TEACHER.loanDays);
  });
});

describe("COVER_COLORS", () => {
  it("ada 10 warna", () => {
    expect(COVER_COLORS.length).toBe(10);
  });

  it("semua warna format hex valid", () => {
    for (const c of COVER_COLORS) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("semua warna unik", () => {
    const unique = new Set(COVER_COLORS);
    expect(unique.size).toBe(COVER_COLORS.length);
  });
});
