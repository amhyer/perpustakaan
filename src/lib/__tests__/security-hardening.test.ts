/**
 * Tests for security hardening library.
 *
 * Sprint T - Tier 3 #11: Advanced Security.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    session: { findUnique: vi.fn(), count: vi.fn() },
    twoFactorAuth: { findUnique: vi.fn() },
    loginAttempt: { count: vi.fn(), create: vi.fn() },
    bruteForceState: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    deviceFingerprint: { findMany: vi.fn(), create: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  scorePassword,
  scoreSessionSecurity,
  generateFingerprint,
  checkDeviceFingerprint,
  saveDeviceFingerprint,
  checkIPReputation,
  calculateProgressiveDelay,
  recordFailedLogin,
  getBruteForceState,
  resetBruteForce,
  generateAuditHash,
  verifyAuditLogIntegrity,
} from "../security-hardening";

describe("security-hardening: password strength", () => {
  it("rejects empty password", () => {
    const result = scorePassword("");
    expect(result.score).toBe(0);
    expect(result.level).toBe("VERY_WEAK");
  });

  it("scores common password as weak", () => {
    const result = scorePassword("password");
    expect(result.level).toBe("VERY_WEAK");
    expect(result.issues.some((i) => i.includes("umum"))).toBe(true);
  });

  it("rejects short password", () => {
    const result = scorePassword("Ab1!");
    expect(result.issues.some((i) => i.includes("pendek"))).toBe(true);
  });

  it("rejects sequential characters", () => {
    const result = scorePassword("abcdef123");
    expect(result.issues.some((i) => i.includes("sequence"))).toBe(true);
  });

  it("rejects repeated characters", () => {
    const result = scorePassword("Aaa111!!!");
    expect(result.issues.some((i) => i.includes("berulang"))).toBe(true);
  });

  it("scores strong password highly", () => {
    const result = scorePassword("Tr0ub4dor&3-Xyz!Q");
    expect(result.score).toBeGreaterThan(60);
  });

  it("classifies levels correctly", () => {
    expect(scorePassword("").level).toBe("VERY_WEAK");
    expect(scorePassword("Tr0ub4dor&3-Xyz!Q").level).not.toBe("VERY_WEAK");
  });

  it("includes estimated crack time", () => {
    const result = scorePassword("password");
    expect(result.estimatedCrackTime).toBeDefined();
  });

  it("detects Indonesian common passwords", () => {
    const result = scorePassword("rahasia");
    expect(result.score).toBeLessThan(20);
  });
});

describe("security-hardening: session security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 for missing session", async () => {
    vi.mocked(db.session.findUnique).mockResolvedValue(null);
    const result = await scoreSessionSecurity("s1", "u1");
    expect(result.securityScore).toBe(0);
  });

  it("deducts for old session (>1 week)", async () => {
    vi.mocked(db.session.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      createdAt: new Date(Date.now() - 200 * 60 * 60 * 1000), // 200h ago
      expiresAt: new Date(Date.now() + 1000),
    } as any);
    vi.mocked(db.twoFactorAuth.findUnique).mockResolvedValue({ enabled: true } as any);
    vi.mocked(db.loginAttempt.count).mockResolvedValue(0);
    vi.mocked(db.session.count).mockResolvedValue(1);

    const result = await scoreSessionSecurity("s1", "u1");
    expect(result.riskFactors.some((f) => f.factor === "OLD_SESSION")).toBe(true);
  });

  it("deducts for missing 2FA", async () => {
    vi.mocked(db.session.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      createdAt: new Date(),
      expiresAt: new Date(),
    } as any);
    vi.mocked(db.twoFactorAuth.findUnique).mockResolvedValue(null);
    vi.mocked(db.loginAttempt.count).mockResolvedValue(0);
    vi.mocked(db.session.count).mockResolvedValue(1);

    const result = await scoreSessionSecurity("s1", "u1");
    expect(result.riskFactors.some((f) => f.factor === "NO_2FA")).toBe(true);
  });

  it("deducts for multiple active sessions", async () => {
    vi.mocked(db.session.findUnique).mockResolvedValue({
      id: "s1", userId: "u1", createdAt: new Date(), expiresAt: new Date(),
    } as any);
    vi.mocked(db.twoFactorAuth.findUnique).mockResolvedValue({ enabled: true } as any);
    vi.mocked(db.loginAttempt.count).mockResolvedValue(0);
    vi.mocked(db.session.count).mockResolvedValue(5);

    const result = await scoreSessionSecurity("s1", "u1");
    expect(result.riskFactors.some((f) => f.factor === "MULTIPLE_SESSIONS")).toBe(true);
  });

  it("returns recommendations", async () => {
    vi.mocked(db.session.findUnique).mockResolvedValue({
      id: "s1", userId: "u1", createdAt: new Date(), expiresAt: new Date(),
    } as any);
    vi.mocked(db.twoFactorAuth.findUnique).mockResolvedValue(null);
    vi.mocked(db.loginAttempt.count).mockResolvedValue(0);
    vi.mocked(db.session.count).mockResolvedValue(1);

    const result = await scoreSessionSecurity("s1", "u1");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe("security-hardening: device fingerprint", () => {
  it("generates consistent hash for same input", () => {
    const a = generateFingerprint({
      userAgent: "Mozilla/5.0",
      screen: "1920x1080",
      timezone: "Asia/Jakarta",
      language: "id",
      platform: "Linux",
    });
    const b = generateFingerprint({
      userAgent: "Mozilla/5.0",
      screen: "1920x1080",
      timezone: "Asia/Jakarta",
      language: "id",
      platform: "Linux",
    });
    expect(a).toBe(b);
  });

  it("generates different hash for different input", () => {
    const a = generateFingerprint({
      userAgent: "Mozilla/5.0",
      screen: "1920x1080",
      timezone: "Asia/Jakarta",
      language: "id",
      platform: "Linux",
    });
    const b = generateFingerprint({
      userAgent: "Chrome/120",
      screen: "1366x768",
      timezone: "America/New_York",
      language: "en",
      platform: "Windows",
    });
    expect(a).not.toBe(b);
  });

  it("generates 16-char hash", () => {
    const hash = generateFingerprint({
      userAgent: "test", screen: "1x1", timezone: "UTC", language: "en", platform: "x",
    });
    expect(hash.length).toBe(16);
  });

  it("checkDeviceFingerprint identifies new device", async () => {
    vi.mocked(db.deviceFingerprint.findMany).mockResolvedValue([]);
    const result = await checkDeviceFingerprint("u1", "newhash");
    expect(result.isNew).toBe(true);
  });

  it("checkDeviceFingerprint identifies known device", async () => {
    vi.mocked(db.deviceFingerprint.findMany).mockResolvedValue([
      { fingerprintHash: "knownhash" } as any,
    ]);
    const result = await checkDeviceFingerprint("u1", "knownhash");
    expect(result.isNew).toBe(false);
  });

  it("saveDeviceFingerprint persists", async () => {
    vi.mocked(db.deviceFingerprint.create).mockResolvedValue({} as any);
    await saveDeviceFingerprint("u1", "hash1", "iPhone 15");
    expect(db.deviceFingerprint.create).toHaveBeenCalled();
  });
});

describe("security-hardening: IP reputation", () => {
  it("scores local IPs as 100", () => {
    expect(checkIPReputation("127.0.0.1").score).toBe(100);
    expect(checkIPReputation("192.168.1.1").score).toBe(100);
    expect(checkIPReputation("10.0.0.1").score).toBe(100);
  });

  it("detects datacenter IPs", () => {
    expect(checkIPReputation("3.5.7.9").isDatacenter).toBe(true);
    expect(checkIPReputation("52.95.110.1").isDatacenter).toBe(true);
  });

  it("detects VPN IPs (heuristic)", () => {
    expect(checkIPReputation("185.220.101.1").isVpn).toBe(true);
  });

  it("returns country LOCAL for private IPs", () => {
    expect(checkIPReputation("127.0.0.1").country).toBe("LOCAL");
  });
});

describe("security-hardening: progressive delay", () => {
  it("returns 0 delay for 0 attempts", () => {
    expect(calculateProgressiveDelay(0).delayMs).toBe(0);
  });

  it("returns 1s for 1 attempt", () => {
    expect(calculateProgressiveDelay(1).delayMs).toBe(1000);
  });

  it("returns 2s for 2 attempts", () => {
    expect(calculateProgressiveDelay(2).delayMs).toBe(2000);
  });

  it("returns 5s for 3 attempts", () => {
    expect(calculateProgressiveDelay(3).delayMs).toBe(5000);
  });

  it("returns 15s for 4 attempts", () => {
    expect(calculateProgressiveDelay(4).delayMs).toBe(15000);
  });

  it("locks account at 5+ attempts", () => {
    const result = calculateProgressiveDelay(5);
    expect(result.shouldLockout).toBe(true);
    expect(result.lockoutMinutes).toBe(15);
  });

  it("caps at 60s for very high attempt count", () => {
    const result = calculateProgressiveDelay(100);
    expect(result.delayMs).toBe(60000);
    expect(result.shouldLockout).toBe(true);
  });
});

describe("security-hardening: brute force state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero state for new user", async () => {
    vi.mocked(db.bruteForceState.findUnique).mockResolvedValue(null);
    const state = await getBruteForceState("u1");
    expect(state.failedAttempts).toBe(0);
  });

  it("returns stored state", async () => {
    vi.mocked(db.bruteForceState.findUnique).mockResolvedValue({
      userId: "u1",
      failedAttempts: 3,
      lastAttemptAt: new Date(),
      lockedUntil: null,
      progressiveDelayMs: 5000,
    });
    const state = await getBruteForceState("u1");
    expect(state.failedAttempts).toBe(3);
  });

  it("auto-unlocks when lockout expired", async () => {
    vi.mocked(db.bruteForceState.findUnique).mockResolvedValue({
      userId: "u1",
      failedAttempts: 10,
      lastAttemptAt: new Date(),
      lockedUntil: new Date(Date.now() - 1000), // Past
      progressiveDelayMs: 60000,
    });
    vi.mocked(db.bruteForceState.update).mockResolvedValue({} as any);
    const state = await getBruteForceState("u1");
    expect(state.failedAttempts).toBe(0);
    expect(state.lockedUntil).toBeNull();
  });

  it("recordFailedLogin increments counter", async () => {
    vi.mocked(db.bruteForceState.findUnique).mockResolvedValue(null);
    vi.mocked(db.bruteForceState.upsert).mockResolvedValue({} as any);
    vi.mocked(db.loginAttempt.create).mockResolvedValue({} as any);
    const state = await recordFailedLogin("u1", "test@x.com");
    expect(state.failedAttempts).toBe(1);
  });

  it("recordFailedLogin locks at 5", async () => {
    vi.mocked(db.bruteForceState.findUnique).mockResolvedValue({
      failedAttempts: 4, lastAttemptAt: new Date(), lockedUntil: null, progressiveDelayMs: 0,
    });
    vi.mocked(db.bruteForceState.upsert).mockResolvedValue({} as any);
    vi.mocked(db.loginAttempt.create).mockResolvedValue({} as any);
    const state = await recordFailedLogin("u1", "test@x.com");
    expect(state.lockedUntil).not.toBeNull();
  });

  it("resetBruteForce deletes state", async () => {
    vi.mocked(db.bruteForceState.deleteMany).mockResolvedValue({ count: 1 } as any);
    await resetBruteForce("u1");
    expect(db.bruteForceState.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });
});

describe("security-hardening: audit log integrity", () => {
  it("generates deterministic hash", () => {
    const h1 = generateAuditHash({ a: 1, b: "x" });
    const h2 = generateAuditHash({ a: 1, b: "x" });
    expect(h1).toBe(h2);
  });

  it("generates different hash for different data", () => {
    const h1 = generateAuditHash({ a: 1 });
    const h2 = generateAuditHash({ a: 2 });
    expect(h1).not.toBe(h2);
  });

  it("chain hash changes with previous", () => {
    const h1 = generateAuditHash({ a: 1 });
    const h2 = generateAuditHash({ a: 1 }, h1);
    expect(h1).not.toBe(h2);
  });

  it("verifyAuditLogIntegrity returns valid for empty", async () => {
    vi.mocked(db.auditLog.findMany).mockResolvedValue([]);
    const result = await verifyAuditLogIntegrity();
    expect(result.valid).toBe(true);
    expect(result.totalChecked).toBe(0);
  });

  it("verifyAuditLogIntegrity detects broken chains", async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);
    vi.mocked(db.auditLog.findMany).mockResolvedValue([
      { id: "a1", action: "X", resource: "R", resourceId: null, userId: "u1", createdAt: now } as any,
      { id: "a2", action: "Y", resource: "R", resourceId: null, userId: "u1", createdAt: earlier } as any, // Out of order
    ]);
    const result = await verifyAuditLogIntegrity();
    expect(result.brokenChains.length).toBeGreaterThan(0);
  });

  it("verifyAuditLogIntegrity valid for chronological order", async () => {
    const t1 = new Date(2024, 0, 1);
    const t2 = new Date(2024, 0, 2);
    vi.mocked(db.auditLog.findMany).mockResolvedValue([
      { id: "a1", action: "X", resource: "R", resourceId: null, userId: "u1", createdAt: t1 } as any,
      { id: "a2", action: "Y", resource: "R", resourceId: null, userId: "u1", createdAt: t2 } as any,
    ]);
    const result = await verifyAuditLogIntegrity();
    expect(result.valid).toBe(true);
  });
});
