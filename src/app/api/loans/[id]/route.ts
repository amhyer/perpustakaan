import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { LOAN_RULES, calculateFine, formatDate } from "@/lib/constants";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const loan = await db.loan.findUnique({
    where: { id },
    include: { member: true, bookItem: { include: { book: true } } },
  });
  if (!loan) return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
  return NextResponse.json(loan);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "LIBRARIAN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const loan = await db.loan.findUnique({ where: { id } });
  if (!loan) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (loan.status === "RETURNED") return NextResponse.json({ error: "Sudah dikembalikan" }, { status: 400 });

  await db.bookItem.update({ where: { id: loan.bookItemId }, data: { status: "AVAILABLE" } });
  await db.loan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// Helper untuk update overdue & denda dinamis (dipakai bersama)
export async function refreshLoanStatus() {
  const now = new Date();
  const overdueLoans = await db.loan.findMany({
    where: { status: "LOANED", dueDate: { lt: now } },
    include: { member: true },
  });
  for (const l of overdueLoans) {
    const rule = LOAN_RULES[l.member.category] ?? LOAN_RULES.STUDENT;
    const fine = calculateFine(l.dueDate, null, rule.finePerDay);
    await db.loan.update({ where: { id: l.id }, data: { status: "OVERDUE", fineAmount: fine } });
  }
}

export { LOAN_RULES, calculateFine, formatDate };
