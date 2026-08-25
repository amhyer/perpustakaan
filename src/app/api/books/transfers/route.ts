import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { bookItem: { itemCode: { contains: search } } },
        { bookItem: { book: { title: { contains: search } } } },
        { reason: { contains: search } },
      ];
    }

    const [transfers, total] = await Promise.all([
      db.bookTransfer.findMany({
        where,
        include: {
          bookItem: {
            include: { book: { select: { id: true, title: true, author: true } } },
          },
          fromLocation: { select: { id: true, name: true, code: true } },
          toLocation: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.bookTransfer.count({ where }),
    ]);

    const stats = await db.bookTransfer.aggregate({
      _count: { id: true },
    });

    const topLocations = await db.bookTransfer.groupBy({
      by: ["toLocationId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const locationNames: Record<string, string> = {};
    for (const loc of topLocations) {
      const l = await db.location.findUnique({ where: { id: loc.toLocationId }, select: { name: true } });
      locationNames[loc.toLocationId] = l?.name || loc.toLocationId;
    }

    return NextResponse.json({
      transfers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: {
        totalTransfers: stats._count.id,
      },
      topLocations: topLocations.map((l) => ({
        locationId: l.toLocationId,
        locationName: locationNames[l.toLocationId],
        count: l._count.id,
      })),
    });
  } catch (err) {
    console.error("GET books/transfers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}