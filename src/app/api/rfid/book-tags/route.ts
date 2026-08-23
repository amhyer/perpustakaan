import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { db } from "@/lib/db";
import { lookupBookTag } from "@/lib/rfid-handler";

/**
 * GET /api/rfid/book-tags — List all book tags.
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const tagUid = searchParams.get("tagUid");

  if (tagUid) {
    const book = await lookupBookTag(tagUid);
    if (!book) {
      return NextResponse.json({ error: "Book tag not found" }, { status: 404 });
    }
    return NextResponse.json(book);
  }

  try {
    const tags = await db.bookItemTag.findMany({
      where: { isActive: true },
      include: {
        bookItem: {
          include: {
            book: { select: { id: true, title: true, author: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      items: tags.map((t) => ({
        bookItemId: t.bookItemId,
        tagUid: t.tagUid,
        itemCode: t.bookItem.itemCode,
        title: t.bookItem.book.title,
        author: t.bookItem.book.author,
        status: t.bookItem.status,
        lastScannedAt: t.lastScannedAt?.toISOString() || null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

/**
 * POST /api/rfid/book-tags — Register a new book tag.
 *
 * Body: { tagUid: string, bookItemId: string }
 */
export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error || !user) return error;

  let body: { tagUid?: string; bookItemId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.tagUid || !body.bookItemId) {
    return NextResponse.json(
      { error: "tagUid and bookItemId are required" },
      { status: 400 }
    );
  }

  try {
    const tag = await db.bookItemTag.create({
      data: {
        tagUid: body.tagUid,
        bookItemId: body.bookItemId,
      },
    });
    return NextResponse.json(tag);
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Tag UID sudah terdaftar untuk buku lain" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Gagal mendaftarkan tag" }, { status: 500 });
  }
}
