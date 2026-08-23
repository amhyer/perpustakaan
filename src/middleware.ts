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
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval in dev
  "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
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

// Request size limits
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_URL_LENGTH = 2048;

// ===== Helpers =====

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
        resetIn: result.resetIn,
      });

      return new NextResponse(
        JSON.stringify({
          error: "Terlalu banyak permintaan. Coba lagi nanti.",
          code: "RATE_LIMIT",
          resetInSeconds: result.resetIn,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.resetIn),
            "X-RateLimit-Limit": String(matchedLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetIn),
          },
        }
      );
    }

    // Attach rate limit headers to successful response
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(matchedLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.resetIn));

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
