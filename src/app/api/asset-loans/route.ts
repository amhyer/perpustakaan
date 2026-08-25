import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getLoanRule, computeDueDateWithHolidays } from "@/lib/loan-rules";
import { notify } from "@/lib/notification-service";

/**
 * GET /api/asset-loans — daftar peminjaman aset.
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const loans = await db.assetLoan.findMany({
      include: { asset: true, member: { select: { fullName: true, memberNumber: true } } },
      orderBy: { loanDate: "desc" },
      take: 200,
    });
    return NextResponse.json(loans);
  } catch (err) {
    console.error("GET asset-loans error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/asset-loans — pinjam aset.
 * Body: { assetId, memberId, dueDate?, notes? }
 */
export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;
  try {
    const body = await req.json();
    if (!body.assetId || !body.memberId) {
      return NextResponse.json({ error: "assetId dan memberId wajib diisi" }, { status: 400 });
    }

    const asset = await db.asset.findUnique({ where: { id: body.assetId } });
    if (!asset) return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
    if (asset.status !== "AVAILABLE") {
      return NextResponse.json({ error: `Aset tidak tersedia (status: ${asset.status})` }, { status: 400 });
    }

    const member = await db.member.findUnique({ where: { id: body.memberId }, include: { user: true } });
    if (!member) return NextResponse.json({ error: "Member tidak ditemukan" }, { status: 404 });

    // DueDate: pakai rule anggota atau dari body
    let dueDate: Date;
    if (body.dueDate) {
      dueDate = new Date(body.dueDate);
    } else {
      const rule = await getLoanRule(member.category);
      const base = new Date();
      const { dueDate: computed } = await computeDueDateWithHolidays(base, member.category);
      dueDate = computed;
    }

    const loan = await db.$transaction(async (tx) => {
      const created = await tx.assetLoan.create({
        data: {
          assetId: body.assetId,
          memberId: body.memberId,
          loanDate: new Date(),
          dueDate,
          status: "LOANED",
          notes: body.notes || null,
        },
      });
      await tx.asset.update({ where: { id: body.assetId }, data: { status: "BORROWED" } });
      return created;
    });

    await notify({
      userId: member.user.id,
      title: `Aset Dipinjam: ${asset.name}`,
      message: `Anda meminjam "${asset.name}". Jatuh tempo: ${dueDate.toLocaleDateString("id-ID")}.`,
      type: "INFO",
      relatedId: loan.id,
    });

    await logAudit(user!.id, "LOAN_CREATE", "AssetLoan", loan.id, `Pinjam aset: ${asset.name} untuk ${member.fullName}`);

    return NextResponse.json(loan, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal" }, { status: 500 });
  }
}
