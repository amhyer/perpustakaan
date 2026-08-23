/**
 * Tests for certificates library.
 *
 * Sprint S - Tier 4 #15: Reading Achievement Certificates.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    certificate: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    member: { findUnique: vi.fn() },
    loan: { count: vi.fn() },
    pointTransaction: { findMany: vi.fn() },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  checkEligibleCertificates,
  issueCertificate,
  verifyCertificate,
  getMemberCertificates,
  checkAndIssueCertificates,
  getMemberStats,
  getCertificateUrl,
  getCertificateQRData,
  formatCertificateForDisplay,
  type CertificateType,
  type MemberStats,
} from "../certificates";

describe("certificates: eligibility check", () => {
  it("returns no certificates for new reader (0 books)", () => {
    const stats: MemberStats = {
      memberId: "m1", booksRead: 0, currentStreak: 0, longestStreak: 0, level: "Pemula",
    };
    return checkEligibleCertificates(stats).then((eligible) => {
      expect(eligible).toEqual([]);
    });
  });

  it("returns BOOKS_10 when reached 10 books", () => {
    const stats: MemberStats = {
      memberId: "m1", booksRead: 10, currentStreak: 0, longestStreak: 0, level: "Pembaca",
    };
    return checkEligibleCertificates(stats).then((eligible) => {
      expect(eligible).toContain("BOOKS_10");
    });
  });

  it("returns all book milestone certificates at 500 books", () => {
    const stats: MemberStats = {
      memberId: "m1", booksRead: 500, currentStreak: 100, longestStreak: 100, level: "Legenda",
    };
    return checkEligibleCertificates(stats).then((eligible) => {
      expect(eligible).toContain("BOOKS_10");
      expect(eligible).toContain("BOOKS_25");
      expect(eligible).toContain("BOOKS_50");
      expect(eligible).toContain("BOOKS_100");
      expect(eligible).toContain("BOOKS_200");
      expect(eligible).toContain("BOOKS_500");
      expect(eligible).toContain("STREAK_30");
      expect(eligible).toContain("STREAK_100");
      expect(eligible).toContain("LEVEL_LEGENDA");
    });
  });

  it("returns streak certificate at 30 days", () => {
    const stats: MemberStats = {
      memberId: "m1", booksRead: 5, currentStreak: 30, longestStreak: 30, level: "Pembaca",
    };
    return checkEligibleCertificates(stats).then((eligible) => {
      expect(eligible).toContain("STREAK_30");
    });
  });
});

describe("certificates: issue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues certificate if not already issued", async () => {
    vi.mocked(db.certificate.findFirst).mockResolvedValue(null);
    vi.mocked(db.member.findUnique).mockResolvedValue({
      id: "m1", fullName: "Budi", memberNumber: "M001",
      user: { name: "Budi" },
    } as any);
    vi.mocked(db.loan.count).mockResolvedValue(15);
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([]);
    vi.mocked(db.certificate.create).mockResolvedValue({
      id: "c1", type: "BOOKS_10", memberId: "m1", title: "Kutu Buku",
      description: "X", emoji: "📚", color: "#000", metadata: "{}",
      verificationHash: "abc123", slug: "books-10-budi-2024",
      achievementDate: new Date(), issuedAt: new Date(),
    } as any);

    const cert = await issueCertificate("m1", "BOOKS_10");
    expect(cert).not.toBeNull();
    expect(cert?.type).toBe("BOOKS_10");
  });

  it("returns null if already issued", async () => {
    vi.mocked(db.certificate.findFirst).mockResolvedValue({ id: "existing" } as any);
    const cert = await issueCertificate("m1", "BOOKS_10");
    expect(cert).toBeNull();
  });

  it("returns null for invalid type", async () => {
    vi.mocked(db.certificate.findFirst).mockResolvedValue(null);
    const cert = await issueCertificate("m1", "INVALID" as CertificateType);
    expect(cert).toBeNull();
  });

  it("returns null if member not found", async () => {
    vi.mocked(db.certificate.findFirst).mockResolvedValue(null);
    vi.mocked(db.member.findUnique).mockResolvedValue(null);
    const cert = await issueCertificate("m1", "BOOKS_10");
    expect(cert).toBeNull();
  });
});

describe("certificates: verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid for existing certificate", async () => {
    vi.mocked(db.certificate.findUnique).mockResolvedValue({
      id: "c1", type: "BOOKS_10", memberId: "m1", title: "X", description: "Y",
      emoji: "📚", color: "#000", metadata: '{"booksRead":15}',
      verificationHash: "abc", slug: "test",
      achievementDate: new Date(), issuedAt: new Date(),
      member: { id: "m1", fullName: "Budi", memberNumber: "M001" },
    } as any);

    const result = await verifyCertificate("test");
    expect(result.valid).toBe(true);
    expect(result.certificate?.type).toBe("BOOKS_10");
  });

  it("returns invalid for non-existent slug", async () => {
    vi.mocked(db.certificate.findUnique).mockResolvedValue(null);
    const result = await verifyCertificate("nonexistent");
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("parses metadata correctly", async () => {
    vi.mocked(db.certificate.findUnique).mockResolvedValue({
      id: "c1", type: "BOOKS_50", memberId: "m1", title: "X", description: "Y",
      emoji: "📚", color: "#000", metadata: '{"booksRead":52,"streak":15}',
      verificationHash: "abc", slug: "test",
      achievementDate: new Date(), issuedAt: new Date(),
      member: { id: "m1", fullName: "Budi", memberNumber: "M001" },
    } as any);

    const result = await verifyCertificate("test");
    expect(result.certificate?.metadata.booksRead).toBe(52);
    expect(result.certificate?.metadata.streak).toBe(15);
  });
});

describe("certificates: member certificates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all member certificates", async () => {
    vi.mocked(db.certificate.findMany).mockResolvedValue([
      {
        id: "c1", type: "BOOKS_10", memberId: "m1", title: "X", description: "Y",
        emoji: "📚", color: "#000", metadata: "{}",
        verificationHash: "abc", slug: "test-1",
        achievementDate: new Date(), issuedAt: new Date(),
        member: { id: "m1", fullName: "Budi", memberNumber: "M001" },
      },
    ] as any);

    const certs = await getMemberCertificates("m1");
    expect(certs).toHaveLength(1);
    expect(certs[0].type).toBe("BOOKS_10");
  });
});

describe("certificates: check and issue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues all eligible certificates", async () => {
    vi.mocked(db.loan.count).mockResolvedValue(50);
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([]);
    vi.mocked(db.certificate.findFirst).mockResolvedValue(null); // No existing
    vi.mocked(db.member.findUnique).mockResolvedValue({
      id: "m1", fullName: "Test", memberNumber: "M001", user: { name: "Test" },
    } as any);
    vi.mocked(db.certificate.create).mockResolvedValue({
      id: "c1", type: "BOOKS_10", memberId: "m1", title: "X", description: "Y",
      emoji: "📚", color: "#000", metadata: "{}",
      verificationHash: "abc", slug: "test",
      achievementDate: new Date(), issuedAt: new Date(),
    } as any);

    const issued = await checkAndIssueCertificates("m1");
    expect(issued.length).toBeGreaterThan(0);
  });

  it("skips already-issued certificates", async () => {
    vi.mocked(db.loan.count).mockResolvedValue(50);
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([]);
    vi.mocked(db.certificate.findFirst).mockResolvedValue({ id: "existing" } as any);

    const issued = await checkAndIssueCertificates("m1");
    expect(issued).toEqual([]);
  });
});

describe("certificates: helpers", () => {
  describe("getMemberStats", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns stats with level", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(60);
      vi.mocked(db.pointTransaction.findMany).mockResolvedValue([]);
      const stats = await getMemberStats("m1");
      expect(stats.booksRead).toBe(60);
      expect(stats.level).toBe("Kolektor");
    });

    it("classifies Legenda at 500+", async () => {
      vi.mocked(db.loan.count).mockResolvedValue(600);
      vi.mocked(db.pointTransaction.findMany).mockResolvedValue([]);
      const stats = await getMemberStats("m1");
      expect(stats.level).toBe("Legenda");
    });
  });

  describe("URLs", () => {
    it("getCertificateUrl returns public URL", () => {
      expect(getCertificateUrl("abc")).toBe("/certificates/abc");
      expect(getCertificateUrl("abc", "https://example.com")).toBe("https://example.com/certificates/abc");
    });

    it("getCertificateQRData matches URL", () => {
      const url = getCertificateUrl("slug-1");
      const qr = getCertificateQRData("slug-1");
      expect(qr).toBe(url);
    });
  });

  describe("formatCertificateForDisplay", () => {
    it("formats certificate for display", () => {
      const cert = {
        id: "c1",
        type: "BOOKS_10" as CertificateType,
        recipientId: "m1",
        recipientName: "Budi",
        recipientMemberNumber: "M001",
        title: "Kutu Buku",
        description: "Membaca 10 buku",
        achievementDate: new Date("2024-06-15"),
        issuedAt: new Date("2024-06-16"),
        verificationHash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        slug: "books-10-budi-2024-06-16",
        metadata: { booksRead: 10 },
      };
      const display = formatCertificateForDisplay(cert);
      expect(display.title).toBe("Kutu Buku");
      expect(display.issuedDate).toContain("2024");
      expect(display.verificationCode).toBe("ABCDEF1234567890");
      expect(display.shareUrl).toContain("/certificates/");
    });
  });
});
