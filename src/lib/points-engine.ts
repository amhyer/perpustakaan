/**
 * Point Engine — Inti logic untuk sistem reward Perpustakaan Jendela Ilmu.
 *
 * Bertanggung jawab untuk:
 * 1. Memberi poin ke member (EARN)
 * 2. Menukar poin dengan hadiah (REDEEM)
 * 3. Adjust manual oleh pustakawan (ADJUST_UP / ADJUST_DOWN)
 * 4. Validasi anti-cheat (minLoanDays, minBookPages, dll)
 * 5. Menghitung saldo running balance
 *
 * Prinsip:
 * - Semua perubahan poin via PointTransaction (audit trail)
 * - Pakai Prisma transaction untuk atomicity
 * - balanceAfter selalu di-update untuk ledger consistency
 * - Idempotent: trigger yang sama tidak boleh double-count
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// =========================================================================
// TYPES
// =========================================================================

export type PointSource =
  | "LOAN_RETURNED"
  | "ON_TIME_RETURN"
  | "EARLY_RETURN"
  | "REVIEW_WRITTEN"
  | "RATING_5STAR"
  | "STREAK_7"
  | "STREAK_30"
  | "BADGE_UNLOCK"
  | "YEARLY_GOAL"
  | "READING_LIST_CREATE"
  | "GURU_REVIEW"
  | "MANUAL";

export type AwardResult = {
  success: boolean;
  awarded: number;
  newBalance: number;
  transactionId?: string;
  reason?: string;
};

export type RedeemResult = {
  success: boolean;
  redemptionId?: string;
  pickupCode?: string;
  newBalance: number;
  reason?: string;
};

// =========================================================================
// CORE: Award Points
// =========================================================================

/**
 * Beri poin ke member untuk event tertentu.
 *
 * @param memberId - ID member yang dapat poin
 * @param source - Sumber event (lihat PointSource)
 * @param options - { sourceId?, description?, awardedById? }
 * @returns AwardResult - status + jumlah poin + saldo baru
 *
 * Idempotent: kalau transaksi dengan source+sourceId yang sama sudah ada,
 * return success tanpa insert duplikat.
 */
