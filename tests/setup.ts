/**
 * Vitest global setup — executed before all tests.
 *
 * - Set required env vars untuk library code yang throw kalau missing
 * - Setup mock untuk fetch / external services
 */

import "@testing-library/jest-dom/vitest";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-unit-tests-only";
process.env.NODE_ENV = "test";

// Mock localStorage (happy-dom tidak selalu menyediakan)
if (typeof window !== "undefined" && !window.localStorage) {
  const store: Record<string, string> = {};
  window.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as Storage;
}

// Silence logger saat test
if (!process.env.DEBUG) {
  console.log = () => {};
  console.warn = () => {};
}
