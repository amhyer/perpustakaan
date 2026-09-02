import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const countOnly = searchParams.get("count");

    if (countOnly === "1") {
      const unread = await db.notification.count({
        where: { userId: user!.id, isRead: false },
      });
      return NextResponse.json({ unread });
    }

    const notifications = await db.notification.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (err) {
    console.error("[/api/notifications] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Hitung yang belum dibaca
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const body = await req.json().catch(() => ({}));

    if (action === "count") {
      const unread = await db.notification.count({ where: { userId: user!.id, isRead: false } });
      return NextResponse.json({ unread });
    }

    if (action === "read") {
      if (body.all) {
        await db.notification.updateMany({ where: { userId: user!.id, isRead: false }, data: { isRead: true } });
      } else if (body.id) {
        // Ownership check: ensure notification belongs to user
        const notif = await db.notification.findUnique({ where: { id: body.id } });
        if (!notif || notif.userId !== user!.id) {
          return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 });
        }
        await db.notification.update({ where: { id: body.id }, data: { isRead: true } });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
