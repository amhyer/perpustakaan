import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian, requireFullLibrarian } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { sendWhatsAppBatch, whatsappTemplates } from "@/lib/whatsapp";

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

  // Filter anggota berdasarkan kategori (optional, default semua)
  const targetRole = body.targetRole; // 'TEACHER' | 'STUDENT' | undefined (semua)
  const whereMember: any = { role: { in: ["TEACHER", "STUDENT"] } };
  if (targetRole) whereMember.role = targetRole;

  const members = await db.user.findMany({
    where: whereMember,
    include: { member: true },
  });

  // In-app notification (always)
  await db.notification.createMany({
    data: members.map((m) => ({
      userId: m.id,
      title: "Pengumuman Baru",
      message: body.title,
      type: "ANNOUNCEMENT",
      relatedId: announcement.id,
    })),
  });

  // Broadcast email (best-effort)
  if (body.broadcastEmail !== false) {
    const template = emailTemplates.announcementBroadcast({
      title: body.title,
      content: body.content,
      authorName: user!.name,
    });
    Promise.allSettled(
      members.map((m) =>
        sendEmail({
          to: m.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          category: "ANNOUNCEMENT",
          relatedId: announcement.id,
        })
      )
    ).then((results) => {
      const sent = results.filter((r) => r.status === "fulfilled").length;
      console.log(`[announcement] Email broadcast: ${sent}/${members.length}`);
    });
  }

  // Broadcast WhatsApp (best-effort, hanya untuk member dengan phone)
  if (body.broadcastWhatsapp !== false) {
    const waRecipients = members
      .filter((m) => m.member?.phone)
      .map((m) => ({
        phone: m.member!.phone!,
        message: whatsappTemplates.announcement({
          title: body.title,
          content: body.content,
        }),
        category: "ANNOUNCEMENT" as const,
        relatedId: announcement.id,
      }));

    if (waRecipients.length > 0) {
      sendWhatsAppBatch(waRecipients, 1500).then((r) => {
        console.log(`[announcement] WhatsApp broadcast: ${r.sent}/${r.total}`);
      });
    }
  }

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
