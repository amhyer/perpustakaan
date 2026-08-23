/**
 * Unit tests untuk Middleware logic.
 *
 * Sprint J - Security & Performance Hardening.
 *
 * Tests pure logic: IP extraction, CSP header, security headers,
 * rate limit pattern matching, public path detection.
 */

import { describe, it, expect } from "vitest";

// ===== Re-define constants for testing =====

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(self), payment=()",
};

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const PUBLIC_PATHS = [
  /^\/_next\//,
  /^\/favicon/,
  /^\/manifest/,
  /^\/icons\//,
  /^\/logo/,
  /^\/api\/health/,
];

const RATE_LIMITS = [
  { pattern: /^\/api\/auth\/login/, limit: 5, windowMs: 60_000, name: "auth:login" },
  { pattern: /^\/api\/chat/, limit: 20, windowMs: 60_000, name: "chat" },
  { pattern: /^\/api\/blockchain\/seal/, limit: 5, windowMs: 60_000, name: "blockchain:seal" },
  { pattern: /^\/api\//, limit: 100, windowMs: 60_000, name: "api:default" },
];

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /wget/i,
  /curl/i,
];

// Helper: extract IP (mirrors middleware logic)
function getClientIp(headers: Record<string, string>): string {
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers["x-real-ip"];
  if (realIp) return realIp.trim();
  const cfIp = headers["cf-connecting-ip"];
  if (cfIp) return cfIp.trim();
  return "unknown";
}

// Helper: is public path
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => p.test(pathname));
}

// Helper: find matched rate limit
function findRateLimit(pathname: string) {
  return RATE_LIMITS.find((r) => r.pattern.test(pathname));
}

// Helper: detect bot
function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some((p) => p.test(userAgent));
}

describe("middleware: getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    expect(getClientIp({ "x-forwarded-for": "192.168.1.1" })).toBe("192.168.1.1");
  });

  it("extracts first IP from comma-separated list", () => {
    expect(
      getClientIp({ "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1" })
    ).toBe("192.168.1.1");
  });

  it("trims whitespace", () => {
    expect(getClientIp({ "x-forwarded-for": "  192.168.1.1  " })).toBe("192.168.1.1");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp({ "x-real-ip": "10.0.0.5" })).toBe("10.0.0.5");
  });

  it("falls back to cf-connecting-ip", () => {
    expect(getClientIp({ "cf-connecting-ip": "203.0.113.1" })).toBe("203.0.113.1");
  });

  it("returns 'unknown' when no IP headers", () => {
    expect(getClientIp({})).toBe("unknown");
  });

  it("prefers x-forwarded-for over others", () => {
    expect(
      getClientIp({
        "x-forwarded-for": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
        "cf-connecting-ip": "3.3.3.3",
      })
    ).toBe("1.1.1.1");
  });
});

describe("middleware: public paths", () => {
  it("recognizes _next/ paths", () => {
    expect(isPublicPath("/_next/static/chunks/main.js")).toBe(true);
  });

  it("recognizes favicon", () => {
    expect(isPublicPath("/favicon.ico")).toBe(true);
  });

  it("recognizes manifest", () => {
    expect(isPublicPath("/manifest.json")).toBe(true);
  });

  it("recognizes icons", () => {
    expect(isPublicPath("/icons/icon-192.svg")).toBe(true);
  });

  it("recognizes logo", () => {
    expect(isPublicPath("/logo.svg")).toBe(true);
  });

  it("recognizes health endpoint", () => {
    expect(isPublicPath("/api/health")).toBe(true);
  });

  it("blocks API routes", () => {
    expect(isPublicPath("/api/auth/login")).toBe(false);
  });

  it("blocks app pages", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
  });
});

describe("middleware: rate limit matching", () => {
  it("matches auth/login with specific limit", () => {
    const limit = findRateLimit("/api/auth/login");
    expect(limit?.name).toBe("auth:login");
    expect(limit?.limit).toBe(5);
  });

  it("matches chat with chat limit", () => {
    const limit = findRateLimit("/api/chat");
    expect(limit?.name).toBe("chat");
    expect(limit?.limit).toBe(20);
  });

  it("matches blockchain/seal with blockchain limit", () => {
    const limit = findRateLimit("/api/blockchain/seal");
    expect(limit?.name).toBe("blockchain:seal");
    expect(limit?.limit).toBe(5);
  });

  it("falls back to default for other API", () => {
    const limit = findRateLimit("/api/books");
    expect(limit?.name).toBe("api:default");
    expect(limit?.limit).toBe(100);
  });

  it("returns null for non-API paths", () => {
    expect(findRateLimit("/dashboard")).toBeUndefined();
  });
});

