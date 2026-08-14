import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";

// PUT /api/loans/[id]/pay-fine — tandai denda sebagai lunas
// Role: LIBRARIAN atau PUSTAKAWAN_JUNIOR (sesuai Tahap 15-F)
// Set finePaid = fineAmount pada loan tsb
export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { id } = await params;

  try {
    const loan = await db.loan.findUnique({ where: { id } });
    if (!loan) {
      return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
    }

    if (loan.fineAmount <= 0) {
      return NextResponse.json({ error: "Tidak ada denda untuk pinjaman ini" }, { status: 400 });
    }

    if (loan.finePaid >= loan.fineAmount) {
      return NextResponse.json({ error: "Denda sudah lunas" }, { status: 400 });
    }

    const updated = await db.loan.update({
      where: { id },
      data: { finePaid: loan.fineAmount },
    });

    return NextResponse.json({
      success: true,
      fineAmount: updated.fineAmount,
      finePaid: updated.finePaid,
    });
  } catch {
    return NextResponse.json({ error: "Gagal menandai denda lunas" }, { status: 500 });
  }
}
