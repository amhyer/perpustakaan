import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      studentsReadingToday,
      topBooks,
      outstandingFines,
      visitorCount,
    ] = await Promise.all([
      // Students reading today (active attendance)
      db.libraryAttendance.count({
        where: {
          checkIn: { gte: todayStart },
          checkOut: null,
        },
      }),

      // Most popular books (by loan count this month)
      db.loan.groupBy({
        by: ["bookId"],
        _count: { id: true },
        where: {
          loanDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Outstanding fines
      db.loan.aggregate({
        _sum: { fineAmount: true, finePaid: true },
        where: {
          fineAmount: { gt: 0 },
          status: { in: ["OVERDUE", "LOANED"] },
        },
      }),

      // Library visit count today
      db.libraryAttendance.count({
        where: {
          checkIn: { gte: todayStart },
        },
      }),
    ]);

    // Resolve book titles for top books
    const bookIds = topBooks.map((b) => b.bookId);
    const books = await db.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, title: true, author: true, coverColor: true },
    });
    const bookMap = new Map(books.map((b) => [b.id, b]));

    const topBooksWithTitles = topBooks.map((b) => ({
      bookId: b.bookId,
      title: bookMap.get(b.bookId)?.title ?? "Tidak diketahui",
      author: bookMap.get(b.bookId)?.author ?? "",
      loanCount: b._count.id,
    }));

    return NextResponse.json({
      studentsReadingToday,
      topBooks: topBooksWithTitles,
      outstandingFines: {
        total: (outstandingFines._sum.fineAmount ?? 0) - (outstandingFines._sum.finePaid ?? 0),
      },
      visitorCount,
    });
  } catch (err) {
    console.error("GET dashboard/executive-stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
