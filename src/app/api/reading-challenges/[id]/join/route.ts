import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya anggota yang bisa bergabung" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const challenge = await db.monthlyChallenge.findUnique({ where: { id } });
    if (!challenge) {
      return NextResponse.json({ error: "Challenge tidak ditemukan" }, { status: 404 });
    }
    if (!challenge.isActive) {
      return NextResponse.json({ error: "Challenge sudah tidak aktif" }, { status: 400 });
    }

    const existing = await db.challengeParticipant.findUnique({
      where: { challengeId_memberId: { challengeId: id, memberId: user.member.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Sudah bergabung" }, { status: 409 });
    }

    const participant = await db.challengeParticipant.create({
      data: { challengeId: id, memberId: user.member.id },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
