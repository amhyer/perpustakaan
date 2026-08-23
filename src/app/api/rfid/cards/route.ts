import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { db } from "@/lib/db";
import { lookupCard } from "@/lib/rfid-handler";
import { createHash } from "crypto";

/**
 * GET /api/rfid/cards — List all RFID cards.
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const uid = searchParams.get("uid");

  try {
    if (uid) {
      const card = await lookupCard(uid);
      if (!card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }
      return NextResponse.json(card);
    }

    const where: any = {};
    if (memberId) where.memberId = memberId;

    const cards = await db.rFIDCard.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            fullName: true,
            category: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items: cards });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

/**
 * POST /api/rfid/cards — Register a new RFID card.
 *
 * Body: { uid: string, memberId: string, cardType?: string, expiresAt?: string }
 */
export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error || !user) return error;

  let body: { uid?: string; memberId?: string; cardType?: string; expiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.uid || !body.memberId) {
    return NextResponse.json(
      { error: "uid and memberId are required" },
      { status: 400 }
    );
  }

  try {
    const card = await db.rFIDCard.create({
      data: {
        uid: body.uid,
        memberId: body.memberId,
        cardType: body.cardType || "MEMBER",
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      include: {
        member: {
          select: { fullName: true, memberNumber: true },
        },
      },
    });
    return NextResponse.json(card);
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "UID sudah terdaftar untuk kartu lain" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Gagal mendaftarkan kartu" }, { status: 500 });
  }
}
