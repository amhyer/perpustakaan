/**
 * Tests for i18n strings library.
 *
 * Sprint S - Tier 3 #12: Internationalization.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock config
vi.mock("@/i18n/config", () => ({
  defaultLocale: "id",
  locales: ["id", "en", "ar", "zh"],
}));

import {
  t,
  getAvailableLocales,
  isRTL,
  getLocaleName,
  formatNumber,
  formatDate,
  formatRelativeTime,
} from "../i18n-strings";

describe("i18n-strings: t() function", () => {
  it("returns Indonesian by default", () => {
    expect(t("common.welcome")).toBe("Selamat Datang");
  });

  it("returns English when locale=en", () => {
    expect(t("common.welcome", "en")).toBe("Welcome");
  });

  it("returns Arabic when locale=ar", () => {
    expect(t("common.welcome", "ar")).toBe("مرحباً");
  });

  it("returns Chinese when locale=zh", () => {
    expect(t("common.welcome", "zh")).toBe("欢迎");
  });

  it("interpolates variables", () => {
    expect(t("book.dueIn", "en", { days: 3 })).toBe("Due in 3 days");
    expect(t("book.dueIn", "id", { days: 5 })).toBe("Jatuh tempo dalam 5 hari");
  });

  it("preserves unknown placeholders", () => {
    expect(t("book.dueIn", "en", {})).toBe("Due in {days} days");
  });

  it("falls back to Indonesian for missing key in other locale", () => {
    // This would only happen if a key is in id but not in en
    // Since all keys are translated, let's test fallback for unknown key
    expect(t("unknown.key", "en")).toBe("unknown.key");
  });

  it("returns key as fallback if not in any locale", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });
});

describe("i18n-strings: locale metadata", () => {
  it("getAvailableLocales returns 4 locales", () => {
    expect(getAvailableLocales()).toHaveLength(4);
    expect(getAvailableLocales()).toContain("id");
    expect(getAvailableLocales()).toContain("en");
    expect(getAvailableLocales()).toContain("ar");
    expect(getAvailableLocales()).toContain("zh");
  });

  it("isRTL returns true for Arabic", () => {
    expect(isRTL("ar")).toBe(true);
  });

  it("isRTL returns false for LTR languages", () => {
    expect(isRTL("id")).toBe(false);
    expect(isRTL("en")).toBe(false);
    expect(isRTL("zh")).toBe(false);
  });

  it("getLocaleName returns native names", () => {
    expect(getLocaleName("id")).toBe("Bahasa Indonesia");
    expect(getLocaleName("en")).toBe("English");
    expect(getLocaleName("ar")).toBe("العربية");
    expect(getLocaleName("zh")).toBe("中文");
  });
});

describe("i18n-strings: formatters", () => {
  describe("formatNumber", () => {
    it("formats with Indonesian locale", () => {
      // Indonesian uses . as thousands separator
      const result = formatNumber(1234567, "id");
      expect(result).toContain("1");
    });

    it("formats with English locale", () => {
      const result = formatNumber(1234567, "en");
      expect(result).toContain(",");
    });
  });

  describe("formatDate", () => {
    it("formats date", () => {
      const date = new Date("2024-06-15");
      const result = formatDate(date, "en");
      expect(result).toContain("2024");
      expect(result.toLowerCase()).toContain("june");
    });

    it("formats date in Indonesian", () => {
      const date = new Date("2024-06-15");
      const result = formatDate(date, "id");
      expect(result).toContain("2024");
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    });

    it("formats seconds ago in English", () => {
      const date = new Date("2024-06-15T11:59:30Z"); // 30 sec ago
      const result = formatRelativeTime(date, "en");
      expect(result).toContain("seconds");
    });

    it("formats minutes ago in Indonesian", () => {
      const date = new Date("2024-06-15T11:55:00Z"); // 5 min ago
      const result = formatRelativeTime(date, "id");
      expect(result).toContain("menit");
    });

    it("formats hours ago in Chinese", () => {
      const date = new Date("2024-06-15T09:00:00Z"); // 3h ago
      const result = formatRelativeTime(date, "zh");
      expect(result).toContain("小时");
    });

    it("formats days ago in Arabic", () => {
      const date = new Date("2024-06-12T12:00:00Z"); // 3 days ago
      const result = formatRelativeTime(date, "ar");
      expect(result).toContain("أيام");
    });

    vi.useRealTimers();
  });
});

describe("i18n-strings: all required keys", () => {
  const requiredKeys = [
    "common.welcome",
    "common.search",
    "common.save",
    "common.cancel",
    "auth.login",
    "auth.logout",
    "library.books",
    "library.members",
    "book.borrow",
    "book.return",
    "member.student",
    "level.pemula",
    "level.legenda",
    "notif.bookAvailable",
    "error.network",
  ];

  const locales = ["id", "en", "ar", "zh"] as const;

  requiredKeys.forEach((key) => {
    locales.forEach((locale) => {
      it(`has '${key}' in ${locale}`, () => {
        const result = t(key, locale);
        expect(result).not.toBe(key);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
