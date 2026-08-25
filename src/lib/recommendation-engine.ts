/**
 * Recommendation Engine — Personalized book recommendations.
 *
 * Algorithm: Item-based collaborative filtering (simple).
 *
 * Konsep:
 * 1. Untuk setiap buku yang pernah dipinjam user, cari user lain yang
 *    juga pinjam buku tersebut
 * 2. Buku-buku yang dipinjam user lain tapi BELUM dipinjam user asli
 *    = kandidat rekomendasi
 * 3. Score = berapa banyak "kesamaan taste" dengan user lain
 *
 * Plus content-based filtering:
 * - Same category → higher score
 * - Same author → higher score
 *
 * Plus popularity:
 * - Trending di kelas (banyak dipinjam 30 hari terakhir) → boost
 *
 * Output: top N recommendations disimpan di Recommendation table (cache 6 jam).
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const CACHE_TTL_HOURS = 6;
const TOP_N = 10;

export interface BookRecommendation {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string | null;
  category: string | null;
  score: number;
  reason: string;
}

interface RecommendationOptions {
  topN?: number;
  forceRefresh?: boolean;
}

/**
 * Get recommendations untuk seorang member.
 * Kalau ada di cache & masih fresh, return cache.
 * Kalau tidak, hitung ulang.
 */
export async function getRecommendations(
  memberId: string,
  options: RecommendationOptions = {}
): Promise<BookRecommendation[]> {
  const topN = options.topN || TOP_N;

  // Check cache (kalau gak force refresh)
  if (!options.forceRefresh) {
    const cached = await db.recommendation.findMany({
      where: { memberId },
      orderBy: { rank: "asc" },
      take: topN,
    });
    const cacheAge = cached[0]
      ? Date.now() - cached[0].generatedAt.getTime()
      : Infinity;
    const cacheAgeHours = cacheAge / (1000 * 60 * 60);
    if (cached.length >= topN && cacheAgeHours < CACHE_TTL_HOURS) {
      return cached.map((c) => ({
        bookId: c.bookId,
        bookTitle: "", // Will be filled below
        bookAuthor: "",
        bookCover: null,
        category: null,
        score: c.score,
        reason: c.reason,
      }));
    }
  }

  // Compute fresh
  return await computeRecommendations(memberId, topN);
}

/**
 * Compute fresh recommendations.
 */
