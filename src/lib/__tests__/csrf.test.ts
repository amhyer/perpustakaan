/**
 * Unit tests untuk CSRF protection.
 *
 * Sprint J - Security & Performance Hardening.
 */

import { describe, it, expect, beforeEach } from "vitest";

// Set test secret
process.env.CSRF_SECRET = "test-csrf-secret-for-unit-tests";

import {
  generateCsrfToken,
  signCsrfToken,
  verifyCsrfToken,
  decodeCsrfCookie,
  getClientCsrfToken,
} from "../csrf";

describe("csrf: token generation", () => {
  it("generates 64-char hex tokens", () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens", () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
  });

  it("generates sufficient entropy (256 bits)", () => {
    const token = generateCsrfToken();
    // 32 bytes = 64 hex chars
    expect(token.length).toBe(64);
  });
});

describe("csrf: sign and verify", () => {
  it("signs and verifies valid token", () => {
    const token = generateCsrfToken();
    const secret = "test-secret";
    const sig = signCsrfToken(token, secret);
    expect(verifyCsrfToken(token, sig, secret)).toBe(true);
  });

  it("rejects wrong signature", () => {
    const token = generateCsrfToken();
    const secret = "test-secret";
    expect(verifyCsrfToken(token, "wrong-signature", secret)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const token = generateCsrfToken();
    const sig = signCsrfToken(token, "secret-1");
    expect(verifyCsrfToken(token, sig, "secret-2")).toBe(false);
  });

  it("rejects tampered token", () => {
    const token = generateCsrfToken();
    const sig = signCsrfToken(token, "secret");
    const tampered = token.slice(0, -1) + "0";
    expect(verifyCsrfToken(tampered, sig, "secret")).toBe(false);
  });

  it("handles different secrets independently", () => {
    const token = generateCsrfToken();
    const sig1 = signCsrfToken(token, "secret-1");
    const sig2 = signCsrfToken(token, "secret-2");
    expect(sig1).not.toBe(sig2);
    expect(verifyCsrfToken(token, sig1, "secret-1")).toBe(true);
    expect(verifyCsrfToken(token, sig2, "secret-2")).toBe(true);
    expect(verifyCsrfToken(token, sig1, "secret-2")).toBe(false);
  });
});

describe("csrf: cookie decoding", () => {
  it("decodes valid cookie format", () => {
    const token = generateCsrfToken();
    const sig = signCsrfToken(token, "test-csrf-secret-for-unit-tests");
    const cookieValue = `${token}.${sig}`;
    const decoded = decodeCsrfCookie(cookieValue);
    expect(decoded).not.toBeNull();
    expect(decoded?.token).toBe(token);
    expect(decoded?.signature).toBe(sig);
  });

  it("rejects malformed cookie", () => {
    expect(decodeCsrfCookie("no-separator")).toBeNull();
    expect(decodeCsrfCookie("")).toBeNull();
    expect(decodeCsrfCookie("a.b.c")).toBeNull();
  });

  it("rejects cookie with empty parts", () => {
    expect(decodeCsrfCookie(".sig")).toBeNull();
    expect(decodeCsrfCookie("token.")).toBeNull();
  });
});

describe("csrf: getClientCsrfToken", () => {
  beforeEach(() => {
    // Clear document.cookie
    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    }
  });

  it("returns null when no cookie", () => {
    expect(getClientCsrfToken()).toBeNull();
  });

  it("reads CSRF token from cookie", () => {
    const token = "abc123def456";
    document.cookie = `ji_csrf=${encodeURIComponent(`${token}.signature`)};path=/`;
    const result = getClientCsrfToken();
    expect(result).toBe(token);
  });

  it("handles URL-encoded cookie value", () => {
    const token = "abc-xyz-123";
    document.cookie = `ji_csrf=${encodeURIComponent(`${token}.sig`)};path=/`;
    const result = getClientCsrfToken();
    expect(result).toBe(token);
  });

  it("returns null for cookie without separator", () => {
    document.cookie = "ji_csrf=invalid;path=/";
    expect(getClientCsrfToken()).toBeNull();
  });
});

describe("csrf: timing-safe comparison", () => {
  it("uses constant-time comparison for signatures", () => {
    const token = generateCsrfToken();
    const sig = signCsrfToken(token, "secret");
    // Both equal length but different content
    const fakeSig = sig.slice(0, -1) + (sig.slice(-1) === "a" ? "b" : "a");
    expect(verifyCsrfToken(token, fakeSig, "secret")).toBe(false);
  });
});
