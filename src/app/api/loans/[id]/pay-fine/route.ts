import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";

// PUT /api/loans/[id]/pay-fine — bayar denda (full atau partial)
// Body: { amount?: number } — jika amount tidak diisi, bayar lunas
export async function PUT(
  req: Request,
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

    let body: { amount?: number } = {};
    try { body = await req.json(); } catch (e) { console.error("[loans-pay-fine] Gagal parse body:", e); }

    const remaining = loan.fineAmount - loan.finePaid;
    const payAmount = body.amount && body.amount > 0 ? Math.min(body.amount, remaining) : remaining;
    const newFinePaid = loan.finePaid + payAmount;

    const updated = await db.loan.update({
      where: { id },
      data: { finePaid: newFinePaid },
    });

    return NextResponse.json({
      success: true,
      fineAmount: updated.fineAmount,
      finePaid: updated.finePaid,
      paidAmount: payAmount,
      fullyPaid: newFinePaid >= updated.fineAmount,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memproses pembayaran denda" }, { status: 500 });
  }
}
