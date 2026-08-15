import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian, requireFullLibrarian } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
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

  await db.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
