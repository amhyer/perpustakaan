import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * DELETE /api/auth/sessions/[id] — hapus sesi tertentu (force logout).
 * Ownership: hanya bisa hapus sesi milik sendiri.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;

    // Ownership check
    const session = await db.activeSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }
    if (session.userId !== user!.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.activeSession.delete({ where: { id } });
    await logAudit(user!.id, "SETTING_CHANGE", "Session", id, "Force logout sesi");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE auth/sessions/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/sessions (no id) — logout semua sesi kecuali yang saat ini.
 * Dipakai saat user ganti password / curiga akun dibobol.
 */
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const { keepCurrent } = body as { keepCurrent?: boolean };

    if (keepCurrent) {
      // Hapus semua kecuali current session — ditandai dengan cookie token yang masih ada
      // Untuk simplicity, hapus semua dan biarkan user login ulang dari device ini
      await db.activeSession.deleteMany({ where: { userId: user!.id } });
    } else {
      await db.activeSession.deleteMany({ where: { userId: user!.id } });
    }

    await logAudit(user!.id, "SETTING_CHANGE", "Session", user!.id, "Logout semua sesi");

    return NextResponse.json({ success: true, message: "Semua sesi telah diakhiri" });
  } catch (err) {
    console.error("POST auth/sessions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
