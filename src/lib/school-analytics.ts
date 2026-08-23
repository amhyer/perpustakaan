/**
 * School Analytics — Advanced insights for kepala sekolah.
 *
 * Sprint O - Tier 2 #7: Advanced Analytics untuk Kepsek.
 */

import { db } from "@/lib/db";

// ===== Types =====

export interface SchoolAnalytics {
  monthlyTrends: Array<{
    month: string;
    loans: number;
    returns: number;
    newMembers: number;
  }>;
  weeklyVelocity: Array<{
    week: string;
    loanCount: number;
    activeMembers: number;
  }>;
  classComparison: Array<{
    classGrade: string;
    studentCount: number;
    totalLoans: number;
    avgBooksPerStudent: number;
    topReader: string | null;
    topReaderCount: number;
  }>;
  genrePreferences: Array<{
    category: string;
    loanCount: number;
    percent: number;
  }>;
  atRiskStudents: Array<{
    memberId: string;
    memberName: string;
    classGrade: string;
    daysSinceLastLoan: number;
    totalLoans: number;
  }>;
  peakTimes: Array<{
    dayOfWeek: number;
    hour: number;
    count: number;
  }>;
  yearComparison: {
    thisYear: { loans: number; members: number; books: number };
    lastYear: { loans: number; members: number; books: number };
    loanGrowthPercent: number;
    memberGrowthPercent: number;
    bookGrowthPercent: number;
  };
  predictions: {
    nextMonthLoans: number;
    nextMonthMembers: number;
    confidence: "low" | "medium" | "high";
  };
  topReaders: Array<{
    memberId: string;
    memberName: string;
    classGrade: string;
    booksRead: number;
    streak: number;
  }>;
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// ===== Main =====

export async function getSchoolAnalytics(): Promise<SchoolAnalytics> {
  const monthlyTrends = await getMonthlyTrends(6);
  const weeklyVelocity = await getWeeklyVelocity(12);
  const classComparison = await getClassComparison();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const genrePreferences = await getGenrePreferences(sixMonthsAgo);
  const atRiskStudents = await getAtRiskStudents();
  const peakTimes = await getPeakTimes();
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
  const endOfLastYear = new Date(now.getFullYear(), 0, 1);
  const yearComparison = await getYearComparison(startOfYear, startOfLastYear, endOfLastYear);
  const predictions = predictNextMonth(monthlyTrends);
  const topReaders = await getTopReaders(10);

  return {
    monthlyTrends,
    weeklyVelocity,
    classComparison,
    genrePreferences,
    atRiskStudents,
    peakTimes,
    yearComparison,
    predictions,
    topReaders,
  };
}

// ===== Helpers =====

async function getMonthlyTrends(months: number) {
  const now = new Date();
  const trends: Array<{ month: string; loans: number; returns: number; newMembers: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const [loans, returns, newMembers] = await Promise.all([
      db.loan.count({ where: { loanDate: { gte: start, lt: end } } }),
      db.loan.count({ where: { returnDate: { gte: start, lt: end } } }),
      db.member.count({ where: { joinDate: { gte: start, lt: end } } }),
    ]);
    trends.push({
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      loans,
      returns,
      newMembers,
    });
  }
  return trends;
}

async function getWeeklyVelocity(weeks: number) {
  const now = new Date();
  const velocity: Array<{ week: string; loanCount: number; activeMembers: number }> = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const loans = await db.loan.findMany({
      where: { loanDate: { gte: start, lt: end } },
      select: { memberId: true },
    });
    const uniqueMembers = new Set(loans.map((l) => l.memberId)).size;
    const weekNum = getWeekNumber(end);
    velocity.push({
      week: `${end.getFullYear()}-W${String(weekNum).padStart(2, "0")}`,
      loanCount: loans.length,
      activeMembers: uniqueMembers,
    });
  }
  return velocity;
}

function getWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

async function getClassComparison() {
  const members = await db.member.findMany({
    where: { status: "ACTIVE", classGrade: { not: null } },
    select: { id: true, fullName: true, classGrade: true },
  });

  const classMap = new Map<string, Array<{ id: string; name: string }>>();
  members.forEach((m) => {
    if (!m.classGrade) return;
    if (!classMap.has(m.classGrade)) classMap.set(m.classGrade, []);
    classMap.get(m.classGrade)!.push({ id: m.id, name: m.fullName });
  });

  const result: Array<{
    classGrade: string;
    studentCount: number;
    totalLoans: number;
    avgBooksPerStudent: number;
    topReader: string | null;
    topReaderCount: number;
  }> = [];

  for (const [classGrade, students] of classMap) {
    const memberIds = students.map((s) => s.id);
    const loans = await db.loan.groupBy({
      by: ["memberId"],
      where: { memberId: { in: memberIds }, status: "RETURNED" },
      _count: { _all: true },
    });
    const totalLoans = loans.reduce((sum, l) => sum + (l._count?._all ?? 0), 0);
    const avg = students.length > 0 ? totalLoans / students.length : 0;
    let topReader: string | null = null;
    let topCount = 0;
    for (const loan of loans) {
      const count = loan._count?._all ?? 0;
      if (count > topCount) {
        const member = students.find((s) => s.id === loan.memberId);
        if (member) {
          topReader = member.name;
          topCount = count;
        }
      }
    }
    result.push({
      classGrade,
      studentCount: students.length,
      totalLoans,
      avgBooksPerStudent: Number(avg.toFixed(2)),
      topReader,
      topReaderCount: topCount,
    });
  }
  return result.sort((a, b) => b.totalLoans - a.totalLoans);
}

