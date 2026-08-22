import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const itemCode = searchParams.get("itemCode");

  if (!itemCode) {
    return NextResponse.json({ error: "itemCode wajib" }, { status: 400 });
  }

  const bookItem = await db.bookItem.findUnique({
    where: { itemCode },
    include: { book: true },
  });
  if (!bookItem) {
    return NextResponse.json({ error: "Eksemplar tidak ditemukan" }, { status: 404 });
  }

  const loan = await db.loan.findFirst({
    where: { bookItemId: bookItem.id, status: { not: "RETURNED" } },
    include: { member: true, bookItem: { include: { book: true } } },
    orderBy: { loanDate: "desc" },
  });
  if (!loan) {
    return NextResponse.json({ error: "Tidak ada pinjaman aktif untuk eksemplar ini" }, { status: 404 });
  }

  return NextResponse.json({ loan });
}
