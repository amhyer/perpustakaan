import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aisleHint, toPublicBook } from "@/lib/opac";
import { resolveCoverImage } from "@/lib/cover";

/** GET /api/public/books/:id — detail OPAC tanpa antrian/nama anggota. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await db.book.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      location: { select: { id: true, name: true, code: true } },
      items: { select: { status: true } },
    },
  });
  if (!book) return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });

  const similar = await db.book.findMany({
    where: {
      id: { not: id },
      OR: [{ categoryId: book.categoryId ?? undefined }, { author: book.author }],
    },
    select: {
      id: true,
      title: true,
      author: true,
      isbn: true,
      coverColor: true,
      coverImage: true,
      category: { select: { name: true } },
    },
    take: 6,
  });

  const queueCount = await db.reservation.count({
    where: { bookId: id, status: { in: ["PENDING", "READY"] } },
  });

  return NextResponse.json({
    ...toPublicBook(book),
    aisle: aisleHint(book.location?.code),
    queueCount,
    similarBooks: similar.map((s) => ({
      ...s,
      coverImage: resolveCoverImage(s),
    })),
  });
}
