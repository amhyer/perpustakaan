import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const now = new Date();
    const current = await db.bookOfTheWeek.findFirst({
      where: { isActive: true, weekStart: { lte: now }, weekEnd: { gte: now } },
      include: {
        book: { include: { category: true, location: true } },
      },
      orderBy: { weekStart: "desc" },
    });

    if (!current) {
      const latest = await db.bookOfTheWeek.findFirst({
        include: {
          book: { include: { category: true, location: true } },
        },
        orderBy: { weekStart: "desc" },
      });
      return NextResponse.json({ current: null, latest });
    }

    return NextResponse.json({ current, latest: current });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    if (!body.bookId) {
      return NextResponse.json({ error: "bookId wajib diisi" }, { status: 400 });
    }

    const book = await db.book.findUnique({ where: { id: body.bookId } });
    if (!book) {
      return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    await db.bookOfTheWeek.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const botw = await db.bookOfTheWeek.create({
      data: {
        bookId: body.bookId,
        reason: body.reason || null,
        setBy: user!.id,
        weekStart: monday,
        weekEnd: sunday,
        isActive: true,
      },
      include: {
        book: { include: { category: true, location: true } },
      },
    });

    return NextResponse.json(botw, { status: 201 });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