export async function awardPoints(
  memberId: string,
  source: PointSource,
  options: {
    sourceId?: string;
    description?: string;
    awardedById?: string;
    // Override rule (mis. untuk streak yang dihitung otomatis)
    overridePoints?: number;
  } = {}
): Promise<AwardResult> {
  try {
    const member = await db.member.findUnique({
      where: { id: memberId },
      select: { id: true, category: true },
    });
    if (!member) {
      return { success: false, awarded: 0, newBalance: 0, reason: "Member tidak ditemukan" };
    }

    // Idempotency check
    if (options.sourceId) {
      const existing = await db.pointTransaction.findFirst({
        where: { memberId, source, sourceId: options.sourceId },
        select: { id: true, amount: true },
      });
      if (existing) {
        const balance = await getBalance(memberId);
        return {
          success: true,
          awarded: existing.amount,
          newBalance: balance,
          transactionId: existing.id,
          reason: "Poin sudah pernah diberikan untuk event ini",
        };
      }
    }

    // Get active rule for this source + role
    let rule;
    if (options.overridePoints !== undefined) {
      // Pakai override (untuk streak yang dihitung manual)
      rule = {
        id: null,
        points: options.overridePoints,
        maxPerDay: null,
        maxPerMonth: null,
        cooldownHours: null,
        requireReview: false,
      };
    } else {
      const found = await db.pointRule.findFirst({
        where: {
          code: source,
          isActive: true,
          OR: [{ role: member.category }, { role: "BOTH" }],
        },
      });
      if (!found) {
        return {
          success: false,
          awarded: 0,
          newBalance: await getBalance(memberId),
          reason: `Rule "${source}" tidak aktif untuk role ${member.category}`,
        };
      }
      rule = found;
    }

    // Rate limit check (per-day)
    if (rule.maxPerDay) {
      const todayCount = await db.pointTransaction.count({
        where: {
          memberId,
          source,
          createdAt: { gte: startOfDay(new Date()) },
        },
      });
      if (todayCount >= rule.maxPerDay) {
        return {
          success: false,
          awarded: 0,
          newBalance: await getBalance(memberId),
          reason: `Sudah mencapai limit harian (${rule.maxPerDay}x)`,
        };
      }
    }

    // Rate limit check (per-month)
    if (rule.maxPerMonth) {
      const monthCount = await db.pointTransaction.count({
        where: {
          memberId,
          source,
          createdAt: { gte: startOfMonth(new Date()) },
        },
      });
      if (monthCount >= rule.maxPerMonth) {
        return {
          success: false,
          awarded: 0,
          newBalance: await getBalance(memberId),
          reason: `Sudah mencapai limit bulanan (${rule.maxPerMonth}x)`,
        };
      }
    }

    // Cooldown check
    if (rule.cooldownHours && options.sourceId) {
      const lastTrigger = await db.pointTransaction.findFirst({
        where: { memberId, source, sourceId: options.sourceId },
        orderBy: { createdAt: "desc" },
      });
      if (lastTrigger) {
        const hoursSince =
          (Date.now() - lastTrigger.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < rule.cooldownHours) {
          return {
            success: false,
            awarded: 0,
            newBalance: await getBalance(memberId),
            reason: `Cooldown ${rule.cooldownHours} jam belum terpenuhi`,
          };
        }
      }
    }

    // Atomic transaction: insert point + update balance
    const result = await db.$transaction(async (tx) => {
      const currentBalance = await getBalance(memberId, tx);
      const newBalance = currentBalance + rule.points;

      const txn = await tx.pointTransaction.create({
        data: {
          memberId,
          type: "EARN",
          source,
          sourceId: options.sourceId,
          pointsConfigId: rule.id,
          amount: rule.points,
          balanceAfter: newBalance,
          description: options.description,
          awardedById: options.awardedById,
        },
      });

      return { transactionId: txn.id, newBalance };
    });

    logger.info("Points awarded", {
      memberId,
      source,
      amount: rule.points,
      newBalance: result.newBalance,
    });

    return {
      success: true,
      awarded: rule.points,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
    };
  } catch (err) {
    logger.error("awardPoints failed", { memberId, source, error: String(err) });
    return {
      success: false,
      awarded: 0,
      newBalance: 0,
      reason: "Internal error",
    };
  }
}

// =========================================================================
// CORE: Redeem Reward
// =========================================================================

/**
 * Klaim hadiah — kurangi poin + buat redemption.
 *
 * @returns RedeemResult dengan pickupCode yang bisa di-scan saat ambil
 *
 * Flow:
 * 1. Validasi reward exists & isActive
 * 2. Cek stok tersedia
 * 3. Cek cooldown per member
 * 4. Cek max klaim per member
 * 5. Cek poin cukup
 * 6. Atomic: create redemption + point transaction (REDEEM) + update stok
 *
 * Status awal: PENDING (kalau requiresApproval) atau APPROVED (auto)
 */
