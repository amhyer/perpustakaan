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

  const { id } = await params;
  const { itemCode } = await req.json();

  if (!itemCode || typeof itemCode !== "string") {
    return NextResponse.json({ error: "itemCode wajib diisi" }, { status: 400 });
  }

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

  // Cari bookItem by itemCode
  const bookItem = await db.bookItem.findUnique({
    where: { itemCode },
    include: { book: { select: { id: true, title: true, author: true } } },
  });

  if (!bookItem) {
    return NextResponse.json({ status: "NOT_FOUND", message: "Eksemplar tidak ditemukan" });
  }

  // Cek duplikat scan
  const existingScan = await db.stocktakingScan.findFirst({
    where: { sessionId: id, bookItemId: bookItem.id },
  });

  if (existingScan) {
    return NextResponse.json({
      status: "DUPLICATE",
      message: "Eksemplar sudah discan sebelumnya",
      bookItem,
    });
  }

  // Cek anomaly - status bukan AVAILABLE saat sesi dimulai
  if (bookItem.status !== ITEM_STATUS.AVAILABLE) {
    return NextResponse.json({
      status: "ANOMALY",
      message: `Status eksemplar: ${bookItem.status}`,
      bookItem,
    });
  }

  // Simpan scan
  await db.stocktakingScan.create({
    data: {
      sessionId: id,
      bookItemId: bookItem.id,
    },
  });

  return NextResponse.json({
    status: "OK",
    message: "Scan berhasil",
    bookItem,
  });
}