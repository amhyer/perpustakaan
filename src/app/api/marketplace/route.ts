import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "AVAILABLE";

    const listings = await db.bookListing.findMany({
      where: { status },
      include: {
        seller: { select: { id: true, fullName: true, memberNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(listings);
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const member = user!.member;
  if (!member) {
    return NextResponse.json({ error: "Hanya anggota yang dapat menjual buku" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.bookTitle || !body.condition || !body.pricePoints) {
      return NextResponse.json({ error: "Judul buku, kondisi, dan harga wajib diisi" }, { status: 400 });
    }

    if (body.pricePoints < 1) {
      return NextResponse.json({ error: "Harga harus lebih dari 0 poin" }, { status: 400 });
    }

    const listing = await db.bookListing.create({
      data: {
        sellerId: member.id,
        bookTitle: body.bookTitle,
        author: body.author || null,
        isbn: body.isbn || null,
        condition: body.condition,
        pricePoints: body.pricePoints,
        description: body.description || null,
        coverImage: body.coverImage || null,
      },
      include: {
        seller: { select: { id: true, fullName: true, memberNumber: true } },
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
