import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/auth/sessions — daftar sesi aktif untuk user saat ini.
 * Berguna untuk fitur "force logout" / session management.
 *
 * Returns: [{ id, userAgent, ip, lastActive, createdAt, isCurrent }]
 */
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const sessions = await db.activeSession.findMany({
      where: {
        userId: user!.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActive: "desc" },
    });

    return NextResponse.json(
      sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ip: s.ip,
        lastActive: s.lastActive,
        createdAt: s.createdAt,
      }))
    );
  } catch (err) {
    console.error("GET auth/sessions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
