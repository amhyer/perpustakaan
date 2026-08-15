import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireAuth } from "@/lib/auth";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "LIBRARIAN" && user.role !== "PUSTAKAWAN_JUNIOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = await db.stocktakingSession.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      _count: { select: { scans: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST() {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "LIBRARIAN" && user.role !== "PUSTAKAWAN_JUNIOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check tidak ada sesi ONGOING lain
  const ongoing = await db.stocktakingSession.findFirst({
    where: { status: "ONGOING" },
  });
  if (ongoing) {
    return NextResponse.json(
      { error: "Sesi stock opname sedang berlangsung. Selesaikan dulu sesi sebelumnya." },
      { status: 409 }
    );
  }

  // Snapshot jumlah eksemplar AVAILABLE
  const availableCount = await db.bookItem.count({
    where: { status: "AVAILABLE" },
  });

  const session = await db.stocktakingSession.create({
    data: {
      createdById: user.id,
      expectedCount: availableCount,
      status: "ONGOING",
    },
  });

  return NextResponse.json(session, { status: 201 });
}
