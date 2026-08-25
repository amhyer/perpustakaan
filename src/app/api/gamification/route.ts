import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { computeBadges } from "@/lib/gamification";

// GET /api/gamification — badge & progress untuk member yang login
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!user!.member) {
    return NextResponse.json({ error: "Anda belum terdaftar sebagai anggota" }, { status: 400 });
  }

  try {
    const result = await computeBadges(user!.member.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
