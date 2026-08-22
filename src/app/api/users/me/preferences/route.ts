import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { VALID_DASHBOARD_VIEWS } from "@/lib/constants";

/**
 * GET /api/users/me/preferences
 *
 * Ambil preferensi user yang sedang login. Auto-create dengan default
 * jika belum ada (idempotent — aman dipanggil多次).
 */
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Upsert untuk pastikan row selalu ada
  const pref = await db.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, defaultDashboard: "default" },
  });

  return NextResponse.json({
    defaultDashboard: pref.defaultDashboard,
  });
}

/**
 * PUT /api/users/me/preferences
 *
 * Update preferensi user. Body: { defaultDashboard?: string }
 *
 * Value yang valid tergantung role:
 * - LIBRARIAN/PUSTAKAWAN_JUNIOR: 'default' | 'dashboard' | 'customizable-dashboard' | 'executive-dashboard'
 * - TEACHER/STUDENT: 'default' | 'my-dashboard'
 */
export async function PUT(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, string> = {};

  if ("defaultDashboard" in body) {
    const value = body.defaultDashboard;
    if (typeof value !== "string") {
      return NextResponse.json(
        { error: "defaultDashboard harus berupa string" },
        { status: 400 }
      );
    }
    if (value !== "default" && !VALID_DASHBOARD_VIEWS.has(value)) {
      return NextResponse.json(
        { error: `defaultDashboard tidak valid: ${value}` },
        { status: 400 }
      );
    }
    // Validasi role-based — siswa/guru tidak boleh pilih dashboard eksekutif
    if (
      (user.role === "STUDENT" || user.role === "TEACHER") &&
      value !== "default" &&
      value !== "my-dashboard"
    ) {
      return NextResponse.json(
        { error: `Role ${user.role} tidak boleh menggunakan dashboard: ${value}` },
        { status: 403 }
      );
    }
    updates.defaultDashboard = value;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Tidak ada field yang diupdate" },
      { status: 400 }
    );
  }

  await db.userPreference.upsert({
    where: { userId: user.id },
    update: updates,
    create: { userId: user.id, ...updates },
  });

  return NextResponse.json({ success: true, ...updates });
}
