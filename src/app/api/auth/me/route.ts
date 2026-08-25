import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/auth/me — return current user + preferensi default dashboard.
 *
 * Preferensi disimpan terpisah di tabel UserPreference (1-to-1 dengan User).
 * Auto-handled di getCurrentUser() — single source of truth.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      member: user.member
        ? {
            id: user.member.id,
            memberNumber: user.member.memberNumber,
            fullName: user.member.fullName,
            category: user.member.category,
            photo: user.member.photo,
            classGrade: user.member.classGrade,
          }
        : null,
      defaultDashboard: user.defaultDashboard,
    });
  } catch (err) {
    console.error("GET auth/me error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
