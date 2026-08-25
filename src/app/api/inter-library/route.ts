import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where: Record<string, unknown> = {};
    if (user!.member) {
      where.memberId = user!.member.id;
    }
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      db.interLibraryLoan.findMany({
        where,
        include: {
          fromSchool: true,
          toSchool: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.interLibraryLoan.count({ where }),
    ]);

    return NextResponse.json({
      data: requests,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("GET inter-library error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya anggota yang bisa membuat request" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.toSchoolId || !body.bookTitle) {
      return NextResponse.json({ error: "toSchoolId dan bookTitle wajib diisi" }, { status: 400 });
    }

    const toSchool = await db.schoolLibrary.findUnique({ where: { id: body.toSchoolId } });
    if (!toSchool) {
      return NextResponse.json({ error: "Sekolah tujuan tidak ditemukan" }, { status: 404 });
    }

    const schools = await db.schoolLibrary.findMany({ where: { isActive: true } });
    const mySchool = schools[0];
    if (!mySchool) {
      return NextResponse.json({ error: "Sekolah asal tidak ditemukan" }, { status: 404 });
    }

    const loan = await db.interLibraryLoan.create({
      data: {
        fromSchoolId: mySchool.id,
        toSchoolId: body.toSchoolId,
        memberId: user.member.id,
        bookTitle: body.bookTitle,
        bookAuthor: body.bookAuthor || null,
        requestNote: body.requestNote || null,
        status: "REQUESTED",
      },
      include: {
        fromSchool: true,
        toSchool: true,
      },
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (err) {
    console.error("POST inter-library error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
