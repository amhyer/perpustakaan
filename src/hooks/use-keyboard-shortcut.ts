"use client";

import { useEffect } from "react";

/**
 * useKeyboardShortcut — register global keyboard shortcut.
 *
 * Example:
 *   useKeyboardShortcut("k", () => openSearch(), { meta: true }); // Cmd+K
 *   useKeyboardShortcut("Escape", () => closeModal());
 */
export interface KeyboardShortcutOptions {
  /** Cmd on Mac, Ctrl on Windows */
  meta?: boolean;
  /** Shift key */
  shift?: boolean;
  /** Alt/Option key */
  alt?: boolean;
  /** Disabled state */
  enabled?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: KeyboardShortcutOptions = {}
) {
  const { meta = false, shift = false, alt = false, enabled = true, preventDefault = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Check modifiers
      const metaPressed = e.metaKey || e.ctrlKey;
      if (meta !== metaPressed) return;
      if (shift !== e.shiftKey) return;
      if (alt !== e.altKey) return;

      // Check key (case-insensitive)
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      if (preventDefault) e.preventDefault();
      callback(e);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, meta, shift, alt, enabled, preventDefault]);
}

/**
 * Hook untuk menampilkan daftar shortcuts (untuk help modal)
 */
export interface Shortcut {
  keys: string;
  description: string;
  category?: string;
}
