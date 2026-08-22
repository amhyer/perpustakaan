import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
  }

  // Get member's loan history to build preferences
  const loans = await db.loan.findMany({
    where: { memberId: user.member.id },
    include: {
      bookItem: {
        include: { book: { select: { id: true, categoryId: true, author: true } } },
      },
    },
  });

  // Get member's wishlist book IDs
  const wishlists = await db.wishlist.findMany({
    where: { memberId: user.member.id },
    select: { bookId: true },
  });
  const wishlistIds = new Set(wishlists.map((w) => w.bookId));

  // Get borrowed book IDs (to exclude)
  const borrowedBookIds = new Set(
    loans.map((l) => l.bookItem?.bookId).filter(Boolean)
  );

  // Build category affinity (how many times borrowed per category)
  const categoryCount: Record<string, number> = {};
  const authorCount: Record<string, number> = {};
  for (const loan of loans) {
    const book = loan.bookItem?.book;
    if (!book) continue;
    if (book.categoryId) {
      categoryCount[book.categoryId] = (categoryCount[book.categoryId] || 0) + 1;
    }
    if (book.author) {
      authorCount[book.author] = (authorCount[book.author] || 0) + 1;
    }
  }

  // Get top categories and authors
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  const topAuthors = Object.entries(authorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // Get loan count and average rating for popularity scoring
  const bookLoanCounts = await db.loan.groupBy({
    by: ["bookItemId"],
    _count: { id: true },
  });
  const loanCountMap: Record<string, number> = {};
  for (const item of bookLoanCounts) {
    loanCountMap[item.bookItemId] = item._count.id;
  }

  const bookRatings = await db.bookReview.groupBy({
    by: ["bookId"],
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingMap: Record<string, { avg: number; count: number }> = {};
  for (const r of bookRatings) {
    ratingMap[r.bookId] = {
      avg: r._avg.rating || 0,
      count: r._count.rating,
    };
  }

  // Get all candidate books (not borrowed, not in wishlist)
  const candidates = await db.book.findMany({
    where: {
      id: { notIn: [...borrowedBookIds, ...wishlistIds] },
    },
    include: {
      items: { select: { id: true, status: true } },
      category: { select: { id: true, name: true } },
    },
    take: 100,
  });

  // Score each candidate
  const scored = candidates.map((book) => {
    let score = 0;

    // Category affinity (0-30 points)
    if (book.categoryId && topCategories.includes(book.categoryId)) {
      const rank = topCategories.indexOf(book.categoryId);
      score += 30 - rank * 10;
    }

    // Author affinity (0-20 points)
    if (topAuthors.includes(book.author)) {
      score += 20;
    }

    // Availability boost (0-15 points)
    const availableCount = book.items.filter(
      (i) => i.status === "AVAILABLE"
    ).length;
    if (availableCount > 0) score += 15;

    // Popularity boost (0-20 points, based on total loans)
    const totalLoans = book.items.reduce(
      (sum, item) => sum + (loanCountMap[item.id] || 0),
      0
    );
    score += Math.min(20, totalLoans * 2);

    // Rating boost (0-15 points)
    const r = ratingMap[book.id];
    if (r && r.count > 0) {
      score += Math.round((r.avg / 5) * 10 + Math.min(5, r.count));
    }

    return { ...book, score };
  });

  // Sort by score and return top 8
  scored.sort((a, b) => b.score - a.score);
  const recommended = scored.slice(0, 8).map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
    coverColor: book.coverColor,
    category: book.category?.name || null,
    availableCount: book.items.filter((i) => i.status === "AVAILABLE").length,
    totalCount: book.items.length,
    avgRating: ratingMap[book.id]?.avg || null,
    reviewCount: ratingMap[book.id]?.count || 0,
  }));

  const hasHistory = loans.length > 0;

  return NextResponse.json({
    recommended,
    hasHistory,
    label: hasHistory
      ? "Berdasarkan riwayat baca Anda"
      : "Populer di perpustakaan",
  });
}