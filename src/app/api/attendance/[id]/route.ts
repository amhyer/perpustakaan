import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const existing = await db.libraryAttendance.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Absensi tidak ditemukan" }, { status: 404 });
  }
  if (existing.checkOut) {
    return NextResponse.json({ error: "Sudah check-out sebelumnya" }, { status: 400 });
  }

  const attendance = await db.libraryAttendance.update({
    where: { id },
    data: { checkOut: new Date() },
    include: {
      member: {
        select: { fullName: true, memberNumber: true, category: true, classGrade: true },
      },
    },
  });

  return NextResponse.json(attendance);
}
