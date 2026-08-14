import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// PUT /api/gamification/goal — set/ubah target baca tahunan
// Body: { target: number } (1-100)
export async function PUT(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!user!.member) {
    return NextResponse.json({ error: "Anda belum terdaftar sebagai anggota" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const target = parseInt(body.target, 10);

    if (isNaN(target) || target < 1 || target > 100) {
      return NextResponse.json({ error: "Target harus antara 1-100" }, { status: 400 });
    }

    const updated = await db.member.update({
      where: { id: user!.member!.id },
      data: {
        readingGoalTarget: target,
        readingGoalSetAt: new Date(),
      },
      select: { readingGoalTarget: true, readingGoalSetAt: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan target baca" }, { status: 500 });
  }
}
