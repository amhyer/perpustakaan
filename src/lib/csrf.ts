/**
 * CSRF Protection — Cross-Site Request Forgery prevention.
 *
 * Sprint J - Security & Performance Hardening.
 *
 * Implements double-submit cookie pattern:
 * 1. Server sets a CSRF cookie (httpOnly=false, readable by JS)
 * 2. Client reads cookie and includes token in X-CSRF-Token header
 * 3. Server verifies header matches cookie
 *
 * For mutating requests (POST, PUT, PATCH, DELETE).
 *
 * Safe methods (GET, HEAD, OPTIONS) don't need CSRF.
 *
 * Why double-submit:
 * - No server-side session storage needed (stateless)
 * - Works with JWT auth
 * - Industry standard (used by OWASP)
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "ji_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface CsrfTokenPayload {
  token: string;
  expiresAt: number;
}

/**
 * Generate a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  // 32 bytes = 256 bits of entropy
  return randomBytes(32).toString("hex");
}

/**
 * Create a signed CSRF token (for tamper detection).
 */
export function signCsrfToken(token: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(token);
  return hmac.digest("hex");
}

/**
 * Verify a signed CSRF token.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyCsrfToken(
  token: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = signCsrfToken(token, secret);
    // timingSafeEqual requires equal lengths
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Get the CSRF secret from env.
 * Falls back to JWT_SECRET if CSRF_SECRET not set.
 */
function getCsrfSecret(): string {
  return process.env.CSRF_SECRET || process.env.JWT_SECRET || "fallback-secret-change-me";
}

/**
 * Set CSRF cookie on the response.
 * Cookie is httpOnly=false so client JS can read it.
 */
export function setCsrfCookie(response: NextResponse, token?: string): string {
  const csrfToken = token || generateCsrfToken();
  const secret = getCsrfSecret();
  const signature = signCsrfToken(csrfToken, secret);

  response.cookies.set(CSRF_COOKIE_NAME, `${csrfToken}.${signature}`, {
    httpOnly: false, // Must be readable by JS
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // Strict to prevent cross-site
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return csrfToken;
}

/**
 * Read CSRF token from request cookie.
 */
export async function getCsrfFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);
  if (!cookie) return null;

  // Format: token.signature
  const parts = cookie.value.split(".");
  if (parts.length !== 2) return null;
  const [token, signature] = parts;
  if (!token || !signature) return null;

  // Verify signature
  const secret = getCsrfSecret();
  if (!verifyCsrfToken(token, signature, secret)) return null;

  return token;
}

/**
 * Read CSRF token from request header.
 */
export function getCsrfFromHeader(req: Request): string | null {
  return req.headers.get(CSRF_HEADER_NAME);
}

/**
 * Verify CSRF token from request.
 * Returns true if valid, false if invalid.
 *
 * For double-submit pattern:
 * - Read token from cookie
 * - Read token from header
 * - Verify they match
 * - Verify signature is valid
 */
export async function verifyCsrfRequest(req: Request): Promise<boolean> {
  // Skip CSRF check for safe methods
  const method = req.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return true;

  // Only check mutating methods
  if (!MUTATING_METHODS.has(method)) return true;

  const cookieToken = await getCsrfFromCookie();
  const headerToken = getCsrfFromHeader(req);

  // Both must exist
  if (!cookieToken || !headerToken) return false;

  // Tokens must match (constant-time comparison)
  try {
    if (cookieToken.length !== headerToken.length) return false;
    return timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch {
    return false;
  }
}

/**
 * Generate a new CSRF token + return API response with cookie set.
 * Use in API routes that need to provide CSRF token to clients.
 *
 * Example: GET /api/csrf-token
 */
export function getCsrfTokenResponse(): NextResponse {
  const response = NextResponse.json({ ok: true });
  setCsrfCookie(response);
  return response;
}

/**
 * Decode a stored CSRF cookie value.
 * Returns { token, signature } or null.
 */
export function decodeCsrfCookie(value: string): { token: string; signature: string } | null {
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [token, signature] = parts;
  if (!token || !signature) return null;
  return { token, signature };
}

// ===== React hook helper =====

/**
 * Get CSRF token for client (reads from cookie).
 * Returns the raw token (without signature).
 */
export function getClientCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME && value) {
      const decoded = decodeCsrfCookie(decodeURIComponent(value));
      if (decoded) return decoded.token;
    }
  }
  return null;
}
