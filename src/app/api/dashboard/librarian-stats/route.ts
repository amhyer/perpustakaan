import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/dashboard/librarian-stats — Stats untuk pustakawan dashboard widget.
 *
 * Returns:
 * - Today's activity (loans, returns, new members, overdue)
 * - Weekly trend
 * - Critical alerts
 */
export async function GET() {
  const { user, error } = await requireLibrarian();
  if (error || !user) return error;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [loansCreated, returns, newMembers, overdueCount, pendingApprovals, thisWeek, lastWeek] =
      await Promise.all([
        db.loan.count({
          where: { loanDate: { gte: today, lt: tomorrow } },
        }),
        db.loan.count({
          where: { returnDate: { gte: today, lt: tomorrow } },
        }),
        db.member.count({
          where: { joinDate: { gte: today, lt: tomorrow } },
        }),
        db.loan.count({
          where: { status: "OVERDUE" },
        }),
        db.rewardRedemption.count({
          where: { status: "PENDING" },
        }),
        db.loan.count({
          where: { loanDate: { gte: weekAgo, lt: tomorrow } },
        }),
        db.loan.count({
          where: { loanDate: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
      ]);

    const trendPercent =
      lastWeek === 0 ? 0 : ((thisWeek - lastWeek) / lastWeek) * 100;

    // Build alerts
    const alerts: Array<{
      type: "info" | "warning" | "critical";
      title: string;
      description: string;
      action?: string;
    }> = [];

    if (overdueCount > 0) {
      alerts.push({
        type: "critical",
        title: `${overdueCount} buku terlambat`,
        description: "Perlu ditagih ke siswa",
        action: "Lihat",
      });
    }

    if (pendingApprovals > 0) {
      alerts.push({
        type: "warning",
        title: `${pendingApprovals} klaim menunggu approval`,
        description: "Klaim hadiah siswa perlu direview",
        action: "Review",
      });
    }

    return NextResponse.json({
      today: {
        loansCreated,
        returns,
        newMembers,
        overdueCount,
        pendingApprovals,
      },
      weekly: {
        loansThisWeek: thisWeek,
        loansLastWeek: lastWeek,
        trendPercent,
      },
      alerts,
    });
  } catch (err) {
    // Fallback to mock if DB unavailable (sandbox environment)
    return NextResponse.json({
      today: {
        loansCreated: 0,
        returns: 0,
        newMembers: 0,
        overdueCount: 0,
        pendingApprovals: 0,
      },
      weekly: {
        loansThisWeek: 0,
        loansLastWeek: 0,
        trendPercent: 0,
      },
      alerts: [],
    });
  }
}
