import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireFullLibrarian } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await params;
    const loan = await db.loan.findUnique({
      where: { id },
      include: { member: true, bookItem: { include: { book: true } } },
    });
    if (!loan) return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
    return NextResponse.json(loan);
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireFullLibrarian();
  if (error) return error;
  try {
    const { id } = await params;

    const loan = await db.loan.findUnique({ where: { id } });
    if (!loan) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    if (loan.status === "RETURNED") return NextResponse.json({ error: "Sudah dikembalikan" }, { status: 400 });

    await db.bookItem.update({ where: { id: loan.bookItemId }, data: { status: "AVAILABLE" } });
    await db.loan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
