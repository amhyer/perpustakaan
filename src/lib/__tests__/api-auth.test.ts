/**
 * Unit tests untuk src/lib/api-auth.ts
 * Test: API key generation, hashing, prefix detection
 */

import { describe, it, expect } from "vitest";
import { generateApiKey } from "../api-auth";

describe("generateApiKey", () => {
  describe("env='live' (default)", () => {
    it("prefix ji_live_", () => {
      const { plain } = generateApiKey("live");
      expect(plain.startsWith("ji_live_")).toBe(true);
    });

    it("total length prefix + 64 hex chars", () => {
      const { plain } = generateApiKey("live");
      expect(plain.length).toBe("ji_live_".length + 64);
    });
  });

  describe("env='test'", () => {
    it("prefix ji_test_", () => {
      const { plain } = generateApiKey("test");
      expect(plain.startsWith("ji_test_")).toBe(true);
    });
  });

  it("setiap generate return key unik", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey().plain));
    expect(keys.size).toBe(100);
  });

  it("prefix adalah 12 char pertama", () => {
    const { plain, prefix } = generateApiKey();
    expect(prefix).toBe(plain.slice(0, 12));
  });
});
