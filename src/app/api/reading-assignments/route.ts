import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const classGrade = searchParams.get("classGrade");

  if (user!.role === "TEACHER") {
    const where: Record<string, unknown> = { assignedBy: user!.id };
    if (classGrade) where.classGrade = classGrade;

    const assignments = await db.readingAssignment.findMany({
      where,
      include: {
        book: { select: { id: true, title: true, author: true, coverImage: true } },
        progress: {
          include: { member: { select: { id: true, fullName: true, memberNumber: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assignments);
  }

  // Student or Teacher seeing their own class
  const member = user!.member;
  if (!member) return NextResponse.json([], { status: 200 });

  const studentGrade = classGrade || member.classGrade;
  const where: Record<string, unknown> = {};
  if (studentGrade) where.classGrade = studentGrade;
  where.isActive = true;

  const assignments = await db.readingAssignment.findMany({
    where,
    include: {
      book: { select: { id: true, title: true, author: true, coverImage: true } },
      progress: {
        where: { memberId: member.id },
        select: { id: true, status: true, currentPage: true, totalPages: true, completedAt: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (user!.role !== "TEACHER" && user!.role !== "LIBRARIAN") {
    return NextResponse.json({ error: "Hanya guru yang dapat membuat tugas baca" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.title || !body.bookId || !body.classGrade || !body.dueDate) {
    return NextResponse.json({ error: "Judul, buku, kelas, dan tenggat waktu wajib diisi" }, { status: 400 });
  }

  const book = await db.book.findUnique({ where: { id: body.bookId } });
  if (!book) return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });

  const assignment = await db.readingAssignment.create({
    data: {
      title: body.title,
      description: body.description || null,
      bookId: body.bookId,
      classGrade: body.classGrade,
      subject: body.subject || null,
      assignedBy: user!.id,
      dueDate: new Date(body.dueDate),
    },
    include: {
      book: { select: { id: true, title: true, author: true, coverImage: true } },
    },
  });

  // Create progress entries for all students in the class
  const students = await db.member.findMany({
    where: { category: "STUDENT", status: "ACTIVE", classGrade: body.classGrade },
    select: { id: true },
  });

  if (students.length > 0) {
    await db.readingProgress.createMany({
      data: students.map((s) => ({
        assignmentId: assignment.id,
        memberId: s.id,
        status: "NOT_STARTED",
      })),
    });
  }

  return NextResponse.json(assignment, { status: 201 });
}
