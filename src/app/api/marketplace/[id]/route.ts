import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const listing = await db.bookListing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, fullName: true, memberNumber: true } },
      buyer: { select: { id: true, fullName: true, memberNumber: true } },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(listing);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const listing = await db.bookListing.findUnique({
    where: { id },
    select: { id: true, sellerId: true, status: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
  }

  // Only seller or librarian can remove
  const member = user!.member;
  const isSeller = member && listing.sellerId === member.id;
  const isLibrarian = user!.role === "LIBRARIAN" || user!.role === "PUSTAKAWAN_JUNIOR";

  if (!isSeller && !isLibrarian) {
    return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 403 });
  }

  if (listing.status === "SOLD") {
    return NextResponse.json({ error: "Tidak dapat menghapus listing yang sudah terjual" }, { status: 400 });
  }

  await db.bookListing.update({
    where: { id },
    data: { status: "REMOVED" },
  });

  return NextResponse.json({ success: true });
}
