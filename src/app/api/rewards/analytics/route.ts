import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { getSmartLeaderboard } from "@/lib/leaderboard-cache";

/**
 * GET /api/rewards/analytics — Analytics dashboard untuk pustakawan.
 *
 * Returns:
 * - kpis: total poin beredar, poin masuk bulan ini, total klaim, stok alert
 * - leaderboard: top 10 members by balance (cached 5 menit)
 * - topRewards: hadiah paling laris
 * - dailyTrend: klaim per hari 30 hari terakhir
 * - lowStock: hadiah dengan stok hampir habis
 *
 * Performance: leaderboard pakai cached snapshot (5 min TTL).
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
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

    // === Leaderboard (cached!) ===
    const snapshot = await getSmartLeaderboard();
    const sortedLeaderboard = snapshot.entries.slice(0, 10).map((entry) => ({
      rank: entry.rank,
      member: {
        id: entry.member.id,
        fullName: entry.member.fullName,
        memberNumber: entry.member.memberNumber,
        category: entry.member.category,
        classGrade: entry.member.classGrade,
      },
      balance: entry.balance,
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
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
