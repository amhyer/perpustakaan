import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id: assignmentId } = await params;

  try {
    const body = await req.json();

    const member = user!.member;
    if (!member) {
      return NextResponse.json({ error: "Profil anggota tidak ditemukan" }, { status: 400 });
    }

    const assignment = await db.readingAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, isActive: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Tugas baca tidak ditemukan" }, { status: 404 });
    }
    if (!assignment.isActive) {
      return NextResponse.json({ error: "Tugas baca sudah tidak aktif" }, { status: 400 });
    }

    // Teacher can view/update any student's progress; student can only update their own
    const targetMemberId = body.memberId && (user!.role === "TEACHER" || user!.role === "LIBRARIAN")
      ? body.memberId
      : member.id;

    const existingProgress = await db.readingProgress.findUnique({
      where: { assignmentId_memberId: { assignmentId, memberId: targetMemberId } },
    });

    if (!existingProgress) {
      return NextResponse.json({ error: "Data progress tidak ditemukan" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.status) {
      const validStatuses = ["NOT_STARTED", "READING", "COMPLETED"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
      }
      updateData.status = body.status;
      if (body.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
    }

    if (body.currentPage !== undefined) updateData.currentPage = body.currentPage;
    if (body.totalPages !== undefined) updateData.totalPages = body.totalPages;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await db.readingProgress.update({
      where: { id: existingProgress.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
