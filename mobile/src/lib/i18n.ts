/**
 * i18n — Internationalization untuk mobile app.
 *
 * 3 locales: id (default), en, ar (RTL).
 * Same translations as web (sync from web lib/i18n/locales).
 */

import { I18n } from "i18n-js";
import * as RNLocalize from "react-native-localize";
import { id } from "./locales/id";
import { en } from "./locales/en";
import { ar } from "./locales/ar";

const i18n = new I18n({ id, en, ar });
i18n.enableFallback = true;
i18n.defaultLocale = "id";

export async function initI18n() {
  // Get device locale
  const locales = RNLocalize.getLocales();
  if (locales.length > 0) {
    const deviceLocale = locales[0].languageCode;
    if (["id", "en", "ar"].includes(deviceLocale)) {
      i18n.locale = deviceLocale;
    }
  }
  return i18n;
}

export function setLocale(locale: "id" | "en" | "ar") {
  i18n.locale = locale;
}

export function getLocale(): string {
  return i18n.locale;
}

export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

export function isRTL(): boolean {
  return i18n.locale === "ar";
}

export default i18n;
