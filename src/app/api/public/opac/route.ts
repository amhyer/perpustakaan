import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toPublicBook } from "@/lib/opac";
import { getFeaturedBook, getLibraryHours } from "@/lib/featured-book";
import { bookSearchOr } from "@/lib/search";

/** GET /api/public/opac — katalog tanpa login. Tidak mengembalikan PII reservasi. */
export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const q = (searchParams.get("q") || "").trim();
  const categoryId = searchParams.get("categoryId") || "";

  const where: Record<string, unknown> = {};
  if (q) where.OR = bookSearchOr(q);
  if (categoryId) where.categoryId = categoryId;

  const [books, categories, locations, featured, hours] = await Promise.all([
    db.book.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, code: true } },
        items: { select: { status: true } },
      },
      orderBy: { title: "asc" },
      take: 250,
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    getFeaturedBook(),
    getLibraryHours(),
  ]);

  return NextResponse.json({
    featured,
    books: books.map(toPublicBook),
    categories,
    locations,
    hours,
  });
}
