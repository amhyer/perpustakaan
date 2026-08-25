/**
 * Rate Limiting — anti-brute-force untuk endpoint sensitif.
 *
 * Implementasi: in-memory sliding window menggunakan Map.
 * Cocok untuk deployment single-instance (SQLite + standalone).
 *
 * Untuk multi-instance production, ganti dengan Redis-backed limiter
 * (mis. @upstash/ratelimit) — interface tetap sama.
 *
 * Cara pakai:
 *   const { success, remaining, reset } = await rateLimit({
 *     key: `login:${ip}`,
 *     limit: 5,
 *     windowMs: 60_000,
 *   });
 *   if (!success) return NextResponse.json({ error: "..." }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp ms
}

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // timestamp ms kapan reset
  retryAfter: number; // detik sampai reset
  limit: number; // batas maksimal dalam window
}

// In-memory store. Auto-cleanup setiap 5 menit untuk hindari memory leak.
const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  // Entry baru atau sudah expired → reset
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowMs,
      retryAfter: 0,
      limit,
    };
  }

  // Increment
  entry.count += 1;
  store.set(key, entry);

  const success = entry.count <= limit;
  return {
    success,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    limit,
  };
}

/**
 * Helper: ambil identifier dari request (IP address).
 *
 * SECURITY: X-Forwarded-For hanya dipercaya jika TRUST_PROXY=true.
 * Tanpa env ini, header bisa di-spoof oleh client untuk bypass rate limit
 * (mis. brute-force login dari IP berbeda-beda). X-Real-IP juga tidak
 * dipercaya kecuali Anda yakin reverse proxy selalu menimpa header ini.
 * Set TRUST_PROXY=true hanya jika reverse proxy (Caddy/Nginx) yang Anda
 * kendalikan selalu menimpa header ini dan client tidak bisa mengirimnya langsung.
 */
export function getClientIdentifier(req: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    // Trusted: proxy menjamin X-Forwarded-For akurat
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
  }
  // Tidak trust header proxy — gunakan identitas lokal atau fallback.
  // X-Real-Ip juga bisa di-spoof, hanya gunakan jika proxy yang Anda kendalikan
  // secara eksplisit menimpa header ini. Secara default, abaikan.
  if (process.env.TRUST_PROXY === "true") {
    const real = req.headers.get("x-real-ip");
    if (real) return real;
  }
  return "unknown";
}

/**
 * Buat response 429 dengan header RateLimit standar.
 */
export function rateLimitResponse(result: RateLimitResult, message?: string) {
  return new Response(
    JSON.stringify({
      error: message || "Terlalu banyak percobaan. Coba lagi nanti.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...rateLimitHeaders(result, { "Retry-After": String(result.retryAfter) }),
      },
    }
  );
}

/**
 * Rate limit headers untuk disuntikkan ke response (baik 200 maupun 429).
 * Berguna untuk endpoint sensitif agar client tahu sisa kuota.
 *
 * Usage:
 *   const headers = rateLimitHeaders(result);
 *   return NextResponse.json(data, { headers });
 */
export function rateLimitHeaders(
  result: RateLimitResult,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.reset / 1000)),
    ...extra,
  };
}

// Preset configurations untuk endpoint sensitif
export const RATE_LIMITS = {
  LOGIN: { limit: 5, windowMs: 60_000 }, // 5 attempt / menit
  FORGOT_PASSWORD: { limit: 3, windowMs: 5 * 60_000 }, // 3 / 5 menit
  CHANGE_PASSWORD: { limit: 5, windowMs: 60_000 }, // 5 / menit
  BOOK_IMPORT: { limit: 10, windowMs: 60_000 }, // 10 / menit
  UPLOAD: { limit: 30, windowMs: 60_000 }, // 30 / menit
  WHATSAPP_SEND: { limit: 60, windowMs: 60_000 }, // 60 msg / menit
  EMAIL_SEND: { limit: 30, windowMs: 60_000 }, // 30 email / menit
} as const;
