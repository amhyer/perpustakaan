import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const member = user!.member;
  if (!member) {
    return NextResponse.json({ error: "Hanya anggota yang dapat membeli buku" }, { status: 403 });
  }

  const { id } = await params;

  const listing = await db.bookListing.findUnique({
    where: { id },
    select: { id: true, sellerId: true, pricePoints: true, status: true, bookTitle: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
  }

  if (listing.status !== "AVAILABLE") {
    return NextResponse.json({ error: "Buku sudah tidak tersedia" }, { status: 400 });
  }

  if (listing.sellerId === member.id) {
    return NextResponse.json({ error: "Tidak dapat membeli buku sendiri" }, { status: 400 });
  }

  // Check buyer's point balance
  const lastTx = await db.pointTransaction.findFirst({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });

  const currentBalance = lastTx?.balanceAfter ?? 0;
  if (currentBalance < listing.pricePoints) {
    return NextResponse.json(
      { error: `Poin tidak cukup. Saldo: ${currentBalance}, Harga: ${listing.pricePoints}` },
      { status: 400 }
    );
  }

  // Transaction: deduct buyer points, add seller points, mark listing sold
  const newBuyerBalance = currentBalance - listing.pricePoints;

  // Get seller's last balance
  const sellerLastTx = await db.pointTransaction.findFirst({
    where: { memberId: listing.sellerId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });
  const sellerNewBalance = (sellerLastTx?.balanceAfter ?? 0) + listing.pricePoints;

  await db.$transaction([
    // Mark listing as sold
    db.bookListing.update({
      where: { id },
      data: { status: "SOLD", buyerId: member.id },
    }),
    // Deduct buyer points
    db.pointTransaction.create({
      data: {
        memberId: member.id,
        type: "REDEEM",
        source: "MARKETPLACE_BUY",
        amount: listing.pricePoints,
        balanceAfter: newBuyerBalance,
        description: `Membeli "${listing.bookTitle}" dari marketplace`,
      },
    }),
    // Add seller points
    db.pointTransaction.create({
      data: {
        memberId: listing.sellerId,
        type: "EARN",
        source: "MARKETPLACE_SELL",
        amount: listing.pricePoints,
        balanceAfter: sellerNewBalance,
        description: `Menjual "${listing.bookTitle}" di marketplace`,
      },
    }),
  ]);

  return NextResponse.json({ success: true, message: "Pembelian berhasil" });
}
