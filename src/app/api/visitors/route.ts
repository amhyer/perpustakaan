import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian, isLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/visitors — daftar kunjungan.
 * Query: ?date=YYYY-MM-DD, ?active=1 (yang masih di dalam)
 * - Pustakawan: semua
 * - Siswa: hanya miliknya
 */
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const active = url.searchParams.get("active") === "1";

  const where: any = {};
  if (date) {
    const dayStart = new Date(date);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    where.checkIn = { gte: dayStart, lt: dayEnd };
  }
  if (active) where.checkOut = null;
  if (!isLibrarian(user!.role)) {
    where.memberId = user!.member?.id;
  }

  const visitors = await db.visitor.findMany({
    where,
    include: { member: { select: { fullName: true, memberNumber: true, classGrade: true } } },
    orderBy: { checkIn: "desc" },
    take: 200,
  });

  return NextResponse.json(visitors);
}

/**
 * POST /api/visitors — check-in pengunjung.
 * Body: { name, memberId?, purpose?, notes? }
 * - Tanpa login (untuk kiosk mode public)
 * - Pustakawan juga bisa input
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    }
    const visitor = await db.visitor.create({
      data: {
        name: body.name,
        memberId: body.memberId || null,
        purpose: body.purpose || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(visitor, { status: 201 });
  } catch (err) {
    console.error("POST /api/visitors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
