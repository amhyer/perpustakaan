import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const challenge = await db.monthlyChallenge.findFirst({
    where: { month, year, isActive: true },
    include: {
      participants: {
        include: {
          member: { select: { id: true, fullName: true, memberNumber: true } },
        },
        orderBy: { currentValue: "desc" },
      },
    },
  });

  if (!challenge) {
    return NextResponse.json({ challenge: null, myProgress: null, leaderboard: [] });
  }

  let myProgress: { id: string; currentValue: number; isCompleted: boolean; completedAt: Date | null } | null = null;
  if (user!.member) {
    myProgress = await db.challengeParticipant.findUnique({
      where: { challengeId_memberId: { challengeId: challenge.id, memberId: user!.member.id } },
    });
  }

  const leaderboard = challenge.participants
    .sort((a, b) => b.currentValue - a.currentValue)
    .map((p, i) => ({
      rank: i + 1,
      memberId: p.memberId,
      memberName: p.member.fullName,
      memberNumber: p.member.memberNumber,
      currentValue: p.currentValue,
      isCompleted: p.isCompleted,
    }));

  return NextResponse.json({ challenge, myProgress, leaderboard });
}

export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json();
  if (!body.title || !body.goalType || !body.goalValue) {
    return NextResponse.json({ error: "title, goalType, goalValue wajib diisi" }, { status: 400 });
  }

  const now = new Date();
  const month = body.month || now.getMonth() + 1;
  const year = body.year || now.getFullYear();

  const existing = await db.monthlyChallenge.findFirst({ where: { month, year } });
  if (existing) {
    return NextResponse.json({ error: "Challenge untuk bulan ini sudah ada" }, { status: 409 });
  }

  const challenge = await db.monthlyChallenge.create({
    data: {
      title: body.title,
      description: body.description || "",
      month,
      year,
      goalType: body.goalType,
      goalValue: body.goalValue,
      rewardPoints: body.rewardPoints || 100,
      badgeName: body.badgeName || null,
    },
  });

  return NextResponse.json(challenge, { status: 201 });
}
