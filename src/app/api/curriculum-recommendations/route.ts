import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const classGrade = searchParams.get("classGrade");
  const subject = searchParams.get("subject");

  const where: Record<string, unknown> = {};
  if (classGrade) where.classGrade = classGrade;
  if (subject) where.subject = subject;

  const recommendations = await db.curriculumRecommendation.findMany({
    where,
    include: {
      book: { select: { id: true, title: true, author: true, coverImage: true, subject: true } },
    },
    orderBy: [{ subject: "asc" }, { classGrade: "asc" }],
  });

  return NextResponse.json(recommendations);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (user!.role !== "LIBRARIAN" && user!.role !== "TEACHER") {
    return NextResponse.json({ error: "Hanya guru/pustakawan yang dapat menambah rekomendasi" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.subject || !body.classGrade || !body.bookId) {
    return NextResponse.json({ error: "Mata pelajaran, kelas, dan buku wajib diisi" }, { status: 400 });
  }

  const book = await db.book.findUnique({ where: { id: body.bookId } });
  if (!book) return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });

  // Check duplicate
  const existing = await db.curriculumRecommendation.findUnique({
    where: { subject_classGrade_bookId: { subject: body.subject, classGrade: body.classGrade, bookId: body.bookId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Buku sudah direkomendasikan untuk kelas/mata pelajaran ini" }, { status: 409 });
  }

  const recommendation = await db.curriculumRecommendation.create({
    data: {
      subject: body.subject,
      classGrade: body.classGrade,
      bookId: body.bookId,
      reason: body.reason || null,
      isRequired: body.isRequired || false,
      addedBy: user!.id,
    },
    include: {
      book: { select: { id: true, title: true, author: true, coverImage: true } },
    },
  });

  return NextResponse.json(recommendation, { status: 201 });
}
