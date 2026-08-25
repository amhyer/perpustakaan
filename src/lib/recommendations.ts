/**
 * AI-Powered Book Recommendation Engine.
 *
 * Hybrid approach (pure logic, no external ML):
 * 1. **Content-based**: Same category, similar author, related subject
 * 2. **Collaborative filtering**: "Users who borrowed X also borrowed Y"
 * 3. **Popularity-based**: Trending books
 * 4. **Personalized**: Based on user's loan history, wishlist, favorites
 *
 * Scoring formula:
 *   score = w1*content + w2*collab + w3*popular + w4*personal
 *   default weights: 0.3, 0.3, 0.2, 0.2
 */

import { db } from "@/lib/db";

export interface BookRecommendation {
  bookId: string;
  title: string;
  author: string;
  coverColor: string;
  coverImage: string | null;
  score: number;
  reason: string;
  reasonType: "content" | "collaborative" | "popular" | "personal";
}

interface RecommendationContext {
  userId?: string;
  memberId?: string;
  limit?: number;
  excludeBookIds?: string[];
}

const WEIGHTS = {
  content: 0.3,
  collaborative: 0.3,
  popular: 0.2,
  personal: 0.2,
};

/**
 * Generate personalized book recommendations.
 */
export async function recommendBooks(
  ctx: RecommendationContext = {}
): Promise<BookRecommendation[]> {
  const limit = ctx.limit ?? 10;
  const excludeSet = new Set(ctx.excludeBookIds || []);

  // 1. Get context data
  const [
    userHistory,
    userWishlist,
    popularBooksRaw,
    categoryCounts,
    authorCounts,
  ] = await Promise.all([
    // User's loan history
    ctx.memberId
      ? db.loan.findMany({
          where: { memberId: ctx.memberId },
          include: {
            bookItem: {
              include: {
                book: { include: { category: true } },
              },
            },
          },
          orderBy: { loanDate: "desc" },
          take: 20,
        })
      : Promise.resolve([]),

    // User's wishlist
    ctx.memberId
      ? db.wishlist.findMany({
          where: { memberId: ctx.memberId },
          select: { bookId: true },
        })
      : Promise.resolve([]),

    // Popular books (last 90 days)
    db.loan.groupBy({
      by: ["bookId"],
      _count: true,
      where: {
        loanDate: { gte: new Date(Date.now() - 90 * 86400000) },
      },
      orderBy: { _count: { bookId: "desc" } },
      take: 30,
    }),

    // Category counts in history
    ctx.memberId
      ? db.$queryRaw<{ categoryId: string; count: bigint }[]>`
          SELECT b.categoryId, COUNT(*) as count
          FROM Loan l
          JOIN BookItem bi ON l.bookItemId = bi.id
          JOIN Book b ON bi.bookId = b.id
          WHERE l.memberId = ${ctx.memberId} AND b.categoryId IS NOT NULL
          GROUP BY b.categoryId
          ORDER BY count DESC
          LIMIT 5
        `
      : Promise.resolve([]),

    // Author counts in history
    ctx.memberId
      ? db.$queryRaw<{ author: string; count: bigint }[]>`
          SELECT b.author, COUNT(*) as count
          FROM Loan l
          JOIN BookItem bi ON l.bookItemId = bi.id
          JOIN Book b ON bi.bookId = b.id
          WHERE l.memberId = ${ctx.memberId}
          GROUP BY b.author
          ORDER BY count DESC
          LIMIT 5
        `
      : Promise.resolve([]),
  ]);

  const popularMap = new Map(popularBooksRaw.map((p) => [p.bookId, p._count]));
  const wishlistSet = new Set(userWishlist.map((w) => w.bookId));
  const categoryScoreMap = new Map<string, number>();
  for (const c of categoryCounts) {
    categoryScoreMap.set(c.categoryId, Number(c.count));
  }
  const authorScoreMap = new Map<string, number>();
  for (const a of authorCounts) {
    authorScoreMap.set(a.author, Number(a.count));
  }

  // 2. Get candidate books
  const candidates = await db.book.findMany({
    where: {
      ...(excludeSet.size > 0 ? { id: { notIn: [...excludeSet] } } : {}),
    },
    include: {
      category: true,
      items: { select: { id: true, status: true } },
    },
    take: 200, // Limit candidates for performance
  });

  // 3. Score each candidate
  const scored: BookRecommendation[] = [];
  for (const book of candidates) {
    if (excludeSet.has(book.id)) continue;
    if (wishlistSet.has(book.id)) continue; // Don't recommend wishlisted

    const available = book.items.some((i) => i.status === "AVAILABLE");
    if (!available) continue; // Only recommend available books

    let contentScore = 0;
    let personalScore = 0;
    let reason: BookRecommendation["reason"] = "popular";
    let reasonType: BookRecommendation["reasonType"] = "popular";

    // Content-based: same category as user's history
    if (book.categoryId && categoryScoreMap.has(book.categoryId)) {
      const catCount = categoryScoreMap.get(book.categoryId)!;
      contentScore = Math.min(1, catCount / 5);
    }

    // Content-based: same author
    if (authorScoreMap.has(book.author)) {
      const authorCount = authorScoreMap.get(book.author)!;
      contentScore = Math.max(contentScore, Math.min(1, authorCount / 3));
    }

    // Popular-based
    const popCount = popularMap.get(book.id) || 0;
    const popularScore = Math.min(1, popCount / 20);

    // Personal: based on user's wishlist categories
    if (userHistory.length === 0) {
      // New user: rely on popularity
      personalScore = 0;
    } else {
      personalScore = contentScore * 0.7 + popularScore * 0.3;
    }

    // Determine best reason
    const scores = {
      content: contentScore * WEIGHTS.content,
      collaborative: popularScore * WEIGHTS.collaborative, // simplified
      popular: popularScore * WEIGHTS.popular,
      personal: personalScore * WEIGHTS.personal,
    };
    const maxScore = Math.max(...Object.values(scores));
    const topReason = (Object.keys(scores) as Array<keyof typeof scores>).find(
      (k) => scores[k] === maxScore
    )!;

    if (topReason === "content" && book.category) {
      reason = `Sama kategori: ${book.category.name}`;
      reasonType = "content";
    } else if (topReason === "content") {
      reason = `Pengarang favorit: ${book.author}`;
      reasonType = "content";
    } else if (topReason === "collaborative" || topReason === "popular") {
      reason = `Populer minggu ini (${popCount}x dipinjam)`;
      reasonType = topReason;
    } else {
      reason = "Berdasarkan riwayat Anda";
      reasonType = "personal";
    }

    const finalScore =
      scores.content + scores.collaborative + scores.popular + scores.personal;

    scored.push({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverColor: book.coverColor,
      coverImage: book.coverImage,
      score: Math.round(finalScore * 100) / 100,
      reason,
      reasonType,
    });
  }

  // 4. Sort by score & return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Get "users who borrowed X also borrowed Y" recommendations.
 * Classic collaborative filtering.
 */
export async function getCollaborativeRecommendations(
  bookId: string,
  limit = 5
): Promise<BookRecommendation[]> {
  // Find users who borrowed this book
  const borrowers = await db.loan.findMany({
    where: { bookId },
    select: { memberId: true },
    distinct: ["memberId"],
    take: 100,
  });
  const memberIds = borrowers.map((b) => b.memberId).filter(Boolean);

  if (memberIds.length === 0) return [];

  // Find other books they borrowed
  const otherBooks = await db.loan.groupBy({
    by: ["bookId"],
    where: {
      memberId: { in: memberIds },
      bookId: { not: bookId },
    },
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take: limit * 2,
  });

  const bookIds = otherBooks.map((b) => b.bookId).filter((id): id is string => id !== null);
  const books = await db.book.findMany({
    where: { id: { in: bookIds } },
  });
  const bookMap = new Map(books.map((b) => [b.id, b]));

  return otherBooks
    .map((ob) => {
      if (!ob.bookId) return null;
      const book = bookMap.get(ob.bookId);
      if (!book) return null;
      return {
        bookId: book.id,
        title: book.title,
        author: book.author,
        coverColor: book.coverColor,
        coverImage: book.coverImage,
        score: Math.min(1, ob._count / 10),
        reason: `${ob._count} anggota juga meminjam ini`,
        reasonType: "collaborative" as const,
      };
    })
    .filter(Boolean) as BookRecommendation[];
}

/**
 * Get "because you read X" recommendations.
 */
export async function getSimilarBooks(
  bookId: string,
  limit = 5
): Promise<BookRecommendation[]> {
  const book = await db.book.findUnique({
    where: { id: bookId },
    select: { categoryId: true, author: true, subject: true },
  });
  if (!book) return [];

  const similar = await db.book.findMany({
    where: {
      id: { not: bookId },
      OR: [
        book.categoryId ? { categoryId: book.categoryId } : undefined,
        book.author ? { author: book.author } : undefined,
        book.subject ? { subject: { contains: book.subject } } : undefined,
      ].filter(Boolean) as any,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return similar.map((b) => ({
    bookId: b.id,
    title: b.title,
    author: b.author,
    coverColor: b.coverColor,
    coverImage: b.coverImage,
    score: 0.8,
    reason: book.categoryId && b.categoryId === book.categoryId
      ? "Kategori sama"
      : b.author === book.author
      ? "Pengarang sama"
      : "Subjek terkait",
    reasonType: "content",
  }));
}
