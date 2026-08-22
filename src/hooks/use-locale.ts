"use client";

import { useState, useEffect, useCallback } from "react";
import { defaultLocale, type Locale, locales } from "@/i18n/config";

const STORAGE_KEY = "app:locale";

/**
 * useLocale — manage user's preferred locale.
 * Persisted di localStorage.
 *
 * Note: Ini ringan version dari full i18n. Untuk full functionality,
 * pakai next-intl dengan middleware.
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (locales as readonly string[]).includes(stored)) {
      setLocaleState(stored as Locale);
    } else {
      // Auto-detect dari browser
      const browser = navigator.language.toLowerCase();
      const matched = locales.find((l) => browser.startsWith(l));
      if (matched) setLocaleState(matched);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  return { locale, setLocale };
}
