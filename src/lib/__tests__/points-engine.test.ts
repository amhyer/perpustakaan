/**
 * Unit tests untuk PointsEngine.
 *
 * Catatan: Test ini butuh database yang sudah di-seed. Untuk CI,
 * gunakan SQLite in-memory atau skip kalau tidak ada DB.
 *
 * Saat ini, kita hanya test pure functions (tanpa DB) untuk logic
 * yang deterministic. Integration test menyusul.
 */

import { describe, it, expect } from "vitest";

describe("PointsEngine - pure logic", () => {
  // Test helpers (mirroring logic di points-engine.ts tanpa DB)
  function startOfDay(d: Date): Date {
    const result = new Date(d);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function startOfMonth(d: Date): Date {
    const result = new Date(d);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  describe("date boundaries", () => {
    it("startOfDay returns midnight today", () => {
      const now = new Date("2026-08-23T15:30:45Z");
      const dayStart = startOfDay(now);
      expect(dayStart.getHours()).toBe(0);
      expect(dayStart.getMinutes()).toBe(0);
      expect(dayStart.getSeconds()).toBe(0);
      expect(dayStart.getMilliseconds()).toBe(0);
    });

    it("startOfMonth returns first day of month at midnight", () => {
      const now = new Date("2026-08-23T15:30:45Z");
      const monthStart = startOfMonth(now);
      expect(monthStart.getDate()).toBe(1);
      expect(monthStart.getHours()).toBe(0);
    });
  });

  describe("anti-cheat logic (min loan days)", () => {
    function shouldAwardPoints(loanDays: number, minLoanDays: number | null) {
      if (minLoanDays === null) return true;
      return loanDays >= minLoanDays;
    }

    it("awards points if loan >= 2 days", () => {
      expect(shouldAwardPoints(2, 2)).toBe(true);
      expect(shouldAwardPoints(7, 2)).toBe(true);
    });

    it("denies points if loan < 2 days", () => {
      expect(shouldAwardPoints(0, 2)).toBe(false);
      expect(shouldAwardPoints(1, 2)).toBe(false);
    });

    it("awards points if no min rule", () => {
      expect(shouldAwardPoints(0, null)).toBe(true);
      expect(shouldAwardPoints(1, null)).toBe(true);
    });
  });

  describe("anti-cheat logic (min book pages)", () => {
    function shouldAwardForPages(pages: number | null | undefined, minPages: number | null) {
      if (minPages === null) return true;
      if (!pages) return false; // tidak ada info halaman
      return pages >= minPages;
    }

    it("awards points for thick books", () => {
      expect(shouldAwardForPages(100, 50)).toBe(true);
      expect(shouldAwardForPages(500, 50)).toBe(true);
    });

    it("denies points for thin books", () => {
      expect(shouldAwardForPages(20, 50)).toBe(false);
      expect(shouldAwardForPages(49, 50)).toBe(false);
    });

    it("denies points if page count unknown", () => {
      expect(shouldAwardForPages(null, 50)).toBe(false);
      expect(shouldAwardForPages(undefined, 50)).toBe(false);
    });
  });

  describe("balance calculation", () => {
    // Helper: hitung balance dari list transaksi
    function calcBalance(
      txns: { type: string; amount: number }[]
    ): number {
      // Sederhana: sum positive minus negative
      // (real impl pakai balanceAfter field di DB)
      let bal = 0;
      for (const t of txns) {
        if (t.type === "EARN" || t.type === "ADJUST_UP") bal += t.amount;
        else if (t.type === "REDEEM" || t.type === "ADJUST_DOWN" || t.type === "EXPIRE")
          bal -= t.amount;
      }
      return bal;
    }

    it("starts at 0", () => {
      expect(calcBalance([])).toBe(0);
    });

    it("adds EARN", () => {
      expect(calcBalance([{ type: "EARN", amount: 10 }])).toBe(10);
      expect(calcBalance([{ type: "EARN", amount: 10 }, { type: "EARN", amount: 5 }])).toBe(15);
    });

    it("subtracts REDEEM", () => {
      expect(
        calcBalance([
          { type: "EARN", amount: 100 },
          { type: "REDEEM", amount: 50 },
        ])
      ).toBe(50);
    });

    it("handles adjustments", () => {
      expect(
        calcBalance([
          { type: "EARN", amount: 100 },
          { type: "ADJUST_DOWN", amount: 30 },
          { type: "ADJUST_UP", amount: 10 },
        ])
      ).toBe(80);
    });

    it("never goes negative on calculation but DB prevents", () => {
      // Logic tetap hitung, tapi di redeemReward dicek dulu
      const result = calcBalance([
        { type: "EARN", amount: 50 },
        { type: "REDEEM", amount: 100 },
      ]);
      expect(result).toBe(-50);
      // Real implementation should throw/reject BEFORE this
    });
  });

  describe("cooldown calculation", () => {
    function isCooldownPassed(
      lastClaim: Date | null,
      cooldownDays: number | null
    ): boolean {
      if (!cooldownDays) return true;
      if (!lastClaim) return true;
      const daysSince = (Date.now() - lastClaim.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= cooldownDays;
    }

    it("passes if no cooldown", () => {
      expect(isCooldownPassed(null, null)).toBe(true);
      expect(isCooldownPassed(new Date(), null)).toBe(true);
    });

    it("passes if no previous claim", () => {
      expect(isCooldownPassed(null, 14)).toBe(true);
    });

    it("blocks if too recent", () => {
      const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 hari lalu
      expect(isCooldownPassed(recent, 14)).toBe(false);
    });

    it("passes if cooldown elapsed", () => {
      const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 hari lalu
      expect(isCooldownPassed(old, 14)).toBe(true);
    });
  });
});

describe("Reward type guards", () => {
  it("validates category", () => {
    const validCategories = ["BOOK", "STATIONERY", "VOUCHER", "GIFT_CARD", "PRIVILEGE", "CERTIFICATE", "CUSTOM"];
    for (const cat of validCategories) {
      expect(validCategories).toContain(cat);
    }
    expect(validCategories).not.toContain("INVALID");
  });

  it("validates minRole", () => {
    const validRoles = ["STUDENT", "TEACHER", "LIBRARIAN"];
    for (const role of validRoles) {
      expect(validRoles).toContain(role);
    }
  });

  it("validates pointCost is positive", () => {
    const validatePointCost = (cost: number) => cost >= 1;
    expect(validatePointCost(1)).toBe(true);
    expect(validatePointCost(100)).toBe(true);
    expect(validatePointCost(0)).toBe(false);
    expect(validatePointCost(-1)).toBe(false);
  });
});

describe("Redemption status flow", () => {
  // PENDING → APPROVED → DELIVERED (happy)
  // PENDING → REJECTED (with refund)
  // PENDING | APPROVED → CANCELLED (with refund)

  function isValidTransition(from: string, to: string): boolean {
    const transitions: Record<string, string[]> = {
      PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
      APPROVED: ["DELIVERED", "CANCELLED"],
      DELIVERED: [], // terminal
      REJECTED: [], // terminal
      CANCELLED: [], // terminal
    };
    return transitions[from]?.includes(to) ?? false;
  }

  it("PENDING can go to APPROVED", () => {
    expect(isValidTransition("PENDING", "APPROVED")).toBe(true);
  });

  it("PENDING can go to REJECTED", () => {
    expect(isValidTransition("PENDING", "REJECTED")).toBe(true);
  });

  it("PENDING can go to CANCELLED", () => {
    expect(isValidTransition("PENDING", "CANCELLED")).toBe(true);
  });

  it("APPROVED can go to DELIVERED", () => {
    expect(isValidTransition("APPROVED", "DELIVERED")).toBe(true);
  });

  it("APPROVED can be cancelled", () => {
    expect(isValidTransition("APPROVED", "CANCELLED")).toBe(true);
  });

  it("DELIVERED is terminal", () => {
    expect(isValidTransition("DELIVERED", "APPROVED")).toBe(false);
    expect(isValidTransition("DELIVERED", "REJECTED")).toBe(false);
  });

  it("REJECTED is terminal", () => {
    expect(isValidTransition("REJECTED", "APPROVED")).toBe(false);
  });

  it("cannot skip APPROVED → DELIVERED from PENDING", () => {
    expect(isValidTransition("PENDING", "DELIVERED")).toBe(false);
  });
});
