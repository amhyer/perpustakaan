import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getBalance } from "@/lib/points-engine";

/**
 * GET /api/points/me — Saldo & statistik poin member yang sedang login.
 *
 * Returns:
 * - balance: poin aktif saat ini
 * - totalEarned: total poin yang pernah masuk (sepanjang masa)
 * - totalRedeemed: total poin yang pernah ditukar
 * - booksRead: jumlah buku yang selesai dibaca tahun ini
 * - currentStreak: streak aktif (hari berturut-turut baca)
 * - lastEarn: transaksi terakhir
 */
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member yang punya poin" }, { status: 403 });
  }

  const memberId = user.member.id;

  // Saldo
  const balance = await getBalance(memberId);

  // Total earned
  const totalEarned = await db.pointTransaction.aggregate({
    where: { memberId, type: "EARN" },
    _sum: { amount: true },
  });

  // Total redeemed
  const totalRedeemed = await db.pointTransaction.aggregate({
    where: { memberId, type: "REDEEM" },
    _sum: { amount: true },
  });

  // Buku selesai tahun ini
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const booksRead = await db.loan.count({
    where: {
      memberId,
      status: "RETURNED",
      returnDate: { gte: yearStart },
    },
  });

  // Transaksi terakhir
  const lastEarn = await db.pointTransaction.findFirst({
    where: { memberId, type: "EARN" },
    orderBy: { createdAt: "desc" },
    select: { amount: true, description: true, createdAt: true },
  });

  // Streak (jumlah hari berturut-turut dengan transaksi EARN)
  // Simplified: hitung unique days dalam 7 hari terakhir
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentDays = await db.pointTransaction.findMany({
    where: {
      memberId,
      type: "EARN",
      createdAt: { gte: sevenDaysAgo },
    },
    select: { createdAt: true },
  });
  const uniqueDays = new Set(
    recentDays.map((t) => t.createdAt.toISOString().split("T")[0])
  ).size;
  const currentStreak = uniqueDays;

  return NextResponse.json({
    balance,
    totalEarned: totalEarned._sum.amount || 0,
    totalRedeemed: totalRedeemed._sum.amount || 0,
    booksRead,
    currentStreak,
    lastEarn,
  });
}
