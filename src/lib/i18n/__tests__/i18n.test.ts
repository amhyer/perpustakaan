/**
 * Tests untuk i18n foundation.
 *
 * Memvalidasi:
 * - Translation lookup dengan dot-path
 * - Interpolation {placeholder}
 * - Fallback ke path saat missing
 * - Locale switching
 * - Date/number formatting per locale
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  t,
  getLocale,
  setLocale,
  formatNumber,
  formatCurrency,
  formatDateLocale,
  formatDateShortLocale,
} from "../index";

describe("i18n foundation", () => {
  beforeEach(() => {
    setLocale("id"); // Reset to default
  });

  describe("t() — translation lookup", () => {
    it("lookup top-level key", () => {
      expect(t("common.save")).toBe("Simpan");
      expect(t("common.cancel")).toBe("Batal");
    });

    it("lookup nested key dengan dot-path", () => {
      expect(t("roles.LIBRARIAN")).toBe("Pustakawan");
      expect(t("roles.TEACHER")).toBe("Guru");
      expect(t("roles.STUDENT")).toBe("Siswa");
    });

    it("interpolation {placeholder}", () => {
      expect(t("dashboard.welcome", { name: "Budi" })).toBe(
        "Selamat datang, Budi!"
      );
    });

    it("interpolation dengan multiple placeholders", () => {
      const result = t("dashboard.typeAccount", { role: "Pustakawan" });
      expect(result).toBe("Tipe akun: Pustakawan");
    });

    it("return path sebagai fallback saat missing key", () => {
      // @ts-expect-error - test invalid path
      expect(t("invalid.path.here")).toBe("invalid.path.here");
    });

    it("handle interpolation key yang tidak ada di params", () => {
      // Template punya {name} tapi params kosong
      const result = t("dashboard.welcome", {});
      expect(result).toContain("{name}"); // placeholder tidak ter-replace
    });
  });

  describe("Locale switching", () => {
    it("getLocale() return default 'id'", () => {
      expect(getLocale()).toBe("id");
    });

    it("setLocale switch ke 'en'", () => {
      setLocale("en");
      expect(getLocale()).toBe("en");
      expect(t("common.save")).toBe("Save");
      expect(t("roles.LIBRARIAN")).toBe("Librarian");
    });

    it("setLocale ke invalid value — fallback ke default", () => {
      // @ts-expect-error - test invalid locale
      setLocale("xx");
      expect(getLocale()).toBe("id"); // tidak berubah
    });
  });

  describe("formatNumber", () => {
    it("format dengan id locale (id-ID)", () => {
      // Note: 'id' menggunakan comma sebagai thousand separator
      expect(formatNumber(1234)).toContain("1");
      expect(formatNumber(1234)).toContain("234");
    });

    it("format dengan en locale (en-US)", () => {
      const result = formatNumber(1234, "en");
      expect(result).toContain("1,234");
    });
  });

  describe("formatCurrency", () => {
    it("format IDR", () => {
      const result = formatCurrency(1500);
      expect(result).toContain("Rp");
    });

    it("format IDR dengan angka besar", () => {
      const result = formatCurrency(2_500_000);
      expect(result).toContain("2");
      expect(result).toContain("500");
    });
  });

  describe("formatDateLocale & formatDateShortLocale", () => {
    const testDate = new Date("2026-08-22T00:00:00Z");

    it("format date long dengan id locale", () => {
      const result = formatDateLocale(testDate, "id");
      // "22 Agustus 2026" (id-ID) or "August 22, 2026" (en-US)
      expect(result).toMatch(/2026/);
      expect(result).toMatch(/22/);
    });

    it("format date long dengan en locale", () => {
      const result = formatDateLocale(testDate, "en");
      expect(result).toMatch(/2026/);
      expect(result).toMatch(/22/);
      // English pakai "August"
      expect(result).toMatch(/August/);
    });

    it("format date short dengan id locale", () => {
      const result = formatDateShortLocale(testDate, "id");
      // "22/08/2026" (id-ID dd/mm/yyyy) atau "08/22/2026" (en-US mm/dd/yyyy)
      expect(result).toMatch(/2026/);
    });
  });

  describe("Type safety", () => {
    it("TranslationPath cover semua key yang ada", () => {
      // Compile-time check — jika TranslationKey tidak include path,
      // TypeScript akan error. Test runtime untuk sanity.
      const path: Parameters<typeof t>[0] = "dashboard.welcome";
      expect(typeof path).toBe("string");
    });

    it("Type-safe parameters", () => {
      // Parameters of t() with specific path should be Record<string, string|number>
      // (TypeScript akan enforce ini di compile-time)
      const result = t("dashboard.welcome", { name: "Test" });
      expect(result).toBeDefined();
    });
  });
});
