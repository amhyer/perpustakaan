"use client";

import { useState, useEffect } from "react";

/**
 * useDebounce — return value yang di-debounce.
 *
 * Useful untuk:
 * - Search input yang trigger API call
 * - Auto-save form
 * - Window resize handler
 *
 * Example:
 *   const [search, setSearch] = useState("");
 *   const debouncedSearch = useDebounce(search, 300);
 *   useEffect(() => { fetch(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