export async function redeemReward(
  memberId: string,
  rewardId: string,
  options: {
    memberNote?: string;
  } = {}
): Promise<RedeemResult> {
  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Validate reward
      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });
      if (!reward || !reward.isActive) {
        return { success: false, reason: "Hadiah tidak tersedia" } as RedeemResult;
      }

      // 2. Check role
      const member = await tx.member.findUnique({
        where: { id: memberId },
        select: { id: true, category: true },
      });
      if (!member) {
        return { success: false, reason: "Member tidak ditemukan" } as RedeemResult;
      }
      if (reward.minRole !== "STUDENT" && reward.minRole !== member.category) {
        return {
          success: false,
          reason: `Hadiah ini hanya untuk ${reward.minRole}`,
        } as RedeemResult;
      }

      // 3. Check stock
      if (reward.stock !== null && reward.stockClaimed >= reward.stock) {
        return { success: false, reason: "Stok hadiah habis" } as RedeemResult;
      }

      // 4. Check max per member
      if (reward.maxPerMember) {
        const existingClaims = await tx.rewardRedemption.count({
          where: { memberId, rewardId, status: { not: "CANCELLED" } },
        });
        if (existingClaims >= reward.maxPerMember) {
          return {
            success: false,
            reason: `Sudah pernah klaim hadiah ini (max ${reward.maxPerMember}x)`,
          } as RedeemResult;
        }
      }

      // 5. Check cooldown
      if (reward.cooldownDays) {
        const lastClaim = await tx.rewardRedemption.findFirst({
          where: {
            memberId,
            rewardId,
            status: { in: ["APPROVED", "DELIVERED"] },
          },
          orderBy: { createdAt: "desc" },
        });
        if (lastClaim) {
          const daysSince =
            (Date.now() - lastClaim.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < reward.cooldownDays) {
            return {
              success: false,
              reason: `Tunggu ${Math.ceil(reward.cooldownDays - daysSince)} hari lagi`,
            } as RedeemResult;
          }
        }
      }

      // 6. Check balance
      const currentBalance = await getBalance(memberId, tx);
      if (currentBalance < reward.pointCost) {
        return {
          success: false,
          reason: `Poin tidak cukup (butuh ${reward.pointCost}, punya ${currentBalance})`,
        } as RedeemResult;
      }

      // 7. Create redemption
      const newBalance = currentBalance - reward.pointCost;
      const initialStatus = reward.requiresApproval ? "PENDING" : "APPROVED";

      const redemption = await tx.rewardRedemption.create({
        data: {
          memberId,
          rewardId,
          rewardName: reward.name,
          rewardCategory: reward.category,
          pointsSpent: reward.pointCost,
          status: initialStatus,
          memberNote: options.memberNote,
          approvedAt: initialStatus === "APPROVED" ? new Date() : null,
        },
      });

      // 8. Decrement stock
      await tx.reward.update({
        where: { id: rewardId },
        data: { stockClaimed: { increment: 1 } },
      });

      // 9. Log point transaction (REDEEM)
      await tx.pointTransaction.create({
        data: {
          memberId,
          type: "REDEEM",
          source: "REDEEM",
          rewardId,
          redemptionId: redemption.id,
          amount: reward.pointCost,
          balanceAfter: newBalance,
          description: `Tukar "${reward.name}"`,
        },
      });

      logger.info("Reward redeemed", {
        memberId,
        rewardId,
        pointsSpent: reward.pointCost,
        newBalance,
        status: initialStatus,
      });

      return {
        success: true,
        redemptionId: redemption.id,
        pickupCode: redemption.pickupCode,
        newBalance,
      } as RedeemResult;
    });

    return result;
  } catch (err) {
    logger.error("redeemReward failed", { memberId, rewardId, error: String(err) });
    return { success: false, newBalance: 0, reason: "Internal error" };
  }
}

// =========================================================================
// CORE: Adjust (Manual by Pustakawan)
// =========================================================================

/**
 * Pustakawan adjust poin manual (naik/turun).
 * Untuk insentif khusus atau koreksi error.
 */
export async function adjustPoints(
  memberId: string,
  amount: number, // positif = tambah, negatif = kurang
  description: string,
  awardedById: string
): Promise<AwardResult> {
  if (amount === 0) {
    return { success: false, awarded: 0, newBalance: 0, reason: "Amount tidak boleh 0" };
  }

  const result = await db.$transaction(async (tx) => {
    const currentBalance = await getBalance(memberId, tx);
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
      return {
        success: false,
        awarded: 0,
        newBalance: currentBalance,
        reason: "Saldo tidak boleh negatif",
      } as AwardResult;
    }

    const txn = await tx.pointTransaction.create({
      data: {
        memberId,
        type: amount > 0 ? "ADJUST_UP" : "ADJUST_DOWN",
        amount: Math.abs(amount),
        balanceAfter: newBalance,
        description,
        awardedById,
      },
    });

    return { transactionId: txn.id, newBalance } as {
      transactionId: string;
      newBalance: number;
    };
  });

  logger.info("Points adjusted", { memberId, amount, by: awardedById });

  return {
    success: true,
    awarded: amount,
    newBalance: result.newBalance,
    transactionId: result.transactionId,
  };
}

