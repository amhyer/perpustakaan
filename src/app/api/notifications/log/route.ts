import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isLibrarian } from "@/lib/auth";

// GET /api/notifications/log — admin-only: lihat semua notifikasi (log)
// Query params: type, search, page, pageSize
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!isLibrarian(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { message: { contains: search } },
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
      { user: { member: { fullName: { contains: search } } } },
      { user: { member: { memberNumber: { contains: search } } } },
    ];
  }

  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            member: { select: { id: true, memberNumber: true, fullName: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notification.count({ where }),
  ]);

  // Stats (across all notifications matching current filters, not paginated)
  const statsWhere = { ...where };
  const [totalAll, infoCount, warningCount, dueDateCount, overdueCount, announceCount, unreadCount] = await Promise.all([
    db.notification.count({ where: statsWhere }),
    db.notification.count({ where: { ...statsWhere, type: "INFO" } }),
    db.notification.count({ where: { ...statsWhere, type: "WARNING" } }),
    db.notification.count({ where: { ...statsWhere, type: "DUE_DATE" } }),
    db.notification.count({ where: { ...statsWhere, type: "OVERDUE" } }),
    db.notification.count({ where: { ...statsWhere, type: "ANNOUNCEMENT" } }),
    db.notification.count({ where: { ...statsWhere, isRead: false } }),
  ]);

  return NextResponse.json({
    data: notifications,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    stats: { totalAll, infoCount, warningCount, dueDateCount, overdueCount, announceCount, unreadCount },
  });
}
