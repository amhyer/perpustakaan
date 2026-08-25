import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { parsePagination } from "@/lib/query-helpers";

const VALID_TYPES = ["EARN", "REDEEM", "ADJUST_UP", "ADJUST_DOWN", "EXPIRE"] as const;
type TxnType = (typeof VALID_TYPES)[number];

/**
 * GET /api/points/transactions — Buku besar (history) poin member.
 *
 * Query params:
 * - page, pageSize: pagination (default: 20, max: 100)
 * - type: filter by type (EARN, REDEEM, ADJUST_UP, ADJUST_DOWN, EXPIRE)
 * - from, to: filter by date range (ISO date)
 * - rewardId: filter by reward (untuk lihat history redemption)
 *
 * Performance: indexed by (memberId, createdAt) — fast for member's own history.
 */
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member yang punya history" }, { status: 403 });
  }

  try {
    const searchParams = new URL(req.url).searchParams;
    const pagination = parsePagination(searchParams, { defaultPageSize: 20, maxPageSize: 100 });

    // Validate type filter
    const typeParam = searchParams.get("type");
    if (typeParam && !VALID_TYPES.includes(typeParam as TxnType)) {
      return NextResponse.json(
        { error: `type harus salah satu dari: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate date range
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && isNaN(new Date(from).getTime())) {
      return NextResponse.json({ error: "from harus ISO date valid" }, { status: 400 });
    }
    if (to && isNaN(new Date(to).getTime())) {
      return NextResponse.json({ error: "to harus ISO date valid" }, { status: 400 });
    }

    const rewardId = searchParams.get("rewardId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { memberId: user.member.id };
    if (typeParam) where.type = typeParam as TxnType;
    if (rewardId) where.rewardId = rewardId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total, typeCounts] = await Promise.all([
      db.pointTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.offset,
        take: pagination.pageSize,
        include: {
          reward: { select: { id: true, name: true, category: true } },
        },
      }),
      db.pointTransaction.count({ where }),
      // Group by type untuk tab counts
      db.pointTransaction.groupBy({
        by: ["type"],
        where: { memberId: user.member.id },
        _count: true,
      }),
    ]);

    // Type counts untuk tab UI
    const counts = typeCounts.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<string, number>, c: any) => {
        acc[c.type] = c._count;
        return acc;
      },
      { EARN: 0, REDEEM: 0, ADJUST_UP: 0, ADJUST_DOWN: 0, EXPIRE: 0 }
    );

    return NextResponse.json({
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
      hasMore: pagination.page < Math.ceil(total / pagination.pageSize),
      counts,
    });
  } catch (err) {
    console.error("GET points/transactions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
