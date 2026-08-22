import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian, requireFullLibrarian } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  // Pagination (Tahap 16 #26) — backward compatible
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam) : null;
  const pageSize = parseInt(searchParams.get("pageSize") || "12");

  // Mode pagination: return { data, total, page, pageSize }
  if (page !== null && !isNaN(page)) {
    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        include: { author: { select: { name: true } } },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.announcement.count(),
    ]);
    return NextResponse.json({ data: announcements, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  }

  // Mode lama (tanpa pagination): return array biasa
  const announcements = await db.announcement.findMany({
    include: { author: { select: { name: true } } },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
  });
  return NextResponse.json(announcements);
}

export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json();
  if (!body.title || !body.content) return NextResponse.json({ error: "Judul dan isi wajib diisi" }, { status: 400 });

  const announcement = await db.announcement.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: user!.id,
      isPinned: body.isPinned || false,
    },
    include: { author: { select: { name: true } } },
  });

  // Notifikasi ke semua anggota non-librarian
  const members = await db.user.findMany({ where: { role: { in: ["TEACHER", "STUDENT"] } } });
  await db.notification.createMany({
    data: members.map((m) => ({
      userId: m.id,
      title: "Pengumuman Baru",
      message: body.title,
      type: "ANNOUNCEMENT",
      relatedId: announcement.id,
    })),
  });

  return NextResponse.json(announcement, { status: 201 });
}

export async function PUT(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

  const existing = await db.announcement.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });

  const announcement = await db.announcement.update({
    where: { id: body.id },
    data: {
      title: body.title,
      content: body.content,
      isPinned: body.isPinned,
    },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(announcement);
}

export async function DELETE(req: Request) {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });

  await db.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
