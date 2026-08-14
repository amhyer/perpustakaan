import { db } from "@/lib/db";

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string; // nama icon lucide
  earned: boolean;
  progress?: { current: number; target: number };
}

export interface GamificationResult {
  badges: Badge[];
  booksRead: number; // total RETURNED loans
  readingGoalTarget: number | null;
  readingGoalProgress: number; // booksRead this year
}

/**
 * Hitung semua badge gamifikasi untuk seorang member.
 * Semua dihitung ON-REQUEST dari data pinjaman, bukan disimpan.
 */
export async function computeBadges(memberId: string): Promise<GamificationResult> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { readingGoalTarget: true },
  });

  // Ambil semua loan RETURNED untuk member ini
  const returnedLoans = await db.loan.findMany({
    where: { memberId, status: "RETURNED" },
    include: {
      bookItem: { select: { book: { select: { categoryId: true } } } },
    },
    orderBy: { loanDate: "asc" },
  });

  const booksRead = returnedLoans.length;

  // Hitung kategori unik
  const categories = new Set<string>();
  returnedLoans.forEach((l) => {
    if (l.bookItem.book.categoryId) categories.add(l.bookItem.book.categoryId);
  });

  // Hitung peminjaman tepat waktu (returnDate <= dueDate)
  const onTimeLoans = returnedLoans.filter(
    (l) => l.returnDate && new Date(l.returnDate) <= new Date(l.dueDate)
  ).length;

  // Books read this year (untuk reading goal progress)
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const booksThisYear = returnedLoans.filter(
    (l) => new Date(l.loanDate) >= yearStart
  ).length;

  // Badge 1: Pembaca Pemula — 1 buku selesai
  const badge1: Badge = {
    id: "pemula",
    label: "Pembaca Pemula",
    description: "Selesaikan 1 peminjaman buku",
    icon: "BookOpen",
    earned: booksRead >= 1,
    progress: { current: booksRead, target: 1 },
  };

  // Badge 2: Kutu Buku — 10 buku
  const badge2: Badge = {
    id: "kutu-buku",
    label: "Kutu Buku",
    description: "Selesaikan 10 peminjaman buku",
    icon: "BookMarked",
    earned: booksRead >= 10,
    progress: { current: Math.min(booksRead, 10), target: 10 },
  };

  // Badge 3: Kutu Buku Sejati — 25 buku
  const badge3: Badge = {
    id: "kutu-buku-sejati",
    label: "Kutu Buku Sejati",
    description: "Selesaikan 25 peminjaman buku",
    icon: "Trophy",
    earned: booksRead >= 25,
    progress: { current: Math.min(booksRead, 25), target: 25 },
  };

  // Badge 4: Selalu Tepat Waktu — min 5 peminjaman, tidak pernah telat
  const neverLate = booksRead >= 5 && onTimeLoans === booksRead;
  const badge4: Badge = {
    id: "tepat-waktu",
    label: "Selalu Tepat Waktu",
    description: "Minimal 5 peminjaman, tidak pernah telat",
    icon: "Clock",
    earned: neverLate,
    progress: { current: Math.min(booksRead, 5), target: 5 },
  };

  // Badge 5: Penjelajah Kategori — pinjam dari 5 kategori berbeda
  const badge5: Badge = {
    id: "penjelajah",
    label: "Penjelajah Kategori",
    description: "Pinjam dari 5 kategori berbeda",
    icon: "Compass",
    earned: categories.size >= 5,
    progress: { current: Math.min(categories.size, 5), target: 5 },
  };

  return {
    badges: [badge1, badge2, badge3, badge4, badge5],
    booksRead,
    readingGoalTarget: member?.readingGoalTarget ?? null,
    readingGoalProgress: booksThisYear,
  };
}

/**
 * Leaderboard bulanan: top members berdasarkan jumlah peminjaman
 * di bulan berjalan.
 */
export async function getMonthlyLeaderboard(limit = 10) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const loans = await db.loan.findMany({
    where: {
      loanDate: { gte: monthStart, lt: monthEnd },
    },
    select: {
      memberId: true,
      member: { select: { id: true, fullName: true, memberNumber: true, category: true, photo: true } },
    },
  });

  // Group by member, count loans
  const memberMap = new Map<string, { member: typeof loans[0]["member"]; count: number }>();
  for (const l of loans) {
    const existing = memberMap.get(l.memberId);
    if (existing) {
      existing.count++;
    } else {
      memberMap.set(l.memberId, { member: l.member, count: 1 });
    }
  }

  // Sort by count desc, take top N
  const leaderboard = Array.from(memberMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry, idx) => ({
      rank: idx + 1,
      memberId: entry.member.id,
      fullName: entry.member.fullName,
      memberNumber: entry.member.memberNumber,
      category: entry.member.category,
      photo: entry.member.photo,
      loanCount: entry.count,
    }));

  return {
    month: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    leaderboard,
  };
}