async function getGenrePreferences(since: Date) {
  const loans = await db.loan.findMany({
    where: { loanDate: { gte: since } },
    include: { bookItem: { include: { book: { include: { category: { select: { name: true } } } } } } },
  });
  const categoryCount = new Map<string, number>();
  loans.forEach((l) => {
    const cat = l.bookItem?.book?.category?.name;
    if (cat) categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
  });
  const total = loans.length || 1;
  return Array.from(categoryCount.entries())
    .map(([category, loanCount]) => ({
      category,
      loanCount,
      percent: Math.round((loanCount / total) * 100),
    }))
    .sort((a, b) => b.loanCount - a.loanCount)
    .slice(0, 10);
}

async function getAtRiskStudents() {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
  const allMembers = await db.member.findMany({
    where: { status: "ACTIVE", category: "STUDENT" },
    select: {
      id: true, fullName: true, classGrade: true,
      loans: { where: { status: "RETURNED" }, select: { returnDate: true, loanDate: true }, orderBy: { returnDate: "desc" }, take: 1 },
      _count: { select: { loans: true } },
    },
    take: 500,
  });

  const atRisk: Array<{ memberId: string; memberName: string; classGrade: string; daysSinceLastLoan: number; totalLoans: number }> = [];
  for (const m of allMembers) {
    if (m._count.loans === 0) continue;
    const lastActivity = m.loans[0]?.returnDate || m.loans[0]?.loanDate;
    if (!lastActivity) continue;
    const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / 86400000);
    if (daysSince >= 30 && lastActivity < sixtyDaysAgo) {
      atRisk.push({
        memberId: m.id,
        memberName: m.fullName,
        classGrade: m.classGrade || "-",
        daysSinceLastLoan: daysSince,
        totalLoans: m._count.loans,
      });
    }
  }
  return atRisk.sort((a, b) => b.daysSinceLastLoan - a.daysSinceLastLoan).slice(0, 20);
}

async function getPeakTimes() {
  const loans = await db.loan.findMany({
    select: { loanDate: true },
    orderBy: { loanDate: "desc" },
    take: 1000,
  });
  const heatmap = new Map<string, number>();
  for (const l of loans) {
    const dow = l.loanDate.getDay();
    const hour = l.loanDate.getHours();
    const key = `${dow}-${hour}`;
    heatmap.set(key, (heatmap.get(key) || 0) + 1);
  }
  const result: Array<{ dayOfWeek: number; hour: number; count: number }> = [];
  heatmap.forEach((count, key) => {
    const [dow, hour] = key.split("-").map(Number);
    result.push({ dayOfWeek: dow, hour, count });
  });
  return result.sort((a, b) => b.count - a.count).slice(0, 30);
}

async function getYearComparison(
  startOfYear: Date, startOfLastYear: Date, endOfLastYear: Date
) {
  const [thisYearLoans, thisYearMembers, thisYearBooks, lastYearLoans, lastYearMembers, lastYearBooks] =
    await Promise.all([
      db.loan.count({ where: { loanDate: { gte: startOfYear } } }),
      db.member.count({ where: { joinDate: { gte: startOfYear } } }),
      db.book.count({ where: { createdAt: { gte: startOfYear } } }),
      db.loan.count({ where: { loanDate: { gte: startOfLastYear, lt: endOfLastYear } } }),
      db.member.count({ where: { joinDate: { gte: startOfLastYear, lt: endOfLastYear } } }),
      db.book.count({ where: { createdAt: { gte: startOfLastYear, lt: endOfLastYear } } }),
    ]);

  const calcGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    thisYear: { loans: thisYearLoans, members: thisYearMembers, books: thisYearBooks },
    lastYear: { loans: lastYearLoans, members: lastYearMembers, books: lastYearBooks },
    loanGrowthPercent: calcGrowth(thisYearLoans, lastYearLoans),
    memberGrowthPercent: calcGrowth(thisYearMembers, lastYearMembers),
    bookGrowthPercent: calcGrowth(thisYearBooks, lastYearBooks),
  };
}