async function computeRecommendations(
  memberId: string,
  topN: number
): Promise<BookRecommendation[]> {
  // Ambil history peminjaman user
  const userLoans = await db.loan.findMany({
    where: { memberId, status: "RETURNED" },
    select: { bookId: true },
    distinct: ["bookId"],
  });
  const userBookIds = new Set(userLoans.map((l) => l.bookId).filter((id): id is string => id !== null));

  if (userBookIds.size === 0) {
    // User baru → return top trending books
    return getTrendingBooks(topN);
  }

  // === Collaborative Filtering ===
  // Cari user lain yang juga pinjam buku yang sama
  const similarUsers = await db.loan.findMany({
    where: {
      bookId: { in: Array.from(userBookIds) },
      status: "RETURNED",
      memberId: { not: memberId },
    },
    select: { memberId: true, bookId: true },
    take: 5000, // Limit
  });

  // Hitung score per book
  const bookScores = new Map<string, { score: number; users: Set<string> }>();
  for (const loan of similarUsers) {
    if (!loan.bookId) continue;
    if (!bookScores.has(loan.bookId)) {
      bookScores.set(loan.bookId, { score: 0, users: new Set() });
    }
    const entry = bookScores.get(loan.bookId)!;
    entry.users.add(loan.memberId);
    // Score = 1 per user yang juga pinjam
    entry.score++;
  }

  // Filter buku yang sudah dipinjam user
  for (const bookId of userBookIds) {
    bookScores.delete(bookId);
  }

  // === Content-Based Boost ===
  // Ambil kategori dari history user
  const userBooks = await db.book.findMany({
    where: { id: { in: Array.from(userBookIds) } },
    select: { categoryId: true, author: true },
  });
  const userCategories = new Set(
    userBooks.map((b) => b.categoryId).filter(Boolean) as string[]
  );
  const userAuthors = new Set(userBooks.map((b) => b.author));

  // === Trending Boost (30 hari terakhir) ===
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const trending = await db.loan.groupBy({
    by: ["bookId"],
    where: { status: "RETURNED", returnDate: { gte: monthAgo } },
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take: 50,
  });
  const trendingMap = new Map(
    trending.map((t) => [t.bookId, t._count])
  );

  // === Final Scoring ===
  // Ambil detail buku untuk top kandidat
  const candidateBookIds = Array.from(bookScores.keys()).slice(0, 100);
  const candidates = await db.book.findMany({
    where: { id: { in: candidateBookIds } },
    select: {
      id: true,
      title: true,
      author: true,
      coverImage: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scored: Array<BookRecommendation & { _raw: any }> = candidates.map((book) => {
    const cf = bookScores.get(book.id) || { score: 0, users: new Set() };
    const cat = book.category?.name;
    const isSameCategory = book.categoryId && userCategories.has(book.categoryId);
    const isSameAuthor = userAuthors.has(book.author);
    const trendingScore = trendingMap.get(book.id) || 0;

    // Normalize
    const cfScore = cf.score / 10; // 0-1-ish
    const categoryBoost = isSameCategory ? 0.3 : 0;
    const authorBoost = isSameAuthor ? 0.2 : 0;
    const trendingBoost = Math.min(0.2, trendingScore / 20);

    const finalScore = Math.min(1, cfScore + categoryBoost + authorBoost + trendingBoost);

    // Build reason
    const reasons: string[] = [];
    if (cf.score > 0) {
      reasons.push(`${cf.users.size} siswa juga pinjam`);
    }
    if (isSameCategory && cat) reasons.push(`kategori ${cat}`);
    if (isSameAuthor) reasons.push(`karya ${book.author}`);
    if (trendingScore > 5) reasons.push(`trending bulan ini`);

    return {
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookCover: book.coverImage,
      category: cat || null,
      score: Number(finalScore.toFixed(3)),
      reason: reasons.length > 0 ? reasons.join(" • ") : "Mungkin kamu suka",
      _raw: null,
    };
  });

  // Sort by score desc
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN);

  // Save to cache
  await saveRecommendations(memberId, top);

  return top;
}

/**
 * Trending books untuk user baru.
 */
async function getTrendingBooks(topN: number): Promise<BookRecommendation[]> {
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const trending = await db.loan.groupBy({
    by: ["bookId"],
    where: { status: "RETURNED", returnDate: { gte: monthAgo } },
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take: topN,
  });

  const bookIds = trending.map((t) => t.bookId).filter((id): id is string => id !== null);
  const books = await db.book.findMany({
    where: { id: { in: bookIds } },
    select: {
      id: true,
      title: true,
      author: true,
      coverImage: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookMap = new Map(books.map((b) => [b.id, b]));

  return trending.map((t, idx) => {
    if (!t.bookId) return null;
    const book = bookMap.get(t.bookId);
    return {
      bookId: t.bookId,
      bookTitle: book?.title || "",
      bookAuthor: book?.author || "",
      bookCover: book?.coverImage || null,
      category: book?.category?.name || book?.categoryId || null,
      score: t._count / 50,
      reason: `Trending #${idx + 1} bulan ini`,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Save recommendations to cache table.
 */
async function saveRecommendations(
  memberId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recs: any[]
): Promise<void> {
  // Delete old
  await db.recommendation.deleteMany({ where: { memberId } });

  // Insert new
  if (recs.length > 0) {
    await db.recommendation.createMany({
      data: recs.map((r, idx) => ({
        memberId,
        bookId: r.bookId,
        score: r.score,
        reason: r.reason,
        rank: idx + 1,
      })),
    });
  }
}

/**
 * Get single book details untuk recommendation card.
 */
export async function enrichRecommendations(
  recs: BookRecommendation[]
): Promise<BookRecommendation[]> {
  if (recs.length === 0) return recs;
  const bookIds = recs.map((r) => r.bookId);
  const books = await db.book.findMany({
    where: { id: { in: bookIds } },
    select: {
      id: true,
      title: true,
      author: true,
      coverImage: true,
      category: { select: { name: true } },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookMap = new Map(books.map((b) => [b.id, b]));

  return recs.map((r) => {
    const book = bookMap.get(r.bookId);
    return {
      ...r,
      bookTitle: book?.title || r.bookTitle,
      bookAuthor: book?.author || r.bookAuthor,
      bookCover: book?.coverImage || r.bookCover,
      category: book?.category?.name || r.category,
    };
  });
}
