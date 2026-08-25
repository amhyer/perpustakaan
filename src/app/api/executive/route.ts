import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";

/**
 * GET /api/executive — ringkasan eksekutif untuk kepala sekolah.
 * Berbeda dari /api/stats (yang untuk pustakawan),
 * endpoint ini fokus pada KPI tingkat tinggi untuk presentasi.
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYear = new Date(now.getFullYear() - 1, 0, 1);

    // Tren koleksi
    const totalBooks = await db.book.count();
    const totalItems = await db.bookItem.count();
    const itemsAddedYear = await db.bookItem.count({
      where: { createdAt: { gte: startOfYear } },
    });

    // Keanggotaan
    const totalMembers = await db.member.count();
    const activeMembers = await db.member.count({ where: { status: "ACTIVE" } });
    const studentMembers = await db.member.count({ where: { category: "STUDENT", status: "ACTIVE" } });
    const teacherMembers = await db.member.count({ where: { category: "TEACHER", status: "ACTIVE" } });
    const newMembersYear = await db.member.count({ where: { joinDate: { gte: startOfYear } } });

    // Sirkulasi
    const loansThisMonth = await db.loan.count({ where: { loanDate: { gte: startOfMonth } } });
    const loansLastMonth = await db.loan.count({
      where: { loanDate: { gte: lastMonth, lt: startOfMonth } },
    });
    const loansThisYear = await db.loan.count({ where: { loanDate: { gte: startOfYear } } });
    const returnsThisMonth = await db.loan.count({
      where: { returnDate: { gte: startOfMonth } },
    });

    // Keterlambatan & denda
    const overdueLoans = await db.loan.findMany({
      where: { status: "OVERDUE" },
      include: { member: { select: { category: true } } },
    });
    const totalOverdue = overdueLoans.length;
    const totalFineOutstanding = overdueLoans.reduce((sum, l) => {
      const days = Math.ceil((now.getTime() - new Date(l.dueDate).getTime()) / 86400000);
      const rule = l.member.category === "TEACHER" ? 500 : 1000;
      return sum + Math.max(0, days) * rule;
    }, 0);

    // Kunjungan
    const visitorsThisMonth = await db.visitor.count({ where: { checkIn: { gte: startOfMonth } } });
    const visitorsThisYear = await db.visitor.count({ where: { checkIn: { gte: startOfYear } } });

    // Tren bulanan (12 bulan terakhir)
    const monthlyTrend: { month: string; loans: number; members: number; visitors: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dNext = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const [loans, members, visitors] = await Promise.all([
        db.loan.count({ where: { loanDate: { gte: d, lt: dNext } } }),
        db.member.count({ where: { joinDate: { gte: d, lt: dNext } } }),
        db.visitor.count({ where: { checkIn: { gte: d, lt: dNext } } }),
      ]);
      monthlyTrend.push({
        month: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
        loans,
        members,
        visitors,
      });
    }

    // Top 5 buku terpopuler
    const topBooksRaw = await db.loan.groupBy({
      by: ["bookId"],
      _count: true,
      orderBy: { _count: { bookId: "desc" } },
      take: 5,
    });
    const topBookIds = topBooksRaw.map((p) => p.bookId).filter((id): id is string => id !== null);
    const topBooksData = await db.book.findMany({
      where: { id: { in: topBookIds } },
      select: { id: true, title: true, author: true, coverColor: true, coverImage: true },
    });
    const topBooks = topBooksRaw.map((p) => ({
      ...topBooksData.find((b) => b.id === p.bookId),
      loanCount: p._count,
    }));

    // Top 5 peminjam aktif
    const topMembersRaw = await db.loan.groupBy({
      by: ["memberId"],
      _count: true,
      orderBy: { _count: { memberId: "desc" } },
      take: 5,
    });
    const topMemberIds = topMembersRaw.map((p) => p.memberId);
    const topMembersData = await db.member.findMany({
      where: { id: { in: topMemberIds } },
      select: { id: true, fullName: true, memberNumber: true, category: true, classGrade: true },
    });
    const topMembers = topMembersRaw.map((p) => ({
      ...topMembersData.find((m) => m.id === p.memberId),
      loanCount: p._count,
    }));

    // Growth %
    const loanGrowth =
      loansLastMonth > 0 ? ((loansThisMonth - loansLastMonth) / loansLastMonth) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalBooks,
        totalItems,
        itemsAddedYear,
        totalMembers,
        activeMembers,
        studentMembers,
        teacherMembers,
        newMembersYear,
        loansThisMonth,
        loansLastMonth,
        loanGrowth: Math.round(loanGrowth * 10) / 10,
        loansThisYear,
        returnsThisMonth,
        totalOverdue,
        totalFineOutstanding,
        visitorsThisMonth,
        visitorsThisYear,
      },
      monthlyTrend,
      topBooks,
      topMembers,
      period: {
        startOfMonth: startOfMonth.toISOString(),
        startOfYear: startOfYear.toISOString(),
      },
    });
  } catch (err) {
    console.error("GET executive error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
