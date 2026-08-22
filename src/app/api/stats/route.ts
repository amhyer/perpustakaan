import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const last30 = new Date(now.getTime() - 30 * 86400000);

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
    db.loan.findMany({ where: { loanDate: { gte: last30 } }, include: { member: true, bookItem: { include: { book: true } } }, orderBy: { loanDate: "desc" }, take: 100 }),
    db.loan.findMany({ where: { status: { in: ["LOANED", "OVERDUE"] }, dueDate: { lt: now } }, include: { member: true, bookItem: { include: { book: true } } }, orderBy: { dueDate: "asc" }, take: 50 }),
    db.loan.count({ where: { loanDate: { gte: todayStart, lt: todayEnd } } }),
    db.loan.count({ where: { returnDate: { gte: todayStart, lt: todayEnd } } }),
    db.member.count({ where: { joinDate: { gte: todayStart, lt: todayEnd } } }),
  ]);

  const [recentLoansToday, recentReturnsToday, recentNewMembersToday] = await Promise.all([
    db.loan.findMany({ where: { loanDate: { gte: todayStart, lt: todayEnd } }, select: { bookItem: { select: { book: { select: { title: true, author: true } } } }, member: { select: { fullName: true } } }, take: 10 }),
    db.loan.findMany({ where: { returnDate: { gte: todayStart, lt: todayEnd } }, select: { bookItem: { select: { book: { select: { title: true, author: true } } } }, member: { select: { fullName: true } } }, take: 10 }),
    db.member.findMany({ where: { joinDate: { gte: todayStart, lt: todayEnd } }, select: { fullName: true, category: true }, take: 10 }),
  ]);

  // Buku terpopuler (berdasarkan jumlah peminjaman)
  const popularBooksRaw = await db.loan.groupBy({
    by: ["bookId"],
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take: 5,
  });
  const popularBookIds = popularBooksRaw.map((p) => p.bookId);
  const popularBooksData = await db.book.findMany({
    where: { id: { in: popularBookIds } },
    select: { id: true, title: true, author: true, coverColor: true, coverImage: true },
  });
  const popularBooks = popularBooksRaw.map((p) => ({
    ...popularBooksData.find((b) => b.id === p.bookId),
    loanCount: p._count,
  }));

  // Anggota paling aktif
  const activeMembersRaw = await db.loan.groupBy({
    by: ["memberId"],
    _count: true,
    orderBy: { _count: { memberId: "desc" } },
    take: 5,
  });
  const activeMemberIds = activeMembersRaw.map((p) => p.memberId);
  const activeMembersData = await db.member.findMany({
    where: { id: { in: activeMemberIds } },
    select: { id: true, fullName: true, memberNumber: true, category: true, classGrade: true },
  });
  const topMembers = activeMembersRaw.map((p) => ({
    ...activeMembersData.find((m) => m.id === p.memberId),
    loanCount: p._count,
  }));

  // Tren peminjaman 7 hari terakhir
  const trend: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const count = await db.loan.count({ where: { loanDate: { gte: dayStart, lt: dayEnd } } });
    trend.push({
      date: dayStart.toISOString(),
      label: dayStart.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
      count,
    });
  }

  // Peminjaman per kategori
  const categoryStatsRaw = await db.loan.findMany({
    select: { bookItem: { select: { book: { select: { category: { select: { name: true } } } } } } },
    take: 500,
  });
  const categoryMap: Record<string, number> = {};
  for (const l of categoryStatsRaw) {
    const cat = l.bookItem?.book?.category?.name || "Lainnya";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }
  const categoryStats = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Total denda tertunggak
  const overdueFineTotal = overdueList.reduce((sum, l) => {
    const rule = l.member.category === "TEACHER" ? { finePerDay: 500 } : { finePerDay: 1000 };
    const days = Math.ceil((now.getTime() - l.dueDate.getTime()) / 86400000);
    return sum + Math.max(0, days) * rule.finePerDay;
  }, 0);

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
