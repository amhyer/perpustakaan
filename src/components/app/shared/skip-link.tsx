"use client";

/**
 * Skip-to-content link untuk accessibility.
 *
 * Hidden by default, muncul saat di-focus dengan Tab.
 * Standard pattern untuk screen reader users.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Langsung ke konten utama
    </a>
  );
}
