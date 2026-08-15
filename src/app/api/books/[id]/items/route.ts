import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian, requireFullLibrarian } from "@/lib/auth";

// Tambah eksemplar baru
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLibrarian();
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const count = await db.bookItem.count({ where: { bookId: id } });
  const book = await db.book.findUnique({ where: { id } });
  if (!book) return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });

  const code = body.itemCode || `${book.isbn?.slice(-6) || "BK"}-${count + 1}-${Date.now().toString().slice(-3)}`;
  const item = await db.bookItem.create({
    data: {
      bookId: id,
      itemCode: code,
      status: body.status || "AVAILABLE",
      condition: body.condition || "BAIK",
    },
  });
  return NextResponse.json(item, { status: 201 });
}

// Update status eksemplar
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLibrarian();
  if (error) return error;
  const { id } = await params;
  const body = await req.json();

  if (!body.itemId) return NextResponse.json({ error: "itemId wajib diisi" }, { status: 400 });
  const item = await db.bookItem.update({
    where: { id: body.itemId },
    data: {
      status: body.status,
      condition: body.condition,
      itemCode: body.itemCode,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireFullLibrarian();
  if (error) return error;
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId wajib diisi" }, { status: 400 });

  const activeLoan = await db.loan.count({ where: { bookItemId: itemId, status: { in: ["LOANED", "OVERDUE"] } } });
  if (activeLoan > 0) {
    return NextResponse.json({ error: "Eksemplar sedang dipinjam" }, { status: 400 });
  }

  await db.bookItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
