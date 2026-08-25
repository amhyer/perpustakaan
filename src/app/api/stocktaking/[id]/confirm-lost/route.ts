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
    const { bookItemIds } = await req.json();

    if (!Array.isArray(bookItemIds) || bookItemIds.length === 0) {
      return NextResponse.json({ error: "bookItemIds wajib diisi" }, { status: 400 });
    }

    const session = await db.stocktakingSession.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (session.status !== "ONGOING" && session.status !== "COMPLETED") {
      return NextResponse.json({ error: "Status sesi tidak valid" }, { status: 409 });
    }

    // Update only selected items to LOST
    await db.bookItem.updateMany({
      where: { id: { in: bookItemIds } },
      data: { status: ITEM_STATUS.LOST },
    });

    return NextResponse.json({
      updated: bookItemIds.length,
      status: ITEM_STATUS.LOST,
    });
  } catch (err) {
    console.error("POST stocktaking/[id]/confirm-lost error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}