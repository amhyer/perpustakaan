import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian, requireFullLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

async function findIsbnDuplicate(cleanedIsbn: string, excludeBookId?: string) {
  const withIsbn = await db.book.findMany({
    where: { isbn: { not: null }, ...(excludeBookId ? { id: { not: excludeBookId } } : {}) },
    select: { id: true, title: true, isbn: true },
  });
  return withIsbn.find((b) => b.isbn!.replace(/[-\s]/g, "") === cleanedIsbn) || null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const book = await db.book.findUnique({
    where: { id },
    include: {
      category: true,
      location: true,
      items: {
        orderBy: { itemCode: "asc" },
        include: {
          conditionLogs: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
      reservations: { where: { status: { in: ["PENDING", "READY"] } }, include: { member: true }, orderBy: { queueOrder: "asc" } },
    },
  });

  if (!book) return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });

  // Fetch similar books (same category or same author, excluding current)
  const similarBooks = await db.book.findMany({
    where: {
      id: { not: id },
      OR: [
        { categoryId: book.categoryId ?? undefined },
        { author: book.author },
      ],
    },
    select: { id: true, title: true, author: true, coverColor: true, coverImage: true, category: { select: { name: true } } },
    take: 6,
  });

  return NextResponse.json({ ...book, similarBooks });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireLibrarian();
  if (error) return error;
  const { id } = await params;
  const body = await req.json();

  // Validasi URL buku digital (Tahap 12)
  if (body.sourceUrl) {
    try {
      const u = new URL(body.sourceUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("invalid");
    } catch {
      return NextResponse.json({ error: "URL buku digital tidak valid (harus http/https)" }, { status: 400 });
    }
  }

  // Dedupe ISBN (Tahap 13) — kecuali ISBN milik buku itu sendiri
  if (body.isbn) {
    const cleaned = body.isbn.replace(/[-\s]/g, "");
    if (/^(\d{10}|\d{13})$/.test(cleaned)) {
      const duplicate = await findIsbnDuplicate(cleaned, id);
      if (duplicate) {
        return NextResponse.json(
          { error: `ISBN ${body.isbn} sudah dipakai buku "${duplicate.title}".` },
          { status: 409 }
        );
      }
    }
  }

  const book = await db.book.update({
    where: { id },
    data: {
      title: body.title,
      author: body.author,
      publisher: body.publisher || null,
      isbn: body.isbn || null,
      year: body.year ? parseInt(body.year) : null,
      pages: body.pages ? parseInt(body.pages) : null,
      synopsis: body.synopsis || null,
      coverImage: body.coverImage || null,
      coverColor: body.coverColor || "#1e3a5f",
      language: body.language || "Indonesia",
      subject: body.subject || null,
      categoryId: body.categoryId || null,
      locationId: body.locationId || null,
      sourceUrl: body.sourceUrl || null,
    },
    include: { category: true, location: true, items: true },
  });

  // Auto-add author & publisher ke master tabel (Tahap 15-C)
  if (body.author && typeof body.author === "string" && body.author.trim()) {
    await db.author.upsert({
      where: { name: body.author.trim() },
      update: {},
      create: { name: body.author.trim() },
    }).catch(() => { /* ignore dup race */ });
  }
  if (body.publisher && typeof body.publisher === "string" && body.publisher.trim()) {
    await db.publisher.upsert({
      where: { name: body.publisher.trim() },
      update: {},
      create: { name: body.publisher.trim() },
    }).catch(() => { /* ignore dup race */ });
  }

  await logAudit(user!.id, "BOOK_UPDATE", "Book", book.id, book.title);

  return NextResponse.json(book);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;
  const { id } = await params;

  // Cek apakah ada peminjaman aktif
  const activeLoans = await db.loan.count({ where: { bookId: id, status: { in: ["LOANED", "OVERDUE"] } } });
  if (activeLoans > 0) {
    return NextResponse.json({ error: `Tidak dapat menghapus: masih ada ${activeLoans} peminjaman aktif` }, { status: 400 });
  }

  const book = await db.book.findUnique({ where: { id }, select: { title: true } });
  await db.book.delete({ where: { id } });
  await logAudit(user!.id, "BOOK_DELETE", "Book", id, book?.title || "unknown");

  return NextResponse.json({ success: true });
}
