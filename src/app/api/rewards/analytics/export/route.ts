import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/rewards/analytics/export — Export analytics ke CSV.
 *
 * Query params:
 * - type: leaderboard | redemptions | transactions (default: leaderboard)
 * - from, to: filter date range (ISO date) — for transactions
 *
 * Returns: text/csv dengan header Content-Disposition: attachment
 *
 * Use case: Dilaporkan ke kepala sekolah sebagai lampiran rapat bulanan.
 */
export async function GET(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const searchParams = new URL(req.url).searchParams;
    const type = searchParams.get("type") || "leaderboard";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let csv = "";
    let filename = "";

    if (type === "leaderboard") {
      csv = await generateLeaderboardCSV();
      filename = `leaderboard-${new Date().toISOString().split("T")[0]}.csv`;
    } else if (type === "redemptions") {
      csv = await generateRedemptionsCSV(from, to);
      filename = `redemptions-${new Date().toISOString().split("T")[0]}.csv`;
    } else if (type === "transactions") {
      csv = await generateTransactionsCSV(from, to);
      filename = `point-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      return NextResponse.json({ error: "type tidak valid" }, { status: 400 });
    }

    logger.info("CSV export generated", { type, by: user!.id, rows: csv.split("\n").length - 1 });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET rewards/analytics/export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =========================================================================
// CSV GENERATORS
// =========================================================================

async function generateLeaderboardCSV(): Promise<string> {
  // Get all members dengan latest balance
  const allBalances = await db.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["memberId"],
    select: {
      memberId: true,
      balanceAfter: true,
      member: {
        select: {
          fullName: true,
          memberNumber: true,
          category: true,
          classGrade: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  const sorted = allBalances
    .sort((a, b) => b.balanceAfter - a.balanceAfter)
    .slice(0, 50);

  const rows = [
    ["Rank", "Nama", "No. Anggota", "Role", "Kelas/Mapel", "Email", "Saldo Poin"],
  ];

  sorted.forEach((entry, idx) => {
    rows.push([
      String(idx + 1),
      entry.member.fullName,
      entry.member.memberNumber,
      entry.member.category,
      entry.member.classGrade || "-",
      entry.member.user.email,
      String(entry.balanceAfter),
    ]);
  });

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

async function generateRedemptionsCSV(from: string | null, to: string | null): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const redemptions = await db.rewardRedemption.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      member: { select: { fullName: true, memberNumber: true, category: true } },
      approvedBy: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
  });

  const rows = [
    [
      "ID Klaim",
      "Tanggal",
      "Member",
      "No. Anggota",
      "Role",
      "Hadiah",
      "Kategori",
      "Poin",
      "Status",
      "Kode",
      "Disetujui Oleh",
      "Diambil Oleh",
      "Alasan Ditolak",
    ],
  ];

  redemptions.forEach((r) => {
    rows.push([
      r.id,
      r.createdAt.toISOString(),
      r.member.fullName,
      r.member.memberNumber,
      r.member.category,
      r.rewardName,
      r.rewardCategory,
      String(r.pointsSpent),
      r.status,
      r.pickupCode,
      r.approvedBy?.name || "-",
      r.deliveredBy?.name || "-",
      r.rejectionReason || "-",
    ]);
  });

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

async function generateTransactionsCSV(from: string | null, to: string | null): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const txns = await db.pointTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      member: { select: { fullName: true, memberNumber: true } },
      reward: { select: { name: true } },
    },
  });

  const rows = [
    [
      "Tanggal",
      "Member",
      "No. Anggota",
      "Tipe",
      "Sumber",
      "Deskripsi",
      "Jumlah",
      "Saldo Setelah",
      "Hadiah",
    ],
  ];

  txns.forEach((t) => {
    rows.push([
      t.createdAt.toISOString(),
      t.member.fullName,
      t.member.memberNumber,
      t.type,
      t.source || "-",
      t.description || "-",
      String(t.amount),
      String(t.balanceAfter),
      t.reward?.name || "-",
    ]);
  });

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape kalau ada comma, quote, atau newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
