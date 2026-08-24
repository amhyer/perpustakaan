import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const [attendances, stats] = await Promise.all([
    db.libraryAttendance.findMany({
      where: {
        checkIn: { gte: date, lt: nextDate },
      },
      include: {
        member: {
          select: { fullName: true, memberNumber: true, category: true, classGrade: true },
        },
      },
      orderBy: { checkIn: "desc" },
    }),
    db.libraryAttendance.aggregate({
      _count: { id: true },
      where: {
        checkIn: { gte: date, lt: nextDate },
      },
    }),
  ]);

  const checkedIn = attendances.filter((a) => !a.checkOut).length;
  const total = stats._count.id;

  return NextResponse.json({ attendances, stats: { total, checkedIn, checkedOut: total - checkedIn } });
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();

  // Use provided memberId or find current user's member
  let memberId = body.memberId;
  if (!memberId) {
    const fullUser = await db.user.findUnique({
      where: { id: user!.id },
      include: { member: true },
    });
    if (!fullUser?.member) {
      return NextResponse.json({ error: "Akun ini tidak terkait dengan data anggota" }, { status: 400 });
    }
    memberId = fullUser.member.id;
  }

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
  }

  // Check for active (not checked out) attendance today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const existing = await db.libraryAttendance.findFirst({
    where: {
      memberId,
      checkIn: { gte: todayStart },
      checkOut: null,
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Sudah check-in hari ini. Silakan check-out terlebih dahulu." }, { status: 409 });
  }

  const attendance = await db.libraryAttendance.create({
    data: {
      memberId,
      purpose: body.purpose || null,
      room: body.room || null,
    },
    include: {
      member: {
        select: { fullName: true, memberNumber: true, category: true, classGrade: true },
      },
    },
  });

  return NextResponse.json(attendance, { status: 201 });
}
