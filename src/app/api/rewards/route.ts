import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { parsePagination } from "@/lib/query-helpers";
import { getBalance } from "@/lib/points-engine";

/**
 * GET /api/rewards — Katalog hadiah untuk siswa/guru.
 *
 * Query params:
 * - page, pageSize
 * - category: filter by category (BOOK, STATIONERY, VOUCHER, dll)
 * - minCost, maxCost: filter by point range
 * - affordableOnly: boolean — hanya yang bisa diklaim dengan poin user
 * - featured: boolean — hanya featured
 *
 * Returns: items + saldo user + flag `canAfford` per item
 */
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member yang bisa akses katalog" }, { status: 403 });
  }

  try {
    const searchParams = new URL(req.url).searchParams;
    const pagination = parsePagination(searchParams, { defaultPageSize: 12, maxPageSize: 60 });
    const category = searchParams.get("category");
    const minCost = searchParams.get("minCost");
    const maxCost = searchParams.get("maxCost");
    const affordableOnly = searchParams.get("affordableOnly") === "true";
    const featured = searchParams.get("featured") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isActive: true,
      minRole: { in: [user.member.category, "STUDENT"] }, // student always allowed, plus user's role
    };
    if (category) where.category = category;
    if (minCost) where.pointCost = { ...where.pointCost, gte: parseInt(minCost) };
    if (maxCost) where.pointCost = { ...where.pointCost, lte: parseInt(maxCost) };
    if (featured) where.isFeatured = true;

    const [items, total, userBalance] = await Promise.all([
      db.reward.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { pointCost: "asc" }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      db.reward.count({ where }),
      getBalance(user.member.id),
    ]);

    // Annotate dengan canAfford & stockStatus
    const annotated = items.map((r) => ({
      ...r,
      remainingStock: r.stock === null ? null : r.stock - r.stockClaimed,
      isOutOfStock: r.stock !== null && r.stockClaimed >= r.stock,
      canAfford: userBalance >= r.pointCost && (r.stock === null || r.stockClaimed < r.stock),
    }));

    // Filter affordableOnly client-side (setelah annotate)
    const finalItems = affordableOnly
      ? annotated.filter((r) => r.canAfford)
      : annotated;

    return NextResponse.json({
      items: finalItems,
      total: affordableOnly ? finalItems.length : total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil((affordableOnly ? finalItems.length : total) / pagination.pageSize),
      userBalance,
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
