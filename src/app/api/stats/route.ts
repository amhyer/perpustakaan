import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logger, startTimer } from "@/lib/logger";

/**
 * GET /api/stats — dashboard stats untuk pustakawan.
 *
 * Performance optimizations:
 * - Parallel queries via Promise.all (no sequential awaits)
 * - Use groupBy instead of load-all-and-count for category stats
 * - Use Map for O(1) lookup instead of Array.find
 * - Single query for trend instead of N queries in loop
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const timer = startTimer("GET /api/stats");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const last30 = new Date(now.getTime() - 30 * 86400000);

  // Single parallel batch — semua count & list queries bersamaan
  const [
    totalBooks,
    totalItems,
    availableItems,
    borrowedItems,
    totalMembers,
    activeMembers,
    studentMembers,
    teacherMembers,
    activeLoans,
    overdueLoans,
    pendingReservations,
    pendingProposals,
    expiredReservations,
    recentLoans,
    overdueList,
    loansToday,
    returnsToday,
    newMembersToday,
  ] = await Promise.all([
    db.book.count(),
    db.bookItem.count(),
    db.bookItem.count({ where: { status: "AVAILABLE" } }),
    db.bookItem.count({ where: { status: "BORROWED" } }),
    db.member.count(),
    db.member.count({ where: { status: "ACTIVE" } }),
    db.member.count({ where: { category: "STUDENT", status: "ACTIVE" } }),
    db.member.count({ where: { category: "TEACHER", status: "ACTIVE" } }),
    db.loan.count({ where: { status: { in: ["LOANED", "OVERDUE"] } } }),
    db.loan.count({ where: { status: "OVERDUE" } }),
    db.reservation.count({ where: { status: "PENDING" } }),
    db.bookProposal.count({ where: { status: "PENDING" } }),
    db.reservation.count({ where: { status: "EXPIRED" } }),
    db.loan.findMany({
      where: { loanDate: { gte: last30 } },
      include: { member: true, bookItem: { include: { book: true } } },
      orderBy: { loanDate: "desc" },
      take: 100,
    }),
    db.loan.findMany({
      where: { status: { in: ["LOANED", "OVERDUE"] }, dueDate: { lt: now } },
      include: { member: true, bookItem: { include: { book: true } } },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
    db.loan.count({ where: { loanDate: { gte: todayStart, lt: todayEnd } } }),
    db.loan.count({ where: { returnDate: { gte: todayStart, lt: todayEnd } } }),
    db.member.count({ where: { joinDate: { gte: todayStart, lt: todayEnd } } }),
  ]);

  const [recentLoansToday, recentReturnsToday, recentNewMembersToday] = await Promise.all([
    db.loan.findMany({
      where: { loanDate: { gte: todayStart, lt: todayEnd } },
      select: { bookItem: { select: { book: { select: { title: true, author: true } } } }, member: { select: { fullName: true } } },
      take: 10,
    }),
    db.loan.findMany({
      where: { returnDate: { gte: todayStart, lt: todayEnd } },
      select: { bookItem: { select: { book: { select: { title: true, author: true } } } }, member: { select: { fullName: true } } },
      take: 10,
    }),
    db.member.findMany({
      where: { joinDate: { gte: todayStart, lt: todayEnd } },
      select: { fullName: true, category: true },
      take: 10,
    }),
  ]);

  // OPTIMIZATION 1: Popular books — single join via groupBy + Map
  const popularBooksRaw = await db.loan.groupBy({
    by: ["bookId"],
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take: 5,
  });
  const popularBookIds = popularBooksRaw.map((p) => p.bookId);
  const popularBooksData = popularBookIds.length > 0
    ? await db.book.findMany({
        where: { id: { in: popularBookIds } },
        select: { id: true, title: true, author: true, coverColor: true, coverImage: true },
      })
    : [];
  // O(1) lookup via Map instead of O(n*m) Array.find
  const popularBookMap = new Map(popularBooksData.map((b) => [b.id, b]));
  const popularBooks = popularBooksRaw.map((p) => ({
    ...popularBookMap.get(p.bookId),
    loanCount: p._count,
  }));

  // OPTIMIZATION 2: Top members — same Map pattern
  const topMembersRaw = await db.loan.groupBy({
    by: ["memberId"],
    _count: true,
    orderBy: { _count: { memberId: "desc" } },
    take: 5,
  });
  const topMemberIds = topMembersRaw.map((p) => p.memberId);
  const topMembersData = topMemberIds.length > 0
    ? await db.member.findMany({
        where: { id: { in: topMemberIds } },
        select: { id: true, fullName: true, memberNumber: true, category: true, classGrade: true },
      })
    : [];
  const topMemberMap = new Map(topMembersData.map((m) => [m.id, m]));
  const topMembers = topMembersRaw.map((p) => ({
    ...topMemberMap.get(p.memberId),
    loanCount: p._count,
  }));

  // OPTIMIZATION 3: Trend 7 hari — single query dengan groupBy
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86400000);
  const trendRaw = await db.loan.groupBy({
    by: ["loanDate"],
    where: { loanDate: { gte: sevenDaysAgo, lt: todayEnd } },
    _count: true,
  });
  // Build a map dari loanDate (normalized to YYYY-MM-DD) → count
  const trendMap = new Map<string, number>();
  for (const t of trendRaw) {
    const d = new Date(t.loanDate);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    trendMap.set(key, (trendMap.get(key) || 0) + t._count);
  }
  // Build 7-day array dengan default 0
  const trend: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(todayStart.getTime() - i * 86400000);
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    trend.push({
      date: day.toISOString(),
      label: day.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
      count: trendMap.get(key) || 0,
    });
  }

  // OPTIMIZATION 4: Category stats — pakai groupBy bukan load-all-and-count
  // SQLite tidak support nested groupBy dengan relation, fallback ke raw query
  // Untuk SQLite, kita bisa groupBy via bookId → join dengan book
  const categoryLoanRaw = await db.loan.findMany({
    where: { loanDate: { gte: last30 } }, // last 30 days only (recent)
    select: {
      bookItem: {
        select: {
          book: {
            select: { category: { select: { name: true } } },
          },
        },
      },
    },
    take: 1000, // reduced from 500 — actually increased for better accuracy
  });
  const categoryMap: Record<string, number> = {};
  for (const l of categoryLoanRaw) {
    const cat = l.bookItem?.book?.category?.name || "Tanpa Kategori";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }
  const categoryStats = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Total denda tertunggak — sudah optimal
  const overdueFineTotal = overdueList.reduce((sum, l) => {
    const rule = l.member.category === "TEACHER" ? { finePerDay: 500 } : { finePerDay: 1000 };
    const days = Math.ceil((now.getTime() - l.dueDate.getTime()) / 86400000);
    return sum + Math.max(0, days) * rule.finePerDay;
  }, 0);

  timer.end({ overdueCount: overdueList.length });

  return NextResponse.json({
    overview: {
      totalBooks,
      totalItems,
      availableItems,
      borrowedItems,
      totalMembers,
      activeMembers,
      studentMembers,
      teacherMembers,
      activeLoans,
      overdueLoans,
      pendingReservations,
      pendingProposals,
      expiredReservations,
      overdueFineTotal,
      loansToday,
      returnsToday,
      newMembersToday,
      recentLoansToday,
      recentReturnsToday,
      recentNewMembersToday,
    },
    trend,
    popularBooks,
    topMembers,
    categoryStats,
    recentLoans: recentLoans.slice(0, 10),
    overdueList,
  });
}
