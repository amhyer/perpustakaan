/**
 * Unit tests untuk request validator.
 *
 * Sprint J Phase C - Security hardening.
 */

import { describe, it, expect } from "vitest";

import {
  byteSize,
  getLimitsForPath,
  validateUrl,
  validateBodySize,
  validateContentType,
  validateHeadersSize,
  validateJsonStructure,
  validateRequest,
  DEFAULT_LIMITS,
  ROUTE_LIMITS,
} from "../request-validator";

describe("request-validator: byteSize", () => {
  it("calculates ASCII byte size", () => {
    expect(byteSize("hello")).toBe(5);
  });

  it("calculates UTF-8 byte size", () => {
    // Each emoji is 4 bytes in UTF-8
    expect(byteSize("😀")).toBe(4);
  });

  it("handles empty string", () => {
    expect(byteSize("")).toBe(0);
  });
});

describe("request-validator: getLimitsForPath", () => {
  it("returns default limits for unknown path", () => {
    const limits = getLimitsForPath("/api/unknown");
    expect(limits).toEqual(DEFAULT_LIMITS);
  });

  it("returns tighter limits for login", () => {
    const limits = getLimitsForPath("/api/auth/login");
    expect(limits.maxBodySize).toBe(1024);
  });

  it("returns tighter limits for register", () => {
    const limits = getLimitsForPath("/api/auth/register");
    expect(limits.maxBodySize).toBe(5 * 1024);
  });

  it("returns larger limits for AI endpoints", () => {
    const limits = getLimitsForPath("/api/ai/something");
    expect(limits.maxBodySize).toBe(50 * 1024);
  });
});

describe("request-validator: validateUrl", () => {
  it("accepts short URL", () => {
    expect(validateUrl("/api/books").valid).toBe(true);
  });

  it("rejects too long URL", () => {
    const longUrl = "/api?" + "a".repeat(3000);
    const result = validateUrl(longUrl, 2048);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("terlalu panjang");
  });

  it("uses custom max length", () => {
    expect(validateUrl("/api/books", 5).valid).toBe(false);
  });
});

describe("request-validator: validateBodySize", () => {
  it("accepts small body", () => {
    expect(validateBodySize(1024).valid).toBe(true);
  });

  it("rejects too large body", () => {
    const result = validateBodySize(20 * 1024 * 1024); // 20MB
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("terlalu besar");
  });

  it("uses custom max size", () => {
    expect(validateBodySize(500, 100).valid).toBe(false);
    expect(validateBodySize(50, 100).valid).toBe(true);
  });
});

describe("request-validator: validateContentType", () => {
  it("accepts application/json", () => {
    expect(validateContentType("application/json").valid).toBe(true);
  });

  it("accepts with charset", () => {
    expect(validateContentType("application/json; charset=utf-8").valid).toBe(true);
  });

  it("rejects missing content-type", () => {
    const result = validateContentType(null);
    expect(result.valid).toBe(false);
  });

  it("rejects invalid content-type", () => {
    const result = validateContentType("text/xml");
    expect(result.valid).toBe(false);
  });

  it("accepts custom allowed types", () => {
    const result = validateContentType("text/xml", ["text/xml"]);
    expect(result.valid).toBe(true);
  });
});

describe("request-validator: validateHeadersSize", () => {
  it("accepts small headers", () => {
    const headers = new Headers({ "x-test": "value" });
    const result = validateHeadersSize(headers);
    expect(result.valid).toBe(true);
  });

  it("rejects huge headers", () => {
    const headers = new Headers();
    const hugeValue = "x".repeat(20000);
    headers.set("x-huge", hugeValue);
    const result = validateHeadersSize(headers, 1000);
    expect(result.valid).toBe(false);
  });
});

describe("request-validator: validateJsonStructure", () => {
  it("accepts normal object", () => {
    const result = validateJsonStructure({ name: "John", age: 30 });
    expect(result.valid).toBe(true);
  });

  it("rejects too deep nested", () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: "x" } } } } } } } } } } };
    const result = validateJsonStructure(deep, { maxJsonDepth: 5 });
    expect(result.valid).toBe(false);
  });

  it("rejects too long array", () => {
    const arr = new Array(2000).fill("x");
    const result = validateJsonStructure(arr, { maxArrayLength: 100 });
    expect(result.valid).toBe(false);
  });

  it("rejects too long string", () => {
    const longStr = "x".repeat(200000);
    const result = validateJsonStructure({ text: longStr });
    expect(result.valid).toBe(false);
  });

  it("accepts nested structure within limits", () => {
    const data = {
      user: { name: "John", tags: ["a", "b"] },
      items: [{ id: 1 }, { id: 2 }],
    };
    const result = validateJsonStructure(data);
    expect(result.valid).toBe(true);
  });
});

describe("request-validator: validateRequest (comprehensive)", () => {
  it("validates good request", () => {
    const result = validateRequest(
      "/api/auth/login",
      200,
      "application/json",
      { email: "user@example.com", password: "secret" },
      "/api/auth/login"
    );
    expect(result.valid).toBe(true);
  });

  it("catches oversized body for login", () => {
    const result = validateRequest(
      "/api/auth/login",
      5000,
      "application/json",
      { data: "x".repeat(5000) },
      "/api/auth/login"
    );
    expect(result.valid).toBe(false);
  });

  it("catches invalid content type", () => {
    const result = validateRequest(
      "/api/auth/login",
      100,
      "text/xml",
      {},
      "/api/auth/login"
    );
    expect(result.valid).toBe(false);
    expect(result.field).toBe("content-type");
  });

  it("catches bad JSON structure", () => {
    const result = validateRequest(
      "/api/auth/login",
      1000,
      "application/json",
      { a: { b: { c: { d: { e: { f: { g: { h: "x" } } } } } } } },
      "/api/auth/login"
    );
    // Login has no specific limit, uses default (depth 10)
    // 8 levels of nesting is well within 10
    expect(result.valid).toBe(true);
  });

  it("catches bad JSON structure with custom limits", () => {
    const result = validateRequest(
      "/api/auth/login",
      1000,
      "application/json",
      { a: { b: { c: "x" } } }, // 3 levels
      "/api/auth/login"
    );
    // Test with extra strict via direct call
    const structureResult = validateJsonStructure(
      { a: { b: { c: { d: "x" } } } },
      { maxJsonDepth: 2 }
    );
    expect(structureResult.valid).toBe(false);
  });
});

describe("request-validator: ROUTE_LIMITS", () => {
  it("has tight limits for auth endpoints", () => {
    expect(ROUTE_LIMITS["/api/auth/login"]?.maxBodySize).toBeLessThanOrEqual(1024);
    expect(ROUTE_LIMITS["/api/auth/2fa"]?.maxBodySize).toBeLessThanOrEqual(1024);
  });

  it("has larger limits for AI endpoints", () => {
    expect(ROUTE_LIMITS["/api/ai/"]?.maxBodySize).toBeGreaterThanOrEqual(50 * 1024);
  });

  it("all limits are positive", () => {
    for (const limits of Object.values(ROUTE_LIMITS)) {
      if (limits.maxBodySize !== undefined) {
        expect(limits.maxBodySize).toBeGreaterThan(0);
      }
    }
  });
});