// =========================================================================
// CORE: Get Balance
// =========================================================================

/**
 * Hitung saldo poin aktif member.
 * Bisa pakai client custom (untuk transaksi atomic) atau default.
 */
export async function getBalance(
  memberId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any = db
): Promise<number> {
  const lastTxn = await client.pointTransaction.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });
  return lastTxn?.balanceAfter ?? 0;
}

// =========================================================================
// HELPERS: Date boundaries
// =========================================================================

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

// =========================================================================
// HOOK: Loan Returned (auto-award points)
// =========================================================================

/**
 * Hook yang dipanggil saat buku dikembalikan.
 * Hitung & award poin untuk: LOAN_RETURNED, ON_TIME_RETURN, EARLY_RETURN.
 *
 * Dipanggil dari /api/loans/[id]/return/route.ts setelah update status.
 */
export async function onLoanReturned(
  loanId: string,
  options: { damaged?: boolean } = {}
): Promise<{ awarded: number; sources: PointSource[] }> {
  const loan = await db.loan.findUnique({
    where: { id: loanId },
    include: {
      member: true,
      bookItem: { include: { book: true } },
    },
  });

  if (!loan || !loan.returnDate) {
    return { awarded: 0, sources: [] };
  }

  // Anti-cheat: skip kalau buku terlalu tipis atau pinjam terlalu sebentar
  const rule = await db.pointRule.findFirst({
    where: { code: "LOAN_RETURNED", isActive: true },
  });

  if (rule) {
    // Min loan days check
    if (rule.minLoanDays) {
      const days = Math.floor(
        (loan.returnDate.getTime() - loan.loanDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days < rule.minLoanDays) {
        logger.info("Skip points: loan too short", { loanId, days, min: rule.minLoanDays });
        return { awarded: 0, sources: [] };
      }
    }

    // Min book pages check
    if (rule.minBookPages && loan.bookItem.book.pages) {
      if (loan.bookItem.book.pages < rule.minBookPages) {
        logger.info("Skip points: book too thin", {
          loanId,
          pages: loan.bookItem.book.pages,
          min: rule.minBookPages,
        });
        return { awarded: 0, sources: [] };
      }
    }

    // Damaged book → no points
    if (options.damaged) {
      logger.info("Skip points: book damaged", { loanId });
      return { awarded: 0, sources: [] };
    }
  }

  const sources: PointSource[] = [];
  let totalAwarded = 0;

  // 1. Base: LOAN_RETURNED
  const base = await awardPoints(loan.memberId, "LOAN_RETURNED", {
    sourceId: loanId,
    description: `Selesai baca "${loan.bookItem.book.title}"`,
  });
  if (base.success && base.awarded > 0) {
    sources.push("LOAN_RETURNED");
    totalAwarded += base.awarded;
  }

  // 2. Bonus: ON_TIME_RETURN
  if (loan.returnDate <= loan.dueDate) {
    const onTime = await awardPoints(loan.memberId, "ON_TIME_RETURN", {
      sourceId: `${loanId}:on_time`,
      description: "Tepat waktu!",
    });
    if (onTime.success && onTime.awarded > 0) {
      sources.push("ON_TIME_RETURN");
      totalAwarded += onTime.awarded;
    }
  }

  // 3. Bonus: EARLY_RETURN (3+ hari lebih awal)
  const daysEarly = Math.floor(
    (loan.dueDate.getTime() - loan.returnDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysEarly >= 3) {
    const early = await awardPoints(loan.memberId, "EARLY_RETURN", {
      sourceId: `${loanId}:early`,
      description: `${daysEarly} hari lebih awal!`,
    });
    if (early.success && early.awarded > 0) {
      sources.push("EARLY_RETURN");
      totalAwarded += early.awarded;
    }
  }

  return { awarded: totalAwarded, sources };
}

// =========================================================================
// EXPORTS untuk API
// =========================================================================

export const PointsEngine = {
  awardPoints,
  redeemReward,
  adjustPoints,
  getBalance,
  onLoanReturned,
};
