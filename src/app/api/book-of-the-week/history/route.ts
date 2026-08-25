import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const [history, total] = await Promise.all([
      db.bookOfTheWeek.findMany({
        include: {
          book: { include: { category: true } },
        },
        orderBy: { weekStart: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.bookOfTheWeek.count(),
    ]);

    return NextResponse.json({
      data: history,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
