/**
 * Temporary token untuk alur 2FA / password reset.
 *
 * Token ini berlaku 5-15 menit, scope terbatas, dan tidak bisa dipakai
 * untuk akses API biasa. Implementasi: HMAC-signed JWT dengan jose.
 *
 * Scope:
 * - "2fa" — untuk verifikasi kode TOTP setelah login password berhasil
 * - "reset" — untuk reset password
 */

import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET belum diset");
  }
  return new TextEncoder().encode(secret);
})();

export type TempTokenScope = "2fa" | "reset" | "verify_email";

export interface TempTokenPayload {
  sub: string; // userId
  scope: TempTokenScope;
  // Random jti untuk memastikan satu token hanya sekali pakai (opsional)
  jti: string;
}

export async function createTempToken(
  userId: string,
  scope: TempTokenScope,
  expiresInMinutes = 10
): Promise<{ token: string; jti: string }> {
  const jti = crypto.randomBytes(16).toString("hex");
  const token = await new SignJWT({ scope, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${expiresInMinutes}m`)
    .sign(SECRET);
  return { token, jti };
}

export async function verifyTempToken(
  token: string,
  expectedScope: TempTokenScope
): Promise<{ userId: string; jti: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.scope !== expectedScope) return null;
    if (typeof payload.sub !== "string" || typeof payload.jti !== "string") return null;
    return { userId: payload.sub, jti: payload.jti };
  } catch {
    return null;
  }
}
