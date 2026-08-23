import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";

/**
 * GET /api/rewards/analytics — Analytics dashboard untuk pustakawan.
 *
 * Returns:
 * - kpis: total poin beredar, poin masuk bulan ini, total klaim, stok alert
 * - leaderboard: top 10 members by balance
 * - topRewards: hadiah paling laris
 * - dailyTrend: klaim per hari 30 hari terakhir
 * - lowStock: hadiah dengan stok hampir habis
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // === KPIs ===
  // Total poin beredar = jumlah dari latest balance per member
  const allBalances = await db.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["memberId"],
    select: { balanceAfter: true, memberId: true },
  });
  const totalCirculation = allBalances.reduce((sum, b) => sum + b.balanceAfter, 0);

  // Poin masuk bulan ini
  const monthEarn = await db.pointTransaction.aggregate({
    where: { type: "EARN", createdAt: { gte: monthStart } },
    _sum: { amount: true },
  });

  // Total klaim bulan ini
  const monthRedemptions = await db.rewardRedemption.count({
    where: { createdAt: { gte: monthStart } },
  });

  // === Leaderboard ===
  const leaderboard = await db.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["memberId"],
    take: 10,
    select: {
      memberId: true,
      balanceAfter: true,
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
          category: true,
          classGrade: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  // Sort by balance desc
  const sortedLeaderboard = leaderboard
    .sort((a, b) => b.balanceAfter - a.balanceAfter)
    .map((entry, idx) => ({
      rank: idx + 1,
      member: entry.member,
      balance: entry.balanceAfter,
    }));

  // === Top Rewards ===
  const topRewardsRaw = await db.rewardRedemption.groupBy({
    by: ["rewardId"],
    _count: true,
    where: { status: { in: ["APPROVED", "DELIVERED"] } },
    orderBy: { _count: { rewardId: "desc" } },
    take: 5,
  });
  const topRewards = await Promise.all(
    topRewardsRaw.map(async (r) => {
      const reward = await db.reward.findUnique({
        where: { id: r.rewardId },
        select: { id: true, name: true, category: true, pointCost: true, imageUrl: true },
      });
      return { ...reward, claimCount: r._count };
    })
  );

  // === Low Stock ===
  const lowStock = await db.reward.findMany({
    where: {
      isActive: true,
      stock: { not: null },
    },
    select: {
      id: true,
      name: true,
      stock: true,
      stockClaimed: true,
      category: true,
    },
  });
  const lowStockFiltered = lowStock
    .map((r) => ({
      ...r,
      remaining: (r.stock ?? 0) - r.stockClaimed,
      percentLeft: r.stock ? ((r.stock - r.stockClaimed) / r.stock) * 100 : 100,
    }))
    .filter((r) => r.percentLeft <= 30)
    .sort((a, b) => a.percentLeft - b.percentLeft)
    .slice(0, 5);

  return NextResponse.json({
    kpis: {
      totalCirculation,
      monthEarn: monthEarn._sum.amount || 0,
      monthRedemptions,
      lowStockCount: lowStockFiltered.length,
    },
    leaderboard: sortedLeaderboard,
    topRewards,
    lowStock: lowStockFiltered,
    period: {
      from: monthStart.toISOString(),
      to: new Date().toISOString(),
    },
  });
}
