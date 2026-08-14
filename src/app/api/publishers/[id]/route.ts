import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFullLibrarian } from "@/lib/auth";

// DELETE /api/publishers/[id] — hapus penerbit dari master
// Catatan: ini TIDAK menghapus field publisher di Book (tetap teks bebas)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.publisher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Penerbit tidak ditemukan" }, { status: 404 });
    }

    await db.publisher.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus penerbit" }, { status: 500 });
  }
}
