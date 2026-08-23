/**
 * Reading Level System — Tiered progression for student readers.
 *
 * Sprint M - Tier 1 #2: Gamification lanjutan.
 *
 * Levels:
 * - Pemula (1-4 books) 🌱
 * - Pembaca (5-14 books) 📖
 * - Kutu Buku (15-49 books) 📚
 * - Kolektor (50-99 books) 🏆
 * - Penjelajah (100-199 books) 🗺️
 * - Maestro (200-499 books) 🎓
 * - Legenda (500+ books) 👑
 *
 * Each level has:
 * - Color theme
 * - Icon
 * - Perks (point multiplier, special features)
 * - Progress to next level
 *
 * Pure logic, no external deps. Computed on-request from loan history.
 */

import { db } from "@/lib/db";

// ===== Level Definitions =====

export interface ReadingLevel {
  id: string;
  name: string;
  minBooks: number;
  maxBooks: number | null; // null = infinity
  icon: string; // lucide icon name
  color: string; // tailwind color
  bgClass: string;
  textClass: string;
  borderClass: string;
  emoji: string;
  description: string;
  /** Point multiplier (1.0 = normal, 1.5 = +50% bonus) */
  pointMultiplier: number;
  /** Special perks unlocked at this level */
  perks: string[];
}

export const READING_LEVELS: ReadingLevel[] = [
  {
    id: "pemula",
    name: "Pemula",
    minBooks: 0,
    maxBooks: 4,
    icon: "Sprout",
    color: "gray",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    borderClass: "border-gray-300",
    emoji: "🌱",
    description: "Memulai perjalanan membaca",
    pointMultiplier: 1.0,
    perks: ["Akses katalog dasar"],
  },
  {
    id: "pembaca",
    name: "Pembaca",
    minBooks: 5,
    maxBooks: 14,
    icon: "BookOpen",
    color: "blue",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-300",
    emoji: "📖",
    description: "Sudah terbiasa membaca",
    pointMultiplier: 1.1,
    perks: ["+10% poin", "Pinjam 3 buku sekaligus"],
  },
  {
    id: "kutu-buku",
    name: "Kutu Buku",
    minBooks: 15,
    maxBooks: 49,
    icon: "BookMarked",
    color: "emerald",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-300",
    emoji: "📚",
    description: "Hampir tidak bisa lepas dari buku",
    pointMultiplier: 1.2,
    perks: ["+20% poin", "Pinjam 5 buku", "Akses e-book"],
  },
  {
    id: "kolektor",
    name: "Kolektor",
    minBooks: 50,
    maxBooks: 99,
    icon: "Library",
    color: "violet",
    bgClass: "bg-violet-50",
    textClass: "text-violet-700",
    borderClass: "border-violet-300",
    emoji: "🏆",
    description: "Koleksi bacaan yang mengagumkan",
    pointMultiplier: 1.35,
    perks: ["+35% poin", "Pinjam 7 buku", "Reservasi prioritas"],
  },
  {
    id: "penjelajah",
    name: "Penjelajah",
    minBooks: 100,
    maxBooks: 199,
    icon: "Compass",
    color: "amber",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-300",
    emoji: "🗺️",
    description: "Menjelajah berbagai genre & topik",
    pointMultiplier: 1.5,
    perks: ["+50% poin", "Pinjam 10 buku", "Rekomendasi personal"],
  },
  {
    id: "maestro",
    name: "Maestro",
    minBooks: 200,
    maxBooks: 499,
    icon: "GraduationCap",
    color: "rose",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
    borderClass: "border-rose-300",
    emoji: "🎓",
    description: "Tingkat master dalam membaca",
    pointMultiplier: 1.75,
    perks: ["+75% poin", "Pinjam 15 buku", "Akses VIP ruang baca"],
  },
  {
    id: "legenda",
    name: "Legenda",
    minBooks: 500,
    maxBooks: null,
    icon: "Crown",
    color: "yellow",
    bgClass: "bg-yellow-50",
    textClass: "text-yellow-700",
    borderClass: "border-yellow-400",
    emoji: "👑",
    description: "Legenda perpustakaan sekolah",
    pointMultiplier: 2.0,
    perks: ["+100% poin (DOUBLE!)", "Pinjam 20 buku", "Sertifikat digital", "Nama terpampang"],
  },
];

// ===== Pure Functions =====

