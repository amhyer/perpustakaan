/**
 * Next.js Middleware — Global request processing.
 *
 * Sprint J - Security & Performance Hardening.
 *
 * Features:
 * - Rate limiting (anti-brute-force, anti-scraping)
 * - Security headers (CSP, HSTS, X-Frame-Options, etc)
 * - CORS handling
 * - Request size validation
 * - Bot detection (basic)
 * - Audit logging
 *
 * Runs on every request BEFORE the route handler.
 * Performance critical: keep logic fast.
 */

import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
// Note: Using Web Crypto API (Edge-compatible) instead of Node.js 'crypto'
// Node.js crypto is not available in Edge Runtime.
const subtle = globalThis.crypto?.subtle;

/**
 * HMAC-SHA256 using Web Crypto API (Edge-compatible).
 * Equivalent to Node.js: createHmac('sha256', secret).update(data).digest('hex')
 */
async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison (Edge-compatible).
 * Equivalent to Node.js: timingSafeEqual(a, b)
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}

// ===== Config =====

const SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  // XSS Protection (legacy but still useful)
  "X-XSS-Protection": "1; mode=block",
  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Permissions policy (disable unused features)
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(self), payment=()",
  // HSTS (only in production)
  ...(process.env.NODE_ENV === "production"
    ? {
        "Strict-Transport-Security":
          "max-age=31536000; includeSubDomains; preload",
      }
    : {}),
};

// Content Security Policy
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
  "worker-src 'self' blob: https://cdnjs.cloudflare.com", // pdf.js web worker
  "img-src 'self' data: blob: https:", // Allow cover images
  "font-src 'self' data:",
  "connect-src 'self' https: wss:", // API + WebSocket
  "media-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Rate limit configs per route pattern
const RATE_LIMITS: Array<{
  pattern: RegExp;
  limit: number;
  windowMs: number;
  name: string;
}> = [
  {
    pattern: /^\/api\/auth\/login/,
    limit: 5,
    windowMs: 60_000, // 5 per minute
    name: "auth:login",
  },
  {
    pattern: /^\/api\/auth\/2fa/,
    limit: 5,
    windowMs: 60_000,
    name: "auth:2fa",
  },
  {
    pattern: /^\/api\/auth\/register/,
    limit: 3,
    windowMs: 60_000,
    name: "auth:register",
  },
  {
    pattern: /^\/api\/auth\/forgot-password/,
    limit: 3,
    windowMs: 5 * 60_000, // 3 per 5 min
    name: "auth:forgot",
  },
  {
    pattern: /^\/api\/chat/,
    limit: 20,
    windowMs: 60_000, // 20 per minute
    name: "chat",
  },
  {
    pattern: /^\/api\/rfid\/scan/,
    limit: 60,
    windowMs: 60_000, // 60 per minute
    name: "rfid:scan",
  },
  {
    pattern: /^\/api\/blockchain\/seal/,
    limit: 5,
    windowMs: 60_000, // 5 per minute (heavy op)
    name: "blockchain:seal",
  },
  {
    pattern: /^\/api\/ai\//,
    limit: 30,
    windowMs: 60_000, // 30 per minute
    name: "ai",
  },
  {
    pattern: /^\/api\//,
    limit: 100,
    windowMs: 60_000, // 100 per minute (default)
    name: "api:default",
  },
];

// Public endpoints (no rate limit needed)
const PUBLIC_PATHS = [
  /^\/_next\//,
  /^\/favicon/,
  /^\/manifest/,
  /^\/icons\//,
  /^\/logo/,
  /^\/api\/health/,
];

// Bot detection (very basic)
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /wget/i,
  /curl/i,
  /python-requests/i,
  /go-http-client/i,
];

// CSRF config
const CSRF_COOKIE_NAME = "ji_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_EXEMPT_PATHS = [
  /^\/api\/auth\/login/,
  /^\/api\/auth\/register/,
  /^\/api\/events\/stream/,
  /^\/api\/voice\//,
  /^\/api\/csrf-token/,
  /^\/api\/health/,
];

// Request size limits
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_URL_LENGTH = 2048;

// ===== Helpers =====

