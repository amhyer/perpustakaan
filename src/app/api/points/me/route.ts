import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getBalance } from "@/lib/points-engine";
import { calculateStreak, getStreakHistory } from "@/lib/streak-detector";

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
 * - streakHistory: data 30 hari terakhir untuk grafik
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

  // Real streak calculation
  const currentStreak = await calculateStreak(memberId);

  // Streak history (30 hari terakhir)
  const streakHistory = await getStreakHistory(memberId, 30);

  return NextResponse.json({
    balance,
    totalEarned: totalEarned._sum.amount || 0,
    totalRedeemed: totalRedeemed._sum.amount || 0,
    booksRead,
    currentStreak,
    streakHistory,
    lastEarn,
  });
}
