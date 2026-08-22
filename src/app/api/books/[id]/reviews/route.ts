import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
  }

  const reviews = await db.bookReview.findMany({
    where: { bookId: id },
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const stats = await db.bookReview.aggregate({
    where: { bookId: id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const distribution = await db.bookReview.groupBy({
    by: ["rating"],
    where: { bookId: id },
    _count: { rating: true },
  });

  const distMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of distribution) {
    distMap[d.rating] = d._count.rating;
  }

  const { user } = await requireAuth();
  let myReview: { id: string; rating: number; review: string | null; createdAt: Date } | null = null;
  if (user?.member) {
    myReview = await db.bookReview.findUnique({
      where: { memberId_bookId: { memberId: user.member.id, bookId: id } },
      select: { id: true, rating: true, review: true, createdAt: true },
    });
  }

  const hasReturned = user?.member
    ? (await db.loan.count({
        where: {
          memberId: user.member.id,
          bookItem: { bookId: id },
          status: "RETURNED",
        },
      })) > 0
    : false;

  return NextResponse.json({
    reviews,
    stats: {
      average: stats._avg.rating,
      count: stats._count.rating,
    },
    distribution: distMap,
    myReview,
    hasReturned,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
  }

  const { id } = await params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
  }

  const existing = await db.bookReview.findUnique({
    where: { memberId_bookId: { memberId: user.member.id, bookId: id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Anda sudah memberikan ulasan untuk buku ini" },
      { status: 409 }
    );
  }

  const hasReturned = (await db.loan.count({
    where: {
      memberId: user.member.id,
      bookItem: { bookId: id },
      status: "RETURNED",
    },
  })) > 0;
  if (!hasReturned) {
    return NextResponse.json(
      { error: "Hanya anggota yang sudah mengembalikan buku ini yang bisa memberikan ulasan" },
      { status: 403 }
    );
  }

  let body: { rating?: number; review?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const rating = body.rating;
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating harus antara 1 dan 5" },
      { status: 400 }
    );
  }

  const review = await db.bookReview.create({
    data: {
      bookId: id,
      memberId: user.member.id,
      rating,
      review: body.review || null,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}