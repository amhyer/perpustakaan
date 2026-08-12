import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// DELETE /api/authors/[id] — hapus pengarang dari master
// Catatan: ini TIDAK menghapus field author di Book (tetap teks bebas)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole("LIBRARIAN");
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.author.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengarang tidak ditemukan" }, { status: 404 });
    }

    await db.author.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pengarang" }, { status: 500 });
  }
}
