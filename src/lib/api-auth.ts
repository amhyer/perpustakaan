/**
 * API Key authentication untuk integrasi eksternal.
 *
 * Cara kerja:
 * - Client kirim header: `Authorization: Bearer ji_live_xxxxxxxxxxxxx`
 * - Server hash key, lookup di DB, cek scope & expiry
 * - Simpan di tabel ApiKey untuk audit
 *
 * Generate key: 32 byte random, prefix "ji_live_" untuk production,
 * "ji_test_" untuk testing.
 *
 * Catatan: ini BUKAN untuk user login (pakai JWT cookie).
 * Untuk sistem eksternal (website sekolah, sistem akademik, dll).
 */

import { db } from "@/lib/db";
import crypto from "crypto";

const KEY_PREFIX_LIVE = "ji_live_";
const KEY_PREFIX_TEST = "ji_test_";

interface ApiKeyContext {
  keyId: string;
  name: string;
  scopes: string[];
}

export function generateApiKey(env: "live" | "test" = "live"): { plain: string; prefix: string } {
  const random = crypto.randomBytes(32).toString("hex");
  const plain = (env === "live" ? KEY_PREFIX_LIVE : KEY_PREFIX_TEST) + random;
  return { plain, prefix: plain.slice(0, 12) };
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Verify API key dari request header.
 * Returns context jika valid, null jika tidak.
 */
export async function verifyApiKey(req: Request): Promise<ApiKeyContext | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const key = match[1].trim();

  if (!key.startsWith(KEY_PREFIX_LIVE) && !key.startsWith(KEY_PREFIX_TEST)) {
    return null;
  }

  const keyHash = hashApiKey(key);
  const apiKey = await db.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey) return null;
  if (!apiKey.isActive) return null;
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) return null;

  // Update lastUsed (fire-and-forget)
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    keyId: apiKey.id,
    name: apiKey.name,
    scopes: JSON.parse(apiKey.scopes),
  };
}

/**
 * Middleware-style helper untuk route yang butuh API key + scope tertentu.
 */
export async function requireApiKey(req: Request, requiredScope?: string) {
  const ctx = await verifyApiKey(req);
  if (!ctx) {
    return {
      ctx: null,
      error: new Response(JSON.stringify({ error: "API key tidak valid atau kadaluwarsa" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  if (requiredScope && !ctx.scopes.includes(requiredScope) && !ctx.scopes.includes("*")) {
    return {
      ctx,
      error: new Response(JSON.stringify({ error: `Scope '${requiredScope}' tidak diizinkan` }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { ctx, error: null };
}
