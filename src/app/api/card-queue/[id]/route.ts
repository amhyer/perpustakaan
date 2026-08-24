import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const existing = await db.cardPrintQueue.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Antrian tidak ditemukan" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.status) {
    const validStatuses = ["QUEUED", "PRINTING", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }
    updateData.status = body.status;

    if (body.status === "PRINTING") {
      updateData.printedBy = user!.id;
    }
    if (body.status === "COMPLETED") {
      updateData.printedAt = new Date();
      updateData.printedBy = existing.printedBy || user!.id;
    }
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  const entry = await db.cardPrintQueue.update({
    where: { id },
    data: updateData,
    include: {
      member: {
        select: { fullName: true, memberNumber: true, category: true, phone: true },
      },
    },
  });

  return NextResponse.json(entry);
}
