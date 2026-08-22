/**
 * Vitest global setup — executed before all tests.
 *
 * - Set required env vars untuk library code yang throw kalau missing
 * - Setup mock untuk fetch / external services
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-unit-tests-only";
process.env.NODE_ENV = "test";

// Silence logger saat test
if (!process.env.DEBUG) {
  console.log = () => {};
  console.warn = () => {};
}
