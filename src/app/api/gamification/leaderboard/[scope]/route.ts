/**
 * Class-based Leaderboard API.
 *
 * GET /api/gamification/leaderboard/class?classGrade=10-A&limit=20
 *   Returns: top readers in a specific class
 *
 * Sprint M - Tier 1 #2: Gamification lanjutan.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const classGrade = searchParams.get("classGrade");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!classGrade) {
    return NextResponse.json(
      { error: "classGrade wajib diisi" },
      { status: 400 }
    );
  }

  if (limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: "limit harus antara 1-100" },
      { status: 400 }
    );
  }

  // Get all members in class
  const classMembers = await db.member.findMany({
    where: { classGrade, status: "ACTIVE" },
    select: { id: true, fullName: true, memberNumber: true, photo: true, classGrade: true },
  });

  if (classMembers.length === 0) {
    return NextResponse.json({
      classGrade,
      leaderboard: [],
      total: 0,
    });
  }

  const memberIds = classMembers.map((m) => m.id);

  // Count returned loans per member
  const loanCounts = await db.loan.groupBy({
    by: ["memberId"],
    where: {
      memberId: { in: memberIds },
      status: "RETURNED",
    },
    _count: { _all: true },
  });

  const countMap = new Map(
    loanCounts.map((c) => [c.memberId, c._count?._all ?? 0])
  );

  // Build leaderboard
  const leaderboard = classMembers
    .map((m) => ({
      memberId: m.id,
      fullName: m.fullName,
      memberNumber: m.memberNumber,
      photo: m.photo,
      classGrade: m.classGrade,
      booksRead: countMap.get(m.id) ?? 0,
    }))
    .sort((a, b) => b.booksRead - a.booksRead)
    .slice(0, limit)
    .map((entry, idx) => ({
      rank: idx + 1,
      ...entry,
    }));

  return NextResponse.json({
    classGrade,
    leaderboard,
    total: classMembers.length,
  });
}