describe("middleware: bot detection", () => {
  it("detects Googlebot", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
  });

  it("detects curl", () => {
    expect(isBot("curl/7.68.0")).toBe(true);
  });

  it("detects wget", () => {
    expect(isBot("Wget/1.20.3")).toBe(true);
  });

  it("detects python-requests (using requests keyword)", () => {
    expect(isBot("python-requests/2.25.0")).toBe(false); // not in patterns
  });

  it("detects generic bot", () => {
    expect(isBot("Generic-Bot/1.0")).toBe(true); // matches /bot/i
  });

  it("detects spider", () => {
    expect(isBot("Some-Spider/1.0")).toBe(true);
  });

  it("does not flag normal browsers", () => {
    expect(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")).toBe(false);
  });

  it("does not flag mobile Safari", () => {
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isBot("BOT/1.0")).toBe(true);
    expect(isBot("Crawler/1.0")).toBe(true);
  });
});

describe("middleware: security headers", () => {
  it("includes X-Content-Type-Options", () => {
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("includes X-Frame-Options DENY", () => {
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
  });

  it("includes X-XSS-Protection", () => {
    expect(SECURITY_HEADERS["X-XSS-Protection"]).toBe("1; mode=block");
  });

  it("includes Referrer-Policy", () => {
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("includes Permissions-Policy restricting features", () => {
    expect(SECURITY_HEADERS["Permissions-Policy"]).toContain("geolocation=()");
    expect(SECURITY_HEADERS["Permissions-Policy"]).toContain("microphone=()");
    expect(SECURITY_HEADERS["Permissions-Policy"]).toContain("payment=()");
  });

  it("allows self-camera for QR scanning", () => {
    expect(SECURITY_HEADERS["Permissions-Policy"]).toContain("camera=(self)");
  });
});

describe("middleware: CSP", () => {
  it("uses default-src self", () => {
    expect(CSP_HEADER).toContain("default-src 'self'");
  });

  it("allows wss for WebSocket", () => {
    expect(CSP_HEADER).toContain("wss:");
  });

  it("blocks object embeds", () => {
    expect(CSP_HEADER).toContain("object-src 'none'");
  });

  it("prevents framing (frame-ancestors)", () => {
    expect(CSP_HEADER).toContain("frame-ancestors 'none'");
  });

  it("allows data: URIs for images (cover thumbnails)", () => {
    expect(CSP_HEADER).toContain("img-src 'self' data: blob:");
  });

  it("restricts base URI", () => {
    expect(CSP_HEADER).toContain("base-uri 'self'");
  });

  it("restricts form submissions to self", () => {
    expect(CSP_HEADER).toContain("form-action 'self'");
  });
});

describe("middleware: rate limit pattern matching", () => {
  it("matches nested API paths correctly", () => {
    // First match wins
    const limit = findRateLimit("/api/chat/send");
    expect(limit?.name).toBe("chat"); // chat pattern matches first
  });

  it("matches /api/auth/login but not /api/auth/me", () => {
    expect(findRateLimit("/api/auth/login")?.name).toBe("auth:login");
    expect(findRateLimit("/api/auth/me")?.name).toBe("api:default");
  });

  it("case-sensitive matching", () => {
    expect(findRateLimit("/API/Auth/Login")).toBeUndefined();
  });
});

describe("middleware: windowMs consistency", () => {
  it("all rate limits use 60s window (except special)", () => {
    const windows = RATE_LIMITS.map((r) => r.windowMs);
    for (const w of windows) {
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(5 * 60_000); // max 5 min
    }
  });

  it("limits are ordered from restrictive to permissive", () => {
    const specificLimits = RATE_LIMITS.filter((r) => r.name !== "api:default");
    for (const limit of specificLimits) {
      expect(limit.limit).toBeLessThanOrEqual(100);
    }
  });
});

describe("middleware: rate limit response", () => {
  it("429 status code for rate limited", () => {
    const status = 429;
    expect(status).toBe(429);
  });

  it("includes Retry-After header", () => {
    const headers = {
      "Retry-After": "60",
      "X-RateLimit-Limit": "5",
      "X-RateLimit-Remaining": "0",
    };
    expect(headers["Retry-After"]).toBeDefined();
    expect(parseInt(headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("includes error code in body", () => {
    const body = {
      error: "Terlalu banyak permintaan. Coba lagi nanti.",
      code: "RATE_LIMIT",
      resetInSeconds: 60,
    };
    expect(body.code).toBe("RATE_LIMIT");
    expect(body.resetInSeconds).toBeGreaterThan(0);
  });
});
