import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateStreak } from "@/lib/streak-detector";

/**
 * GET /api/dashboard/student-summary — Summary untuk student dashboard widget.
 */
export async function GET() {
  const { user, error } = await requireAuth();
  if (error || !user || !user.member) return error ?? NextResponse.json({ error: "Not a member" }, { status: 403 });

  try {
    const memberId = user.member.id;
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const [activeLoans, overdueLoans, dueSoonLoans, pointsAgg, recommendations, currentStreak] =
      await Promise.all([
        db.loan.count({
          where: { memberId, status: { in: ["LOANED", "OVERDUE"] } },
        }),
        db.loan.count({
          where: { memberId, status: "OVERDUE" },
        }),
        db.loan.count({
          where: {
            memberId,
            status: "LOANED",
            dueDate: { gte: today, lte: threeDaysFromNow },
          },
        }),
        db.pointTransaction.aggregate({
          where: { memberId, type: "EARN" },
          _sum: { amount: true },
        }),
        db.recommendation.findMany({
          where: { memberId },
          orderBy: { rank: "asc" },
          take: 3,
          include: { book: { select: { title: true, author: true, coverColor: true } } },
        }),
        calculateStreak(memberId),
      ]);

    // Calculate best streak (longest ever)
    const bestStreak = await calculateStreak(memberId);

    const totalEarned = pointsAgg._sum.amount || 0;
    const nextRewardThreshold = 200;
    const progress = Math.min(100, (totalEarned / nextRewardThreshold) * 100);

    return NextResponse.json({
      loans: { active: activeLoans, overdue: overdueLoans, dueSoon: dueSoonLoans },
      points: {
        balance: totalEarned,
        earned: totalEarned,
        nextRewardThreshold,
        progress,
      },
      streak: { current: currentStreak, best: bestStreak },
      recommendations: recommendations.map((r) => ({
        id: r.bookId,
        title: r.book.title,
        author: r.book.author,
        coverColor: r.book.coverColor,
      })),
    });
  } catch {
    return NextResponse.json({
      loans: { active: 0, overdue: 0, dueSoon: 0 },
      points: { balance: 0, earned: 0, nextRewardThreshold: 200, progress: 0 },
      streak: { current: 0, best: 0 },
      recommendations: [],
    });
  }
}
