import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { parsePagination } from "@/lib/query-helpers";

/**
 * GET /api/redemptions/admin — Antrian klaim untuk pustakawan.
 *
 * Query params:
 * - status: filter (default: PENDING)
 * - page, pageSize
 * - memberId: filter by member
 * - rewardId: filter by reward
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const pagination = parsePagination(searchParams, { defaultPageSize: 20, maxPageSize: 100 });
  const status = searchParams.get("status") || "PENDING";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status };
  const memberId = searchParams.get("memberId");
  const rewardId = searchParams.get("rewardId");
  if (memberId) where.memberId = memberId;
  if (rewardId) where.rewardId = rewardId;

  const [items, total, pendingCount] = await Promise.all([
    db.rewardRedemption.findMany({
      where,
      orderBy: { createdAt: "asc" }, // FIFO
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            memberNumber: true,
            category: true,
            classGrade: true,
          },
        },
        reward: { select: { id: true, name: true, pointCost: true, category: true, stock: true } },
      },
    }),
    db.rewardRedemption.count({ where }),
    db.rewardRedemption.count({ where: { status: "PENDING" } }),
  ]);

  // For each pending, cek apakah ada warning flags
  const annotated = await Promise.all(
    items.map(async (r) => {
      const balance = await db.pointTransaction.findFirst({
        where: { memberId: r.memberId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });
      const currentBalance = balance?.balanceAfter ?? 0;

      // Check cooldown violation
      let cooldownWarning: string | null = null;
      const rewardFull = await db.reward.findUnique({ where: { id: r.rewardId } });
      if (rewardFull?.cooldownDays) {
        const lastClaim = await db.rewardRedemption.findFirst({
          where: {
            memberId: r.memberId,
            rewardId: r.rewardId,
            status: { in: ["APPROVED", "DELIVERED"] },
            id: { not: r.id },
          },
          orderBy: { createdAt: "desc" },
        });
        if (lastClaim) {
          const daysSince =
            (Date.now() - lastClaim.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < rewardFull.cooldownDays) {
            cooldownWarning = `Cooldown ${rewardFull.cooldownDays} hari belum terpenuhi (baru ${Math.floor(daysSince)} hari)`;
          }
        }
      }

      return {
        ...r,
        currentBalance,
        insufficientBalance: currentBalance < r.pointsSpent,
        cooldownWarning,
        stockRemaining:
          rewardFull?.stock === null ? null : (rewardFull?.stock ?? 0) - (rewardFull?.stockClaimed ?? 0),
      };
    })
  );

  return NextResponse.json({
    items: annotated,
    total,
    pendingCount,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  });
}
