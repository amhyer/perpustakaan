import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { parsePagination } from "@/lib/query-helpers";

/**
 * GET /api/book-items/all — list semua eksemplar (untuk label generator).
 * Librarians only.
 *
 * Query: ?page=1&pageSize=1000&status=AVAILABLE
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const pagination = parsePagination(url.searchParams, { defaultPageSize: 1000, maxPageSize: 5000 });
    const status = url.searchParams.get("status");
    const bookId = url.searchParams.get("bookId");

    const where: any = {};
    if (status) where.status = status;
    if (bookId) where.bookId = bookId;

    const [items, total] = await Promise.all([
      db.bookItem.findMany({
        where,
        include: {
          book: {
            select: { id: true, title: true, author: true, isbn: true },
          },
        },
        orderBy: [{ book: { title: "asc" } }, { itemCode: "asc" }],
        skip: pagination.offset,
        take: pagination.pageSize,
      }),
      db.bookItem.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
      },
    });
  } catch (err) {
    console.error("GET book-items/all error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
