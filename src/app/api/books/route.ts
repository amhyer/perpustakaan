import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId");
  const locationId = searchParams.get("locationId");
  const year = searchParams.get("year");
  const subject = searchParams.get("subject");
  const limit = parseInt(searchParams.get("limit") || "100");
  // Pagination (Tahap 16 #26) — backward compatible
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam) : null;
  const pageSize = parseInt(searchParams.get("pageSize") || "12");

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
  if (categoryId) where.categoryId = categoryId;
  if (locationId) where.locationId = locationId;
  if (year) where.year = parseInt(year);
  if (subject) where.subject = { contains: subject };

  // Mode pagination: return { data, total, page, pageSize }
  if (page !== null && !isNaN(page)) {
    const [books, total] = await Promise.all([
      db.book.findMany({
        where,
        include: {
          category: true,
          location: true,
          items: { select: { id: true, status: true, itemCode: true, condition: true } },
        },
        orderBy: { title: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.book.count({ where }),
    ]);
    return NextResponse.json({ data: books, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  }

  // Mode lama (tanpa pagination): return array biasa
  const books = await db.book.findMany({
    where,
    include: {
      category: true,
      location: true,
      items: { select: { id: true, status: true, itemCode: true, condition: true } },
    },
    orderBy: { title: "asc" },
    take: limit,
  });

  return NextResponse.json(books);
}

export async function POST(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json();
  const { title, author, publisher, isbn, year, pages, synopsis, coverImage, coverColor, language, subject, categoryId, locationId, itemCount } = body;

  if (!title || !author) {
    return NextResponse.json({ error: "Judul dan pengarang wajib diisi" }, { status: 400 });
  }

  // Validasi ISBN format (Tahap 16 #23) — ISBN-10 atau ISBN-13
  if (isbn) {
    const cleaned = isbn.replace(/[-\s]/g, "");
    const isValidISBN = /^(\d{10}|\d{13})$/.test(cleaned) && (cleaned.length === 10 || cleaned.length === 13);
    if (!isValidISBN) {
      return NextResponse.json({ error: "Format ISBN tidak valid (harus 10 atau 13 digit)" }, { status: 400 });
    }
  }

  // Validasi tahun terbit (Tahap 16 #24) — range 1900 sampai tahun depan
  if (year !== null && year !== undefined && year !== "") {
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
    },
    include: { category: true, location: true, items: true },
  });

  // Auto-add author & publisher ke master tabel (Tahap 15-C)
  // Upsert by name — kalau sudah ada, no-op; kalau baru, create
  if (author && author.trim()) {
    await db.author.upsert({
      where: { name: author.trim() },
      update: {},
      create: { name: author.trim() },
    }).catch(() => { /* ignore dup race */ });
  }
  if (publisher && publisher.trim()) {
    await db.publisher.upsert({
      where: { name: publisher.trim() },
      update: {},
      create: { name: publisher.trim() },
    }).catch(() => { /* ignore dup race */ });
  }

  // Buat eksemplar
  const count = Math.max(1, parseInt(itemCount || "1"));
  for (let i = 1; i <= count; i++) {
    const code = isbn ? `${isbn.slice(-6)}-${i}-${Date.now().toString().slice(-3)}` : `BK-${book.id.slice(-4)}-${i}`;
    await db.bookItem.create({
      data: { bookId: book.id, itemCode: code, status: "AVAILABLE", condition: "BAIK" },
    });
  }

  const refreshed = await db.book.findUnique({
    where: { id: book.id },
    include: { category: true, location: true, items: true },
  });
  return NextResponse.json(refreshed, { status: 201 });
}
