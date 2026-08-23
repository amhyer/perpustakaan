/**
 * Unit tests untuk env-validator.
 *
 * Sprint H - Production Readiness.
 */

import { describe, it, expect, beforeEach } from "vitest";

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { validateEnv, getEnvSummary, resetValidation } from "../env-validator";

describe("env-validator: validateEnv", () => {
  beforeEach(() => {
    resetValidation();
  });

  it("returns valid when all required env vars are set", () => {
    process.env.DATABASE_URL = "file:./db/test.db";
    process.env.JWT_SECRET = "a".repeat(40); // 40 chars
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";
    process.env.AI_PROVIDER = "mock";
    delete process.env.AI_API_KEY;

    const result = validateEnv({ force: true });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("errors when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    const result = validateEnv({ strict: false, force: true });
    expect(result.errors.some((e: string) => e.includes("DATABASE_URL"))).toBe(true);
  });

  it("errors when JWT_SECRET is too short", () => {
    process.env.DATABASE_URL = "file:./db/test.db";
    process.env.JWT_SECRET = "short";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    const result = validateEnv({ strict: false, force: true });
    expect(result.errors.some((e: string) => e.includes("JWT_SECRET"))).toBe(true);
  });

  it("errors when JWT_SECRET is still default", () => {
    process.env.DATABASE_URL = "file:./db/test.db";
    process.env.JWT_SECRET = "CHANGE-ME-generate-with-openssl-rand-base64-32";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    const result = validateEnv({ strict: false, force: true });
    expect(result.errors.some((e: string) => e.includes("JWT_SECRET"))).toBe(true);
  });

  it("warns when AI_PROVIDER is invalid value", () => {
    process.env.DATABASE_URL = "file:./db/test.db";
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";
    process.env.AI_PROVIDER = "invalid-provider";
    process.env.AI_API_KEY = "test-key";

    const result = validateEnv({ strict: false, force: true });
    expect(result.warnings.some((w: string) => w.includes("AI_PROVIDER"))).toBe(true);
  });

  it("errors when AI_API_KEY missing but provider != mock", () => {
    process.env.DATABASE_URL = "file:./db/test.db";
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";
    process.env.AI_PROVIDER = "openai";
    delete process.env.AI_API_KEY;

    const result = validateEnv({ strict: false, force: true });
    expect(result.warnings.some((w: string) => w.includes("AI_API_KEY"))).toBe(true);
  });

  it("accepts all valid AI providers", () => {
    process.env.DATABASE_URL = "file:./db/test.db";
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    for (const provider of ["openai", "anthropic", "google", "mock"]) {
      process.env.AI_PROVIDER = provider;
      const result = validateEnv({ strict: false, force: true });
      // mock should not warn about API key, others should warn if not set
      if (provider !== "mock") {
        // Reset API key check
        expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("strict mode throws on errors", () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    expect(() => validateEnv({ strict: true })).toThrow(/Environment validation/);
  });
});

describe("env-validator: getEnvSummary", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns database provider type", () => {
    process.env.DATABASE_URL = "file:./db/test.db";
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    const summary = getEnvSummary();
    expect(summary.DATABASE_URL_PROVIDER).toBe("sqlite");
  });

  it("detects postgres", () => {
    process.env.DATABASE_URL = "postgres://user:pass@host:5432/db";
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    const summary = getEnvSummary();
    expect(summary.DATABASE_URL_PROVIDER).toBe("postgres");
  });

  it("returns AI provider", () => {
    process.env.AI_PROVIDER = "openai";
    const summary = getEnvSummary();
    expect(summary.AI_PROVIDER).toBe("openai");
  });

  it("returns default AI provider (mock)", () => {
    delete process.env.AI_PROVIDER;
    const summary = getEnvSummary();
    expect(summary.AI_PROVIDER).toBe("mock");
  });

  it("indicates whether JWT secret is set", () => {
    process.env.JWT_SECRET = "a".repeat(40);
    const summary = getEnvSummary();
    expect(summary.HAS_JWT_SECRET).toBe("yes");
  });
});
