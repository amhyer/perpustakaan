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

  const result = await computeBadges(user!.member.id);
  return NextResponse.json(result);
}
