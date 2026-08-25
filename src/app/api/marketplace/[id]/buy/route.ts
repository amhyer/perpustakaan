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

  try {
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

    // Transaction: verify balance inside transaction, deduct buyer points, add seller points
    await db.$transaction(async (tx) => {
      // Re-check balance inside transaction to prevent TOCTOU
      const lastTx = await tx.pointTransaction.findFirst({
        where: { memberId: member.id },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });
      const currentBalance = lastTx?.balanceAfter ?? 0;
      if (currentBalance < listing.pricePoints) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const newBuyerBalance = currentBalance - listing.pricePoints;

      const sellerLastTx = await tx.pointTransaction.findFirst({
        where: { memberId: listing.sellerId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });
      const sellerNewBalance = (sellerLastTx?.balanceAfter ?? 0) + listing.pricePoints;

      await Promise.all([
        tx.bookListing.update({
          where: { id },
          data: { status: "SOLD", buyerId: member.id },
        }),
        tx.pointTransaction.create({
          data: {
            memberId: member.id,
            type: "REDEEM",
            source: "MARKETPLACE_BUY",
            amount: listing.pricePoints,
            balanceAfter: newBuyerBalance,
            description: `Membeli "${listing.bookTitle}" dari marketplace`,
          },
        }),
        tx.pointTransaction.create({
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
    });

    return NextResponse.json({ success: true, message: "Pembelian berhasil" });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
