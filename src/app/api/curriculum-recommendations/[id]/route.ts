import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (user!.role !== "LIBRARIAN" && user!.role !== "TEACHER") {
    return NextResponse.json({ error: "Hanya guru/pustakawan yang dapat menghapus rekomendasi" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const existing = await db.curriculumRecommendation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rekomendasi tidak ditemukan" }, { status: 404 });
    }

    await db.curriculumRecommendation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE curriculum-recommendations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
