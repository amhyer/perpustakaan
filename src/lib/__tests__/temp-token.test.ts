/**
 * Unit tests untuk src/lib/temp-token.ts
 * Test: create, verify, scope validation, expiry, JTI uniqueness
 */

import { describe, it, expect, vi } from "vitest";
import { createTempToken, verifyTempToken } from "../temp-token";

describe("createTempToken", () => {
  it("generate token dengan JTI unik", async () => {
    const a = await createTempToken("user-1", "2fa", 5);
    const b = await createTempToken("user-1", "2fa", 5);
    expect(a.token).not.toBe(b.token);
    expect(a.jti).not.toBe(b.jti);
  });

  it("token adalah JWT (3 segments dipisah titik)", async () => {
    const { token } = await createTempToken("user-1", "reset", 10);
    const parts = token.split(".");
    expect(parts.length).toBe(3);
  });
});

describe("verifyTempToken", () => {
  it("verify token yang valid", async () => {
    const { token } = await createTempToken("user-123", "2fa", 5);
    const result = await verifyTempToken(token, "2fa");
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
  });

  it("reject token dengan scope salah", async () => {
    const { token } = await createTempToken("user-1", "2fa", 5);
    const result = await verifyTempToken(token, "reset");
    expect(result).toBeNull();
  });

  it("reject token yang sudah kadaluwarsa", async () => {
    vi.useFakeTimers();
    const { token } = await createTempToken("user-1", "2fa", 1); // 1 menit
    vi.advanceTimersByTime(2 * 60 * 1000); // 2 menit
    const result = await verifyTempToken(token, "2fa");
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("reject token yang corrupt", async () => {
    const result = await verifyTempToken("invalid.token.here", "2fa");
    expect(result).toBeNull();
  });

  it("reject token kosong", async () => {
    const result = await verifyTempToken("", "2fa");
    expect(result).toBeNull();
  });
});
