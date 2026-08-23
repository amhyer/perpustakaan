import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { parsePagination } from "@/lib/query-helpers";

/**
 * GET /api/points/transactions — Buku besar (history) poin member.
 *
 * Query params:
 * - page, pageSize: pagination
 * - type: filter by type (EARN, REDEEM, ADJUST_UP, ADJUST_DOWN, EXPIRE)
 * - from, to: filter by date range (ISO date)
 */
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member yang punya history" }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const pagination = parsePagination(searchParams, { defaultPageSize: 20, maxPageSize: 100 });
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { memberId: user.member.id };
  if (type) where.type = type;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    db.pointTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      include: {
        reward: { select: { id: true, name: true, category: true } },
      },
    }),
    db.pointTransaction.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  });
}
