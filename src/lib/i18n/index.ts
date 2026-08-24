/**
 * Internationalization (i18n) foundation.
 *
 * Sprint 4: Setup struktur untuk multi-bahasa di masa depan.
 * Saat ini hanya 'id' (Indonesian) yang dipakai — fallback otomatis.
 *
 * Untuk pakai:
 * ```ts
 * import { t, getLocale } from "@/lib/i18n";
 *
 * // Di komponen:
 * const message = t("dashboard.welcome", { name: "Budi" });
 * // → "Selamat datang, Budi!"
 *
 * // Get current locale
 * const current = getLocale(); // "id" | "en"
 * ```
 *
 * Future enhancements:
 * - User preference for locale (extend UserPreference)
 * - Server-side locale detection dari Accept-Language header
 * - Dynamic loading of locale chunks
 *
 * Catatan: ini adalah foundation. Untuk refactor komponen existing
 * pakai t() butuh effort besar. Sebaiknya dilakukan bertahap.
 */

import { id, type IdLocale } from "./locales/id";
import { en } from "./locales/en";

export type Locale = "id" | "en" | "ar" | "zh";

export type Translations = IdLocale;

/**
 * Registry semua locale yang tersedia. Tambah entry baru di sini
 * untuk enable bahasa baru.
 */
import { ar } from "./locales/ar";
import { zh } from "./locales/zh";
const LOCALES: Record<Locale, Translations> = {
  id,
  en,
  ar,
  zh,
};

/**
 * Current active locale. Saat ini hardcode ke 'id'.
 * TODO: baca dari user preference atau browser setting.
 */
let currentLocale: Locale = "id";

/**
 * Get currently active locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Set active locale. Berguna untuk test atau feature flag.
 * Tidak dipakai di production runtime (butuh context provider).
 */
export function setLocale(locale: Locale): void {
  if (LOCALES[locale]) {
    currentLocale = locale;
  } else {
    console.warn(`[i18n] Locale "${locale}" not available, using default "id"`);
  }
}

/**
 * Type-safe path untuk translation key.
 * Misal "dashboard.welcome" → TranslationKey path.
 */
type Join<K, P> = K extends string
  ? P extends string
    ? `${K}.${P}`
    : never
  : never;

type Paths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends string
          ? K
          : T[K] extends object
          ? Join<K, Paths<T[K]>>
          : never
        : never;
    }[keyof T]
  : never;

export type TranslationPath = Paths<Translations>;

/**
 * Lookup translation berdasarkan dot-path.
 *
 * @example
 * lookup("dashboard.welcome") // "Selamat datang, {name}!"
 * lookup("roles.LIBRARIAN") // "Pustakawan"
 */
function lookup(path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = LOCALES[currentLocale];
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Substitute placeholders dalam translation string.
 * Format: "{keyName}" akan diganti dengan value dari params.
 *
 * @example
 * interpolate("Hello, {name}!", { name: "World" })
 * // → "Hello, World!"
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

/**
 * Translate function — ambil string dari locale aktif dengan interpolation.
 *
 * @param path - dot-path ke translation key, misal "dashboard.welcome"
 * @param params - object dengan variabel untuk substitusi
 * @returns translated string, atau path jika tidak ditemukan (untuk debugging)
 *
 * @example
 * t("dashboard.welcome", { name: "Budi" })
 * t("roles.LIBRARIAN")
 */
export function t(
  path: TranslationPath,
  params?: Record<string, string | number>
): string {
  const template = lookup(path);
  if (template === undefined) {
    // Fallback: return path agar developer lihat key yang missing
    if (typeof console !== "undefined" && process.env.NODE_ENV !== "test") {
      console.warn(`[i18n] Missing translation: "${path}"`);
    }
    return path;
  }
  return interpolate(template, params);
}

/**
 * Format number sesuai locale (decimal separator, dll).
 * Untuk saat ini hardcode ke 'id-ID' (koma untuk desimal).
 *
 * @example
 * formatNumber(1234.5) // "1.234,5" (id-ID)
 */
export function formatNumber(value: number, locale: Locale = currentLocale): string {
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US").format(value);
}

/**
 * Format currency sesuai locale. Untuk saat ini hardcode ke IDR.
 */
export function formatCurrency(
  value: number,
  locale: Locale = currentLocale
): string {
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Format date sesuai locale.
 */
export function formatDateLocale(
  date: Date | string,
  locale: Locale = currentLocale
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format date short sesuai locale.
 */
export function formatDateShortLocale(
  date: Date | string,
  locale: Locale = currentLocale
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export { id, en };
export type { IdLocale };
