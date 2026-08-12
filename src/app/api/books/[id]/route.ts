import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const book = await db.book.findUnique({
    where: { id },
    include: {
      category: true,
      location: true,
      items: { orderBy: { itemCode: "asc" } },
      reservations: { where: { status: { in: ["PENDING", "READY"] } }, include: { member: true }, orderBy: { queueOrder: "asc" } },
    },
  });

  if (!book) return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
  return NextResponse.json(book);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "LIBRARIAN") {
    return NextResponse.json({ error: "Hanya pustakawan yang dapat mengubah buku" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

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

  return NextResponse.json(book);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "LIBRARIAN") {
    return NextResponse.json({ error: "Hanya pustakawan yang dapat menghapus buku" }, { status: 403 });
  }
  const { id } = await params;

  // Cek apakah ada peminjaman aktif
  const activeLoans = await db.loan.count({ where: { bookId: id, status: { in: ["LOANED", "OVERDUE"] } } });
  if (activeLoans > 0) {
    return NextResponse.json({ error: `Tidak dapat menghapus: masih ada ${activeLoans} peminjaman aktif` }, { status: 400 });
  }

  await db.book.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
