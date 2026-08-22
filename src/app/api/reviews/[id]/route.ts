import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
  }

  const { id } = await params;
  const review = await db.bookReview.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ error: "Ulasan tidak ditemukan" }, { status: 404 });
  }

  const isOwner = user.member?.id === review.memberId;
  const isLibrarian = user.role === "LIBRARIAN";

  if (!isOwner && !isLibrarian) {
    return NextResponse.json(
      { error: "Hanya pemilik atau pustakawan yang bisa menghapus ulasan" },
      { status: 403 }
    );
  }

  await db.bookReview.delete({ where: { id } });
  return NextResponse.json({ success: true });
}