import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/redemptions/me — Riwayat klaim hadiah oleh member yang login.
 *
 * Query params:
 * - status: PENDING | APPROVED | DELIVERED | REJECTED | CANCELLED
 */
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member yang punya history klaim" }, { status: 403 });
  }

  try {
    const status = new URL(req.url).searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { memberId: user.member.id };
    if (status) where.status = status;

    const items = await db.rewardRedemption.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        reward: { select: { id: true, name: true, imageUrl: true, category: true } },
        approvedBy: { select: { id: true, name: true } },
        deliveredBy: { select: { id: true, name: true } },
      },
    });

    // Counts per status untuk tabs
    const counts = await db.rewardRedemption.groupBy({
      by: ["status"],
      where: { memberId: user.member.id },
      _count: true,
    });

    return NextResponse.json({
      items,
      counts: counts.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc: Record<string, number>, c: any) => {
          acc[c.status] = c._count;
          return acc;
        },
        { PENDING: 0, APPROVED: 0, DELIVERED: 0, REJECTED: 0, CANCELLED: 0 }
      ),
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
