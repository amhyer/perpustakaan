/**
 * Two-Factor Authentication (TOTP) untuk pustakawan.
 *
 * Algoritma: TOTP (RFC 6238) dengan SHA1, 6 digit, 30 detik window.
 * Library: `otplib` (TOTP generation + verification).
 *
 * Alur:
 * 1. Pustakawan buka Settings > Keamanan > Aktifkan 2FA
 * 2. Server generate secret + QR code (otpauth:// URI)
 * 3. Pustakawan scan dengan Google Authenticator / Authy
 * 4. Pustakawan masukkan kode 6 digit dari app untuk konfirmasi
 * 5. Server simpan secret + 8 backup codes (di-hash)
 *
 * Login flow:
 * 1. Email + password valid → cek 2FA
 * 2. Jika 2FA aktif, return status "2FA_REQUIRED" + tempToken (5 menit)
 * 3. Frontend minta kode TOTP
 * 4. POST /api/auth/2fa/verify dengan tempToken + kode
 * 5. Sukses → set session cookie normal
 */

import { authenticator } from "otplib";
import crypto from "crypto";

// Konfigurasi TOTP — default 30 detik, SHA1, 6 digit
authenticator.options = {
  step: 30,
  window: 1, // toleransi ±1 step (30 detik)
};

/**
 * Generate secret TOTP baru (base32).
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate otpauth URI untuk QR code.
 * Format standar yang dipahami Google Authenticator, Authy, dll.
 */
export function generateOtpAuthUri(secret: string, accountName: string, issuer = "Jendela Ilmu"): string {
  return authenticator.keyuri(accountName, issuer, secret);
}

/**
 * Verify kode TOTP dari user.
 * Return true jika valid (termasuk toleransi window).
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

/**
 * Generate backup codes (8 kode, 8 karakter alphanumeric).
 * Plain codes dikembalikan ke user SEKALI, lalu di-hash untuk disimpan.
 */
export function generateBackupCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    plain.push(code);
    hashed.push(hashBackupCode(code));
  }
  return { plain, hashed };
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
}

export function verifyBackupCode(code: string, hash: string): boolean {
  return hashBackupCode(code) === hash;
}

/**
 * Rate limit helper untuk 2FA verification (anti brute-force).
 */
export function isValidTotpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}