function predictNextMonth(
  trends: Array<{ month: string; loans: number; returns: number; newMembers: number }>
): { nextMonthLoans: number; nextMonthMembers: number; confidence: "low" | "medium" | "high" } {
  if (trends.length < 2) {
    return { nextMonthLoans: 0, nextMonthMembers: 0, confidence: "low" };
  }
  const n = trends.length;
  const xs = trends.map((_, i) => i);
  const ys = trends.map((t) => t.loans);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const nextLoans = Math.max(0, Math.round(intercept + slope * n));
  const memberYs = trends.map((t) => t.newMembers);
  const sumMY = memberYs.reduce((a, b) => a + b, 0);
  const sumMXY = xs.reduce((acc, x, i) => acc + x * memberYs[i], 0);
  const mSlope = (n * sumMXY - sumX * sumMY) / (n * sumX2 - sumX * sumX);
  const mIntercept = (sumMY - mSlope * sumX) / n;
  const nextMembers = Math.max(0, Math.round(mIntercept + mSlope * n));
  const variance = ys.reduce((acc, y) => {
    const predicted = intercept + slope * xs[ys.indexOf(y)];
    return acc + Math.pow(y - predicted, 2);
  }, 0) / n;
  const mean = sumY / n;
  const cv = Math.sqrt(variance) / (mean || 1);
  const confidence: "low" | "medium" | "high" = cv < 0.2 ? "high" : cv < 0.5 ? "medium" : "low";
  return { nextMonthLoans: nextLoans, nextMonthMembers: nextMembers, confidence };
}

async function getTopReaders(limit: number) {
  const counts = await db.loan.groupBy({
    by: ["memberId"],
    where: { status: "RETURNED" },
    _count: { _all: true },
  });
  const sorted = counts.sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0)).slice(0, limit);
  const memberIds = sorted.map((c) => c.memberId);
  const members = await db.member.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, fullName: true, classGrade: true },
  });
  const memberMap = new Map(members.map((m) => [m.id, m]));
  return sorted.map((c) => {
    const member = memberMap.get(c.memberId);
    return {
      memberId: c.memberId,
      memberName: member?.fullName || "Unknown",
      classGrade: member?.classGrade || "-",
      booksRead: c._count?._all ?? 0,
      streak: 0,
    };
  });
}

// ===== Member Report Card =====

export interface MemberReportCard {
  memberId: string;
  memberName: string;
  classGrade: string;
  totalLoans: number;
  totalReturned: number;
  totalOverdue: number;
  currentStreak: number;
  favoriteCategory: string | null;
  favoriteAuthor: string | null;
  readingVelocity: number;
  level: string;
  points: number;
  achievements: number;
}

export async function getMemberReportCard(memberId: string): Promise<MemberReportCard | null> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: { select: { name: true } } },
  });
  if (!member) return null;

  const [loans, returned, overdue, pointsProfile] = await Promise.all([
    db.loan.count({ where: { memberId } }),
    db.loan.count({ where: { memberId, status: "RETURNED" } }),
    db.loan.count({
      where: { memberId, status: { in: ["LOANED", "ACTIVE"] }, dueDate: { lt: new Date() } },
    }),
    db.gamificationProfile.findUnique({ where: { memberId } }),
  ]);

  const categoryLoans = await db.loan.findMany({
    where: { memberId },
    include: { bookItem: { include: { book: { include: { category: true } } } } },
  });

  const catCount = new Map<string, number>();
  const authorCount = new Map<string, number>();
  categoryLoans.forEach((l) => {
    const cat = l.bookItem?.book?.category?.name;
    const author = l.bookItem?.book?.author;
    if (cat) catCount.set(cat, (catCount.get(cat) || 0) + 1);
    if (author) authorCount.set(author, (authorCount.get(author) || 0) + 1);
  });

  const favoriteCategory = Array.from(catCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const favoriteAuthor = Array.from(authorCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentLoans = await db.loan.count({
    where: { memberId, status: "RETURNED", returnDate: { gte: sixMonthsAgo } },
  });
  const readingVelocity = Number((recentLoans / 6).toFixed(1));

  const level =
    returned < 5 ? "Pemula" :
    returned < 15 ? "Pembaca" :
    returned < 50 ? "Kutu Buku" :
    returned < 100 ? "Kolektor" :
    returned < 200 ? "Penjelajah" :
    returned < 500 ? "Maestro" : "Legenda";

  return {
    memberId: member.id,
    memberName: member.fullName,
    classGrade: member.classGrade || "-",
    totalLoans: loans,
    totalReturned: returned,
    totalOverdue: overdue,
    currentStreak: 0,
    favoriteCategory,
    favoriteAuthor,
    readingVelocity,
    level,
    points: pointsProfile?.points ?? 0,
    achievements: 0,
  };
}

export { DAY_NAMES };
