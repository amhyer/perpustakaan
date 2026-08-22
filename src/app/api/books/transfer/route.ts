import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  let body: { itemCode?: string; toLocationId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const { itemCode, toLocationId, reason } = body;
  if (!itemCode || !toLocationId) {
    return NextResponse.json(
      { error: "itemCode dan toLocationId wajib diisi" },
      { status: 400 }
    );
  }

  const bookItem = await db.bookItem.findUnique({
    where: { itemCode },
    include: { book: true },
  });
  if (!bookItem) {
    return NextResponse.json({ error: "Eksemplar tidak ditemukan" }, { status: 404 });
  }

  const toLocation = await db.location.findUnique({ where: { id: toLocationId } });
  if (!toLocation) {
    return NextResponse.json({ error: "Lokasi tujuan tidak ditemukan" }, { status: 404 });
  }

  // Get the book's current location
  const currentBook = await db.book.findUnique({
    where: { id: bookItem.bookId },
    select: { locationId: true },
  });
  const fromLocationId = currentBook?.locationId || null;

  if (fromLocationId === toLocationId) {
    return NextResponse.json(
      { error: "Lokasi tujuan sama dengan lokasi saat ini" },
      { status: 400 }
    );
  }

  // Update book's location and create transfer record
  const [transfer] = await db.$transaction([
    db.bookTransfer.create({
      data: {
        bookItemId: bookItem.id,
        fromLocationId,
        toLocationId,
        reason: reason || null,
        userId: user.id,
      },
    }),
    db.book.update({
      where: { id: bookItem.bookId },
      data: { locationId: toLocationId },
    }),
  ]);

  await logAudit(
    user.id,
    "BOOK_TRANSFER",
    "BOOK_TRANSFER",
    transfer.id,
    `${bookItem.itemCode} dipindah dari ${fromLocationId || "-"} ke ${toLocation.name} (${toLocation.code})`
  );

  return NextResponse.json({ transfer }, { status: 201 });
}