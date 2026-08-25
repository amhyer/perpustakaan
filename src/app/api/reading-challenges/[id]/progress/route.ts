import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya anggota yang bisa update progress" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    const challenge = await db.monthlyChallenge.findUnique({ where: { id } });
    if (!challenge) {
      return NextResponse.json({ error: "Challenge tidak ditemukan" }, { status: 404 });
    }

    const participant = await db.challengeParticipant.findUnique({
      where: { challengeId_memberId: { challengeId: id, memberId: user.member.id } },
    });
    if (!participant) {
      return NextResponse.json({ error: "Belum bergabung di challenge ini" }, { status: 400 });
    }

    const newValue = body.currentValue ?? participant.currentValue;
    const isCompleted = newValue >= challenge.goalValue;

    const updated = await db.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        currentValue: newValue,
        isCompleted,
        completedAt: isCompleted && !participant.completedAt ? new Date() : participant.completedAt,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
