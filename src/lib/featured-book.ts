import { db } from "@/lib/db";
import { toPublicBook, type PublicBook } from "@/lib/opac";

const BOOK_INCLUDE = {
  category: { select: { id: true, name: true } },
  location: { select: { id: true, name: true, code: true } },
  items: { select: { status: true } },
} as const;

export async function getFeaturedBook(): Promise<PublicBook | null> {
  const setting = await db.setting.findUnique({ where: { key: "featured_book_id" } });
  if (setting?.value) {
    const picked = await db.book.findUnique({
      where: { id: setting.value },
      include: BOOK_INCLUDE,
    });
    if (picked) return toPublicBook(picked);
  }

  const popular = await db.loan.groupBy({
    by: ["bookId"],
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take: 8,
  });
  if (popular.length > 0) {
    const books = await db.book.findMany({
      where: { id: { in: popular.map((p) => p.bookId) }, synopsis: { not: null } },
      include: BOOK_INCLUDE,
    });
    const ranked = popular
      .map((p) => books.find((b) => b.id === p.bookId))
      .filter(Boolean);
    if (ranked[0]) return toPublicBook(ranked[0]!);
  }

  const fallback = await db.book.findFirst({
    where: { synopsis: { not: null } },
    orderBy: { title: "asc" },
    include: BOOK_INCLUDE,
  });
  return fallback ? toPublicBook(fallback) : null;
}

export async function getLibraryHours(): Promise<{
  opensAt: string;
  closesAt: string;
  openDays: string;
  label: string;
}> {
  const rows = await db.setting.findMany({
    where: { key: { in: ["library_opens_at", "library_closes_at", "library_open_days"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const opensAt = map.library_opens_at || "07.00";
  const closesAt = map.library_closes_at || "16.00";
  const openDays = map.library_open_days || "Senin–Jumat";
  return {
    opensAt,
    closesAt,
    openDays,
    label: `${openDays} ${opensAt}–${closesAt}`,
  };
}
