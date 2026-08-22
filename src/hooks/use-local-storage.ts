"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * useLocalStorage — sync state ke localStorage.
 *
 * Features:
 * - SSR-safe (return initial value di server)
 * - Auto-save saat value berubah
 * - Parse/stringify JSON
 * - Cross-tab sync via storage event
 *
 * Example:
 *   const [theme, setTheme] = useLocalStorage("theme", "light");
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // State untuk sync nilai, initialized dari localStorage kalau ada
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch (err) {
      console.warn(`[useLocalStorage] Error reading key "${key}":`, err);
      return initialValue;
    }
  });

  // Update localStorage saat value berubah
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[useLocalStorage] Error writing key "${key}":`, err);
    }
  }, [key, value]);

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const update = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === "function" ? (next as (p: T) => T)(prev) : next));
  }, []);

  return [value, update];
}
