import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parsePagination, parseSort, paginatedResponse, parseList } from "@/lib/query-helpers";
import { logger, startTimer } from "@/lib/logger";

/** Cari buku dengan ISBN ternormalisasi (tanpa tanda pisah/spasi). */
async function findIsbnDuplicate(cleanedIsbn: string, excludeBookId?: string) {
  const withIsbn = await db.book.findMany({
    where: { isbn: { not: null }, ...(excludeBookId ? { id: { not: excludeBookId } } : {}) },
    select: { id: true, title: true, isbn: true },
  });
  return withIsbn.find((b) => b.isbn!.replace(/[-\s]/g, "") === cleanedIsbn) || null;
}

const ALLOWED_SORT_FIELDS = ["title", "year", "author", "createdAt", "popular"];

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const timer = startTimer("GET /api/books");
  const searchParams = new URL(req.url).searchParams;

  // Query params
  const q = searchParams.get("q") || "";
  const categoryIds = parseList(searchParams, "categoryId");
  const locationIds = parseList(searchParams, "locationId");
  const year = searchParams.get("year");
  const subject = searchParams.get("subject");
  const source = searchParams.get("source");
  const availableOnly = searchParams.get("availableOnly") === "true";

  // Pagination
  const pagination = parsePagination(searchParams, { defaultPageSize: 12, maxPageSize: 100 });

  // Sort
  const sort = parseSort(searchParams, ALLOWED_SORT_FIELDS, { field: "title", order: "asc" });

  // Build where clause
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { author: { contains: q } },
      { publisher: { contains: q } },
      { isbn: { contains: q } },
      { subject: { contains: q } },
    ];
  }
  if (categoryIds.length === 1) where.categoryId = categoryIds[0];
  else if (categoryIds.length > 1) where.categoryId = { in: categoryIds };
  if (locationIds.length === 1) where.locationId = locationIds[0];
  else if (locationIds.length > 1) where.locationId = { in: locationIds };
  if (year) where.year = parseInt(year);
  if (subject) where.subject = { contains: subject };
  if (source) where.source = source;
  if (availableOnly) {
    where.items = { some: { status: "AVAILABLE" } };
  }

  // Sort handling
  if (sort.field === "popular") {
    // Popular butuh groupBy + sort manual di memory
    const popularRaw = await db.loan.groupBy({
      by: ["bookId"],
      _count: true,
      orderBy: { _count: { bookId: "desc" } },
    });
    const bookLoanCounts = new Map(popularRaw.map((p) => [p.bookId, p._count]));

    const [books, total] = await Promise.all([
      db.book.findMany({
        where,
        include: {
          category: true,
          location: true,
          items: { select: { id: true, status: true, itemCode: true, condition: true } },
        },
        skip: pagination.offset,
        take: pagination.pageSize,
      }),
      db.book.count({ where }),
    ]);

    const booksWithCount = books
      .map((b) => ({ ...b, loanCount: bookLoanCounts.get(b.id) || 0 }))
      .sort((a, b) => b.loanCount - a.loanCount);

    timer.end({ count: booksWithCount.length, total });
    return NextResponse.json(paginatedResponse(booksWithCount, total, pagination));
  }

  // Normal sort
  const orderBy: any = { [sort.field]: sort.order };

  const [books, total] = await Promise.all([
    db.book.findMany({
      where,
      include: {
        category: true,
        location: true,
        items: { select: { id: true, status: true, itemCode: true, condition: true } },
      },
      orderBy,
      skip: pagination.offset,
      take: pagination.pageSize,
    }),
    db.book.count({ where }),
  ]);

  timer.end({ count: books.length, total, sort: `${sort.field}-${sort.order}` });
  return NextResponse.json(paginatedResponse(books, total, pagination));
}

export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json();
  const { title, author, publisher, isbn, year, pages, synopsis, coverImage, coverColor, language, subject, categoryId, locationId, itemCount, sourceUrl } = body;

  if (!title || !author) {
    return NextResponse.json({ error: "Judul dan pengarang wajib diisi" }, { status: 400 });
  }

  // Validasi URL buku digital
  if (sourceUrl) {
    try {
      const u = new URL(sourceUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("invalid");
    } catch {
      return NextResponse.json({ error: "URL buku digital tidak valid (harus http/https)" }, { status: 400 });
    }
  }

  // Validasi ISBN format
  if (isbn) {
    const cleaned = isbn.replace(/[-\s]/g, "");
    const isValidISBN = /^(\d{10}|\d{13})$/.test(cleaned);
    if (!isValidISBN) {
      return NextResponse.json({ error: "Format ISBN tidak valid (harus 10 atau 13 digit)" }, { status: 400 });
    }
    const duplicate = await findIsbnDuplicate(cleaned);
    if (duplicate) {
      return NextResponse.json(
        { error: `ISBN ${isbn} sudah dipakai buku "${duplicate.title}".` },
        { status: 409 }
      );
    }
  }

  // Validasi tahun terbit
  if (year) {
    const yearNum = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
      return NextResponse.json({ error: `Tahun terbit harus antara 1900 dan ${currentYear + 1}` }, { status: 400 });
    }
  }

  const book = await db.book.create({
    data: {
      title,
      author,
      publisher: publisher || null,
      isbn: isbn || null,
      year: year ? parseInt(year) : null,
      pages: pages ? parseInt(pages) : null,
      synopsis: synopsis || null,
      coverImage: coverImage || null,
      coverColor: coverColor || "#1e3a5f",
      language: language || "Indonesia",
      subject: subject || null,
      categoryId: categoryId || null,
      locationId: locationId || null,
      sourceUrl: sourceUrl || null,
    },
    include: { category: true, location: true, items: true },
  });

  // Auto-add author & publisher ke master
  if (author?.trim()) {
    await db.author.upsert({
      where: { name: author.trim() },
      update: {},
      create: { name: author.trim() },
    }).catch(() => {});
  }
  if (publisher?.trim()) {
    await db.publisher.upsert({
      where: { name: publisher.trim() },
      update: {},
      create: { name: publisher.trim() },
    }).catch(() => {});
  }

  // Buat eksemplar
  const count = Math.max(1, parseInt(itemCount || "1"));
  for (let i = 1; i <= count; i++) {
    const code = isbn
      ? `${isbn.slice(-6)}-${i}-${Date.now().toString().slice(-3)}`
      : `BK-${book.id.slice(-4)}-${i}`;
    await db.bookItem.create({
      data: { bookId: book.id, itemCode: code, status: "AVAILABLE", condition: "BAIK" },
    });
  }

  const refreshed = await db.book.findUnique({
    where: { id: book.id },
    include: { category: true, location: true, items: true },
  });

  await logAudit(user!.id, "BOOK_CREATE", "Book", book.id, `${book.title} oleh ${book.author}`);
  logger.info("Book created", { bookId: book.id, userId: user!.id });

  return NextResponse.json(refreshed, { status: 201 });
}
