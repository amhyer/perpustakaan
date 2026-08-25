import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    // Get all active reservations (PENDING + READY) grouped by book
    const reservations = await db.reservation.findMany({
      where: { status: { in: ["PENDING", "READY"] } },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverColor: true,
            coverImage: true,
            isbn: true,
          },
        },
        member: {
          select: {
            id: true,
            memberNumber: true,
            fullName: true,
            category: true,
            classGrade: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by bookId
    const bookMap = new Map<string, {
      book: typeof reservations[0]["book"];
      pending: typeof reservations;
      ready: typeof reservations;
      totalAvailable: number;
    }>();

    for (const r of reservations) {
      const existing = bookMap.get(r.bookId);
      if (existing) {
        if (r.status === "PENDING") existing.pending.push(r);
        else existing.ready.push(r);
      } else {
        // Count available copies
        const availableCount = await db.bookItem.count({
          where: { bookId: r.bookId, status: "AVAILABLE" },
        });
        bookMap.set(r.bookId, {
          book: r.book,
          pending: r.status === "PENDING" ? [r] : [],
          ready: r.status === "READY" ? [r] : [],
          totalAvailable: availableCount,
        });
      }
    }

    // Convert to array and sort by total waiters (longest queue first)
    const queue = Array.from(bookMap.values())
      .map((entry) => ({
        book: entry.book,
        pendingCount: entry.pending.length,
        readyCount: entry.ready.length,
        totalWaiting: entry.pending.length + entry.ready.length,
        availableCopies: entry.totalAvailable,
        pending: entry.pending.map((r) => ({
          id: r.id,
          queueOrder: r.queueOrder,
          createdAt: r.createdAt,
          member: r.member,
        })),
        ready: entry.ready.map((r) => ({
          id: r.id,
          expiresAt: r.expiresAt,
          createdAt: r.createdAt,
          member: r.member,
        })),
      }))
      .sort((a, b) => b.totalWaiting - a.totalWaiting);

    const totalWaiting = queue.reduce((sum, q) => sum + q.totalWaiting, 0);
    const booksWithQueues = queue.length;
    const highDemand = queue.filter((q) => q.availableCopies === 0 && q.totalWaiting > 0).length;

    return NextResponse.json({
      queue,
      stats: { totalWaiting, booksWithQueues, highDemand },
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