/**
 * Determine reading level from total books read.
 */
export function getLevelFromBooks(booksRead: number): ReadingLevel {
  // Iterate from highest to lowest to find match
  for (let i = READING_LEVELS.length - 1; i >= 0; i--) {
    const level = READING_LEVELS[i];
    if (booksRead >= level.minBooks) {
      return level;
    }
  }
  return READING_LEVELS[0]; // fallback to Pemula
}

/**
 * Get next level info (for progress display).
 */
export function getNextLevel(currentLevelId: string): ReadingLevel | null {
  const idx = READING_LEVELS.findIndex((l) => l.id === currentLevelId);
  if (idx === -1 || idx === READING_LEVELS.length - 1) return null;
  return READING_LEVELS[idx + 1];
}

/**
 * Calculate progress to next level (0-100%).
 */
export function getLevelProgress(booksRead: number): {
  current: ReadingLevel;
  next: ReadingLevel | null;
  progressPercent: number;
  booksToNext: number | null;
} {
  const current = getLevelFromBooks(booksRead);
  const next = getNextLevel(current.id);

  if (!next) {
    return {
      current,
      next: null,
      progressPercent: 100,
      booksToNext: null,
    };
  }

  const span = next.minBooks - current.minBooks;
  const progress = booksRead - current.minBooks;
  const percent = Math.min(100, Math.round((progress / span) * 100));
  const remaining = Math.max(0, next.minBooks - booksRead);

  return {
    current,
    next,
    progressPercent: percent,
    booksToNext: remaining,
  };
}

/**
 * Calculate max books per loan based on level.
 */
export function getMaxBooksForLevel(level: ReadingLevel): number {
  // Extract max from perks, fallback to 3
  const perkMatch = level.perks.find((p) => p.includes("Pinjam"));
  if (!perkMatch) return 3;
  const numMatch = perkMatch.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1], 10) : 3;
}

/**
 * Get point multiplier for a level.
 */
export function getPointMultiplier(level: ReadingLevel): number {
  return level.pointMultiplier;
}

// ===== Database Operations =====

/**
 * Compute reading level + progress for a member (from DB).
 */
export async function computeReadingLevel(memberId: string): Promise<{
  booksRead: number;
  level: ReadingLevel;
  next: ReadingLevel | null;
  progressPercent: number;
  booksToNext: number | null;
  rank: number | null; // rank among all members
  rankInClass: number | null;
  classGrade: string | null;
}> {
  // Count returned loans
  const booksRead = await db.loan.count({
    where: { memberId, status: "RETURNED" },
  });

  // Get member info for class
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { classGrade: true },
  });

  // Calculate level
  const levelInfo = getLevelProgress(booksRead);

  // Get rank (overall) — sort by count desc for correct rank
  const allCounts = await db.loan.groupBy({
    by: ["memberId"],
    where: { status: "RETURNED" },
    _count: { _all: true },
  });
  const sortedCounts = [...allCounts]
    .map((c) => ({ memberId: c.memberId, count: c._count?._all ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const overallIdx = sortedCounts.findIndex((c) => c.memberId === memberId);
  const overallRank = overallIdx >= 0 ? overallIdx + 1 : null;

  // Get rank in class
  let classRank: number | null = null;
  if (member?.classGrade) {
    const classMembers = await db.member.findMany({
      where: { classGrade: member.classGrade },
      select: { id: true },
    });
    const classMemberIds = new Set(classMembers.map((m) => m.id));
    // Filter to only class members, then sort by count desc
    const classCounts = allCounts
      .filter((c) => classMemberIds.has(c.memberId))
      .map((c) => ({ memberId: c.memberId, count: c._count?._all ?? 0 }))
      .sort((a, b) => b.count - a.count);
    const idx = classCounts.findIndex((c) => c.memberId === memberId);
    classRank = idx >= 0 ? idx + 1 : null;
  }

  return {
    booksRead,
    level: levelInfo.current,
    next: levelInfo.next,
    progressPercent: levelInfo.progressPercent,
    booksToNext: levelInfo.booksToNext,
    rank: overallRank,
    rankInClass: classRank,
    classGrade: member?.classGrade ?? null,
  };
}

/**
 * Get all level definitions (for UI display).
 */
export function getAllLevels(): ReadingLevel[] {
  return READING_LEVELS;
}
