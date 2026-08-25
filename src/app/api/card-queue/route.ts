import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const queue = await db.cardPrintQueue.findMany({
      include: {
        member: {
          select: { fullName: true, memberNumber: true, category: true, phone: true },
        },
      },
      orderBy: [{ queueNumber: "desc" }],
    });

    return NextResponse.json(queue);
  } catch (err) {
    console.error("GET card-queue error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();

    // If memberId not provided, use current user's member
    let memberId = body.memberId;
    if (!memberId) {
      const fullUser = await db.user.findUnique({
        where: { id: user!.id },
        include: { member: true },
      });
      if (!fullUser?.member) {
        return NextResponse.json({ error: "Akun ini tidak terkait dengan data anggota" }, { status: 400 });
      }
      memberId = fullUser.member.id;
    }

    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    }

    // Check for existing active queue entry
    const existing = await db.cardPrintQueue.findFirst({
      where: {
        memberId,
        status: { in: ["QUEUED", "PRINTING"] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Anggota sudah memiliki antrian aktif" }, { status: 409 });
    }

    // Generate queue number atomically inside transaction
    const entry = await db.$transaction(async (tx) => {
      const lastQueue = await tx.cardPrintQueue.findFirst({
        orderBy: { queueNumber: "desc" },
        select: { queueNumber: true },
      });
      const queueNumber = (lastQueue?.queueNumber ?? 0) + 1;

      return tx.cardPrintQueue.create({
        data: {
          memberId,
          cardType: body.cardType || "MEMBER",
          queueNumber,
          notes: body.notes || null,
        },
        include: {
          member: {
            select: { fullName: true, memberNumber: true, category: true, phone: true },
          },
        },
      });
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("POST card-queue error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
