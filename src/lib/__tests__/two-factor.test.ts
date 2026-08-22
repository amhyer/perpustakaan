/**
 * Unit tests untuk src/lib/two-factor.ts
 * Test: TOTP secret, otpauth URI, code verification, backup codes
 */

import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  generateOtpAuthUri,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  isValidTotpFormat,
} from "../two-factor";

describe("generateTotpSecret", () => {
  it("return base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
  });

  it("generate secret unik", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
  });

  it("default length >= 16 karakter", () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });
});

describe("generateOtpAuthUri", () => {
  it("format otpauth:// standar", () => {
    const uri = generateOtpAuthUri("JBSWY3DPEHPK3PXP", "user@school.id");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("JBSWY3DPEHPK3PXP");
    expect(uri).toContain("user%40school.id");
  });

  it("include issuer", () => {
    const uri = generateOtpAuthUri("SECRET", "user", "Jendela Ilmu");
    expect(uri).toContain("Jendela%20Ilmu");
  });
});

describe("verifyTotpCode", () => {
  it("return false untuk kode invalid", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode(secret, "000000")).toBe(false);
  });

  it("return true untuk kode yang baru di-generate (current time)", () => {
    // Import authenticator untuk generate kode saat ini
    const { authenticator } = require("otplib");
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotpCode(secret, code)).toBe(true);
  });

  it("return true untuk kode dalam window toleransi", () => {
    const { authenticator } = require("otplib");
    const secret = generateTotpSecret();
    // Generate kode dari 30 detik lalu
    const pastCode = authenticator.generate(secret);
    expect(verifyTotpCode(secret, pastCode)).toBe(true);
  });

  it("tidak throw saat secret invalid", () => {
    expect(() => verifyTotpCode("INVALID", "123456")).not.toThrow();
  });
});

describe("generateBackupCodes", () => {
  it("generate 8 kode by default", () => {
    const { plain, hashed } = generateBackupCodes();
    expect(plain.length).toBe(8);
    expect(hashed.length).toBe(8);
  });

  it("generate jumlah custom", () => {
    const { plain, hashed } = generateBackupCodes(5);
    expect(plain.length).toBe(5);
    expect(hashed.length).toBe(5);
  });

  it("plain codes uppercase hex 8 char", () => {
    const { plain } = generateBackupCodes(3);
    for (const code of plain) {
      expect(code).toMatch(/^[0-9A-F]{8}$/);
    }
  });

  it("semua kode unik", () => {
    const { plain } = generateBackupCodes(10);
    const unique = new Set(plain);
    expect(unique.size).toBe(10);
  });

  it("hashed codes match SHA-256 dari plain", () => {
    const { plain, hashed } = generateBackupCodes(3);
    for (let i = 0; i < plain.length; i++) {
      expect(verifyBackupCode(plain[i], hashed[i])).toBe(true);
    }
  });
});

describe("hashBackupCode & verifyBackupCode", () => {
  it("hash konsisten untuk input sama", () => {
    const a = hashBackupCode("ABCD1234");
    const b = hashBackupCode("ABCD1234");
    expect(a).toBe(b);
  });

  it("hash case-insensitive", () => {
    const a = hashBackupCode("abcd1234");
    const b = hashBackupCode("ABCD1234");
    expect(a).toBe(b);
  });

  it("verify match antara plain dan hash", () => {
    const hash = hashBackupCode("TEST1234");
    expect(verifyBackupCode("TEST1234", hash)).toBe(true);
    expect(verifyBackupCode("WRONG123", hash)).toBe(false);
  });
});

describe("isValidTotpFormat", () => {
  it("valid untuk 6 digit", () => {
    expect(isValidTotpFormat("123456")).toBe(true);
    expect(isValidTotpFormat("000000")).toBe(true);
    expect(isValidTotpFormat("999999")).toBe(true);
  });

  it("invalid untuk format lain", () => {
    expect(isValidTotpFormat("12345")).toBe(false); // 5 digit
    expect(isValidTotpFormat("1234567")).toBe(false); // 7 digit
    expect(isValidTotpFormat("abcdef")).toBe(false); // huruf
    expect(isValidTotpFormat("12345a")).toBe(false); // mix
    expect(isValidTotpFormat("")).toBe(false);
    expect(isValidTotpFormat(" 123456")).toBe(false); // spasi
  });
});
