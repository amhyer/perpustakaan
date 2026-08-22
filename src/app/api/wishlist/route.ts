import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine");

  if (!user!.member) return NextResponse.json([]);

  const where = mine === "1" || user!.role !== "LIBRARIAN" ? { memberId: user!.member.id } : {};
  const wishlists = await db.wishlist.findMany({
    where,
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverColor: true,
          coverImage: true,
          source: true,
          category: { select: { name: true } },
          items: { select: { id: true, status: true } },
        },
      },
      member: { select: { fullName: true, memberNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(wishlists);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const body = await req.json();
  if (!user!.member) return NextResponse.json({ error: "Anda belum terdaftar sebagai anggota" }, { status: 400 });
  if (!body.bookId) return NextResponse.json({ error: "Buku wajib diisi" }, { status: 400 });

  try {
    const wl = await db.wishlist.create({
      data: { memberId: user!.member.id, bookId: body.bookId },
    });
    return NextResponse.json(wl, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Buku sudah ada di wishlist" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  if (!bookId || !user!.member) return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });

  await db.wishlist.deleteMany({ where: { memberId: user!.member.id, bookId } });
  return NextResponse.json({ success: true });
}