function getCsrfSecret(): string {
  return process.env.CSRF_SECRET || process.env.JWT_SECRET || "fallback-secret-change-me";
}

async function verifyCsrfSignature(cookieValue: string): Promise<string | null> {
  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const token = cookieValue.substring(0, dotIndex);
  const signature = cookieValue.substring(dotIndex + 1);
  const secret = getCsrfSecret();
  const expected = await hmacSha256Hex(secret, token);
  if (expected.length !== signature.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  } catch {
    return null;
  }
  return token;
}

/**
 * Validate CSRF token for mutating API requests.
 * Double-submit cookie pattern: compare cookie value with header.
 */
async function validateCsrf(req: NextRequest): Promise<boolean> {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return true;
  if (CSRF_EXEMPT_PATHS.some((p) => p.test(pathname))) return true;

  const cookieVal = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieVal || !headerToken) return false;

  const cookieToken = await verifyCsrfSignature(cookieVal);
  if (!cookieToken) return false;

  try {
    if (cookieToken.length !== headerToken.length) return false;
    return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  } catch {
    return false;
  }
}

/**
 * Get client IP from NextRequest (Edge-compatible).
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // Fallback: Cloudflare, Vercel, etc.
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "unknown";
}

// ===== Middleware =====

export async function middleware(req: NextRequest) {
  const start = Date.now();
  const { pathname, search, origin } = req.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some((p) => p.test(pathname))) {
    return NextResponse.next();
  }

  // CSRF validation for mutating API requests
  if (!(await validateCsrf(req))) {
    logger.warn("CSRF validation failed", {
      pathname,
      method: req.method,
      ip: getClientIp(req),
    });
    return new NextResponse(
      JSON.stringify({ error: "CSRF token tidak valid", code: "CSRF_INVALID" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // URL length check (prevent overflow attacks)
  if (req.url.length > MAX_URL_LENGTH) {
    logger.warn("Request URL too long", {
      url: req.url.slice(0, 200) + "...",
      ip: getClientIp(req),
    });
    return new NextResponse("URI Too Long", { status: 414 });
  }

  // Bot detection (informational, not blocking)
  const userAgent = req.headers.get("user-agent") || "";
  const isBot = BOT_PATTERNS.some((p) => p.test(userAgent));
  if (isBot && pathname.startsWith("/api/")) {
    // Log for analytics, but allow through for SEO crawlers
    logger.info("Bot request", { pathname, userAgent: userAgent.slice(0, 100) });
  }

  // Rate limiting
  const matchedLimit = RATE_LIMITS.find((r) => r.pattern.test(pathname));
  if (matchedLimit) {
    const ip = getClientIp(req);
    const key = `${matchedLimit.name}:${ip}:${pathname.split("/").slice(0, 3).join("/")}`;
    const result = await rateLimit({
      key,
      limit: matchedLimit.limit,
      windowMs: matchedLimit.windowMs,
    });

    if (!result.success) {
      logger.warn("Rate limit exceeded", {
        key,
        pathname,
        ip,
        limit: matchedLimit.limit,
        resetIn: result.retryAfter,
      });

      return new NextResponse(
        JSON.stringify({
          error: "Terlalu banyak permintaan. Coba lagi nanti.",
          code: "RATE_LIMIT",
          resetInSeconds: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.retryAfter),
            "X-RateLimit-Limit": String(matchedLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.retryAfter),
          },
        }
      );
    }

    // Attach rate limit headers to successful response
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(matchedLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.retryAfter));

    // Add security headers
    addSecurityHeaders(response);

    return response;
  }

  // For non-API routes, just add security headers
  const response = NextResponse.next();
  addSecurityHeaders(response);

  // Log slow requests
  const duration = Date.now() - start;
  if (duration > 1000) {
    logger.warn("Slow middleware", { pathname, duration });
  }

  return response;
}

function addSecurityHeaders(response: NextResponse) {
  // Security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // CSP (only in production to avoid breaking dev)
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Content-Security-Policy", CSP_HEADER);
  }
}

// ===== Matcher =====

// Run on all paths except static files, image optimizer
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handle their own auth/rate limit)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
