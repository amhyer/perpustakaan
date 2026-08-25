import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/loans/history — riwayat baca anggota (RETURNED loans + stats)
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const category = searchParams.get("category");

    if (!user!.member) {
      return NextResponse.json({ error: "Akun ini tidak terdaftar sebagai anggota" }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      memberId: user!.member.id,
      status: "RETURNED",
    };

    if (year && !isNaN(parseInt(year))) {
      const y = parseInt(year);
      where.loanDate = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
    }

    const loans = await db.loan.findMany({
      where,
      include: {
        bookItem: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverColor: true,
                coverImage: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { returnDate: "desc" },
    });

    // Filter by category after fetch (since category is a relation)
    let filtered = loans;
    if (category) {
      filtered = loans.filter((l) => l.bookItem?.book?.category?.name === category);
    }

    // Stats
    const totalBooks = filtered.length;
    const totalDays = filtered.reduce((sum, l) => {
      if (l.returnDate && l.loanDate) {
        return sum + Math.ceil((new Date(l.returnDate).getTime() - new Date(l.loanDate).getTime()) / 86400000);
      }
      return sum;
    }, 0);
    const avgDays = totalBooks > 0 ? Math.round(totalDays / totalBooks) : 0;

    // Category breakdown
    const catMap: Record<string, number> = {};
    for (const l of filtered) {
      const cat = l.bookItem?.book?.category?.name || "Lainnya";
      catMap[cat] = (catMap[cat] || 0) + 1;
    }
    const categoryStats = Object.entries(catMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Books per month (last 12 months)
    const monthlyMap: Record<string, number> = {};
    for (const l of filtered) {
      if (l.returnDate) {
        const d = new Date(l.returnDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + 1;
      }
    }

    // Reading pace (books/month over last 12 months)
    const now = new Date();
    const months12Ago = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    let booksInLast12 = 0;
    for (const l of filtered) {
      if (l.returnDate && new Date(l.returnDate) >= months12Ago) {
        booksInLast12++;
      }
    }
    const readingPace = Math.round((booksInLast12 / 12) * 10) / 10;

    // Reading streak (consecutive months with at least 1 book, counting back from current month)
    let streak = 0;
    const checkDate = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 24; i++) {
      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key] && monthlyMap[key] > 0) {
        streak++;
        checkDate.setMonth(checkDate.getMonth() - 1);
      } else {
        break;
      }
    }

    // Favorite author
    const authorMap: Record<string, number> = {};
    for (const l of filtered) {
      const author = l.bookItem?.book?.author || "Lainnya";
      authorMap[author] = (authorMap[author] || 0) + 1;
    }
    const favoriteAuthor = Object.entries(authorMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Available years
    const years = [...new Set(filtered.map((l) => new Date(l.loanDate).getFullYear()))].sort((a, b) => b - a);

    return NextResponse.json({
      loans: filtered,
      stats: { totalBooks, totalDays, avgDays, categoryStats, monthlyMap, years, readingPace, streak, favoriteAuthor },
    });
  } catch (err) {
    console.error("GET history error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
