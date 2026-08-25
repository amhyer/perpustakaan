import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";

export async function GET(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam) : 1;
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const entityType = searchParams.get("entityType");
    const q = searchParams.get("q");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (q) {
      where.OR = [
        { action: { contains: q } },
        { entityType: { contains: q } },
        { detail: { contains: q } },
        { user: { name: { contains: q } } },
      ];
    }
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        createdAt.lt = to;
      }
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("GET audit-log error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
