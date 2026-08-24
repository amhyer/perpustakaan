import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const loan = await db.interLibraryLoan.findUnique({ where: { id } });
  if (!loan) {
    return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
  }

  const isOwner = user!.member && loan.memberId === user!.member.id;
  const isLibrarian = user!.role === "LIBRARIAN" || user!.role === "PUSTAKAWAN_JUNIOR";

  if (!isOwner && !isLibrarian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusTransitions: Record<string, string[]> = {
    REQUESTED: ["APPROVED", "CANCELLED"],
    APPROVED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["RECEIVED"],
    RECEIVED: ["RETURNED"],
  };

  if (body.status) {
    const allowed = statusTransitions[loan.status] || [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Transisi dari ${loan.status} ke ${body.status} tidak diizinkan` },
        { status: 400 }
      );
    }

    if (["APPROVED", "SHIPPED"].includes(body.status) && !isLibrarian) {
      return NextResponse.json({ error: "Hanya pustakawan yang bisa mengubah status ini" }, { status: 403 });
    }
  }

  const updated = await db.interLibraryLoan.update({
    where: { id },
    data: {
      status: body.status || loan.status,
      dueDate: body.dueDate ? new Date(body.dueDate) : loan.dueDate,
      returnedAt: body.status === "RETURNED" ? new Date() : loan.returnedAt,
    },
    include: {
      fromSchool: true,
      toSchool: true,
    },
  });

  return NextResponse.json(updated);
}
