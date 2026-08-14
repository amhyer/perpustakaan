import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFullLibrarian } from "@/lib/auth";

// DELETE /api/holidays/[id] — hapus hari libur
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.libraryHoliday.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Hari libur tidak ditemukan" }, { status: 404 });
    }

    await db.libraryHoliday.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus hari libur" },
      { status: 500 }
    );
  }
}
