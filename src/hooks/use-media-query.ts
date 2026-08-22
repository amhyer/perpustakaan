"use client";

import { useState, useEffect } from "react";

/**
 * useMediaQuery — subscribe ke CSS media query.
 *
 * Example:
 *   const isMobile = useMediaQuery("(max-width: 768px)");
 *   const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Initial check (handle SSR — default false di server)
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    setMatches(media.matches);

    // Subscribe to changes
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
