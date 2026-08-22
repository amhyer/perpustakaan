import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notification-service";

/**
 * PUT /api/asset-loans/[id]/return — kembalikan aset.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireLibrarian();
  if (error) return error;
  const { id } = await params;

  const loan = await db.assetLoan.findUnique({
    where: { id },
    include: { asset: true, member: { include: { user: true } } },
  });
  if (!loan) return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
  if (loan.status === "RETURNED") return NextResponse.json({ error: "Sudah dikembalikan" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const newCondition = body.condition as string | undefined;

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.assetLoan.update({
      where: { id },
      data: {
        returnDate: new Date(),
        status: "RETURNED",
        notes: body.notes || loan.notes,
      },
    });
    await tx.asset.update({
      where: { id: loan.assetId },
      data: {
        status: "AVAILABLE",
        condition: newCondition || loan.asset.condition,
      },
    });
    return u;
  });

  await notify({
    userId: loan.member.user.id,
    title: `Aset Dikembalikan: ${loan.asset.name}`,
    message: `"${loan.asset.name}" telah dikembalikan. Terima kasih!`,
    type: "INFO",
    relatedId: loan.id,
  });

  await logAudit(user!.id, "LOAN_RETURN", "AssetLoan", loan.id, `Kembalikan aset: ${loan.asset.name}`);

  return NextResponse.json(updated);
}
