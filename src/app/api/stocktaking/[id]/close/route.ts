import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ITEM_STATUS } from "@/lib/constants";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "LIBRARIAN" && user.role !== "PUSTAKAWAN_JUNIOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { note } = (await req.json().catch(() => ({}))) || {};

    const session = await db.stocktakingSession.findUnique({
      where: { id },
      select: { status: true, expectedCount: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (session.status !== "ONGOING") {
      return NextResponse.json({ error: "Sesi sudah selesai" }, { status: 409 });
    }

    // Hitung hasil
    const scannedIds = await db.stocktakingScan.findMany({
      where: { sessionId: id },
      select: { bookItemId: true },
    });
    const scannedItemIds = scannedIds.map((s) => s.bookItemId);

    // Found = AVAILABLE items yang berhasil discan
    const found = await db.bookItem.count({
      where: {
        id: { in: scannedItemIds },
        status: ITEM_STATUS.AVAILABLE,
      },
    });

    // NotFound = AVAILABLE items yang tidak discan
    const notFoundItems = await db.bookItem.findMany({
      where: {
        status: ITEM_STATUS.AVAILABLE,
        id: { notIn: scannedItemIds.length > 0 ? scannedItemIds : [""] },
      },
      include: {
        book: { select: { id: true, title: true, author: true } },
      },
    });

    // Anomalies = items discan tapi status != AVAILABLE
    const anomalyItems = await db.bookItem.findMany({
      where: {
        id: { in: scannedItemIds },
        status: { not: ITEM_STATUS.AVAILABLE },
      },
      include: {
        book: { select: { id: true, title: true, author: true } },
      },
    });

    // Tutup sesi
    await db.stocktakingSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        note: note ?? undefined,
      },
    });

    return NextResponse.json({
      found,
      notFound: notFoundItems,
      anomalies: anomalyItems,
      expectedCount: session.expectedCount,
    });
  } catch (err) {
    console.error("POST stocktaking/[id]/close error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}