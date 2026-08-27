/**
 * Builder murni untuk data dashboard guru/siswa.
 * Dipakai API /api/dashboard/member dan diuji tanpa database.
 */

import { formatRupiah } from "@/lib/constants";

export interface LoanRuleSnapshot {
  maxBooks: number;
  loanDays: number;
  finePerDay: number;
  maxRenewals: number;
}

export interface ClassActivityRow {
  classGrade: string;
  studentCount: number;
  activeLoans: number;
  overdueLoans: number;
  booksReadThisYear: number;
}

export interface ClassmateRow {
  id: string;
  fullName: string;
  memberNumber: string;
  loanCount: number;
  rank: number;
}

export interface StudentLoanInput {
  classGrade: string | null;
  activeLoanCount: number;
  overdueLoanCount: number;
  returnedThisYearCount: number;
}

export interface ClassmateInput {
  id: string;
  fullName: string;
  memberNumber: string;
  loanCount: number;
}

/** Agregasi aktivitas literasi per kelas untuk dashboard guru. */
export function buildClassActivity(students: StudentLoanInput[]): ClassActivityRow[] {
  const map = new Map<string, ClassActivityRow>();
  for (const s of students) {
    const key = s.classGrade?.trim() || "Tanpa Kelas";
    const existing = map.get(key) ?? {
      classGrade: key,
      studentCount: 0,
      activeLoans: 0,
      overdueLoans: 0,
      booksReadThisYear: 0,
    };
    existing.studentCount += 1;
    existing.activeLoans += s.activeLoanCount;
    existing.overdueLoans += s.overdueLoanCount;
    existing.booksReadThisYear += s.returnedThisYearCount;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.classGrade.localeCompare(b.classGrade, "id")
  );
}

/** Leaderboard teman sekelas — tanpa data diri di luar nama/nomor/jumlah pinjam. */
export function buildClassmateRows(
  classmates: ClassmateInput[],
  currentMemberId: string,
  limit = 8
): ClassmateRow[] {
  return classmates
    .filter((c) => c.id !== currentMemberId)
    .sort((a, b) => {
      if (b.loanCount !== a.loanCount) return b.loanCount - a.loanCount;
      return a.fullName.localeCompare(b.fullName, "id");
    })
    .slice(0, limit)
    .map((c, i) => ({
      id: c.id,
      fullName: c.fullName,
      memberNumber: c.memberNumber,
      loanCount: c.loanCount,
      rank: i + 1,
    }));
}

export function describeLoanRules(rule: LoanRuleSnapshot): LoanRuleSnapshot & { summary: string } {
  const fine =
    rule.finePerDay === 0 ? "tanpa denda" : `denda ${formatRupiah(rule.finePerDay)}/hari`;
  return {
    ...rule,
    summary: `Maks. ${rule.maxBooks} buku · ${rule.loanDays} hari · ${fine} · ${rule.maxRenewals}× perpanjang`,
  };
}

const DAY_MS = 86_400_000;

export function latestActivityAt(
  loans: { loanDate: Date | string; returnDate?: Date | string | null }[]
): Date | null {
  let max: Date | null = null;
  for (const loan of loans) {
    const dates = [loan.loanDate, loan.returnDate].filter(Boolean) as (Date | string)[];
    for (const raw of dates) {
      const d = raw instanceof Date ? raw : new Date(raw);
      if (!max || d > max) max = d;
    }
  }
  return max;
}

export function daysSinceActivity(lastActivity: Date | string | null | undefined, now: Date): number | null {
  if (!lastActivity) return null;
  const d = lastActivity instanceof Date ? lastActivity : new Date(lastActivity);
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / DAY_MS));
}

export function isSilentStudent(
  lastActivity: Date | string | null | undefined,
  now: Date,
  silentDays = 30
): boolean {
  if (!lastActivity) return true;
  const days = daysSinceActivity(lastActivity, now);
  return days === null || days >= silentDays;
}

export interface PulseStudentInput {
  classGrade: string | null;
  activeLoanCount: number;
  overdueLoanCount: number;
  lastActivityAt: Date | string | null;
  loanThisMonth: boolean;
}

export interface ClassPulseRow {
  classGrade: string;
  studentCount: number;
  readingCount: number;
  overdueStudentCount: number;
  silentCount: number;
  noLoanThisMonthCount: number;
}

/** Satu angka kesehatan kelas: sedang baca, terlambat, diam 30 hari. */
export function buildClassPulse(students: PulseStudentInput[], now = new Date()): ClassPulseRow[] {
  const map = new Map<string, ClassPulseRow>();
  for (const s of students) {
    const key = s.classGrade?.trim() || "Tanpa Kelas";
    const existing = map.get(key) ?? {
      classGrade: key,
      studentCount: 0,
      readingCount: 0,
      overdueStudentCount: 0,
      silentCount: 0,
      noLoanThisMonthCount: 0,
    };
    existing.studentCount += 1;
    if (s.activeLoanCount > 0) existing.readingCount += 1;
    if (s.overdueLoanCount > 0) existing.overdueStudentCount += 1;
    if (isSilentStudent(s.lastActivityAt, now)) existing.silentCount += 1;
    if (!s.loanThisMonth) existing.noLoanThisMonthCount += 1;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.classGrade.localeCompare(b.classGrade, "id"));
}

export function summarizePulse(rows: ClassPulseRow[]): ClassPulseRow {
  return rows.reduce(
    (acc, row) => ({
      classGrade: acc.studentCount === 0 ? row.classGrade : "Semua kelas",
      studentCount: acc.studentCount + row.studentCount,
      readingCount: acc.readingCount + row.readingCount,
      overdueStudentCount: acc.overdueStudentCount + row.overdueStudentCount,
      silentCount: acc.silentCount + row.silentCount,
      noLoanThisMonthCount: acc.noLoanThisMonthCount + row.noLoanThisMonthCount,
    }),
    {
      classGrade: "Semua kelas",
      studentCount: 0,
      readingCount: 0,
      overdueStudentCount: 0,
      silentCount: 0,
      noLoanThisMonthCount: 0,
    }
  );
}

export function describePulse(row: ClassPulseRow): string {
  if (row.studentCount === 0) return "Belum ada siswa di kelas yang Anda ajar.";
  return `${row.readingCount} dari ${row.studentCount} siswa sedang membaca · ${row.overdueStudentCount} terlambat · ${row.silentCount} diam 30 hari`;
}

export interface SilentStudentInput {
  id: string;
  fullName: string;
  memberNumber: string;
  classGrade: string | null;
  lastActivityAt: Date | string | null;
}

export interface SilentStudentRow {
  id: string;
  fullName: string;
  memberNumber: string;
  classGrade: string | null;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
}

export function buildSilentStudents(
  students: SilentStudentInput[],
  now = new Date(),
  silentDays = 30,
  limit = 8
): SilentStudentRow[] {
  return students
    .filter((s) => isSilentStudent(s.lastActivityAt, now, silentDays))
    .map((s) => {
      const days = daysSinceActivity(s.lastActivityAt, now);
      return {
        id: s.id,
        fullName: s.fullName,
        memberNumber: s.memberNumber,
        classGrade: s.classGrade,
        lastActivityAt: s.lastActivityAt
          ? (s.lastActivityAt instanceof Date ? s.lastActivityAt : new Date(s.lastActivityAt)).toISOString()
          : null,
        daysSinceActivity: days,
      };
    })
    .sort((a, b) => {
      const da = a.daysSinceActivity ?? Number.POSITIVE_INFINITY;
      const db = b.daysSinceActivity ?? Number.POSITIVE_INFINITY;
      if (db !== da) return db - da;
      return a.fullName.localeCompare(b.fullName, "id");
    })
    .slice(0, limit);
}

export interface ClassRankRow {
  id: string;
  fullName: string;
  memberNumber: string;
  loanCount: number;
  rank: number;
  isMe: boolean;
}

export interface ClassRanking {
  myRank: number | null;
  classSize: number;
  myLoanCount: number;
  rows: ClassRankRow[];
}

/** Ranking sekelas termasuk diri sendiri. Selalu tampilkan 'saya' meski di luar top N. */
export function buildClassRanking(
  classmates: ClassmateInput[],
  currentMemberId: string,
  limit = 8
): ClassRanking {
  const sorted = [...classmates].sort((a, b) => {
    if (b.loanCount !== a.loanCount) return b.loanCount - a.loanCount;
    return a.fullName.localeCompare(b.fullName, "id");
  });
  const ranked: ClassRankRow[] = sorted.map((c, i) => ({
    id: c.id,
    fullName: c.fullName,
    memberNumber: c.memberNumber,
    loanCount: c.loanCount,
    rank: i + 1,
    isMe: c.id === currentMemberId,
  }));
  const me = ranked.find((r) => r.isMe);
  const top = ranked.slice(0, limit);
  if (me && !top.some((r) => r.isMe)) {
    top.pop();
    top.push(me);
  }
  return {
    myRank: me?.rank ?? null,
    classSize: classmates.length,
    myLoanCount: me?.loanCount ?? 0,
    rows: top,
  };
}

export type TodayFocusKind = "overdue" | "due-soon" | "ready" | "reading" | "discover" | "idle";

export interface TodayFocus {
  kind: TodayFocusKind;
  title: string;
  detail: string;
  actionLabel: string;
  actionView: "my-loans" | "catalog" | "book-detail";
  actionParams?: Record<string, string>;
}

/** Satu kartu tindakan untuk beranda siswa — prioritas: terlambat → hampir tempo → siap ambil → sedang baca → rekomendasi. */
export function buildTodayFocus(input: {
  overdue?: { title: string; daysLate: number; bookId: string } | null;
  dueSoon?: { title: string; daysLeft: number; bookId: string } | null;
  ready?: { title: string; expiresLabel?: string | null; bookId: string } | null;
  reading?: { title: string; daysLeft: number; bookId: string } | null;
  recommend?: { title: string; bookId: string } | null;
}): TodayFocus {
  if (input.overdue) {
    return {
      kind: "overdue",
      title: "Segera kembalikan",
      detail: `"${input.overdue.title}" terlambat ${input.overdue.daysLate} hari.`,
      actionLabel: "Lihat Pinjaman",
      actionView: "my-loans",
    };
  }
  if (input.dueSoon) {
    const when =
      input.dueSoon.daysLeft === 0 ? "hari ini" : `dalam ${input.dueSoon.daysLeft} hari`;
    return {
      kind: "due-soon",
      title: "Hampir jatuh tempo",
      detail: `"${input.dueSoon.title}" jatuh tempo ${when}. Perpanjang kalau masih dibaca.`,
      actionLabel: "Perpanjang",
      actionView: "my-loans",
    };
  }
  if (input.ready) {
    return {
      kind: "ready",
      title: "Reservasi siap diambil",
      detail: input.ready.expiresLabel
        ? `"${input.ready.title}" siap. Ambil sebelum ${input.ready.expiresLabel}.`
        : `"${input.ready.title}" sudah siap diambil di perpustakaan.`,
      actionLabel: "Lihat Buku",
      actionView: "book-detail",
      actionParams: { id: input.ready.bookId },
    };
  }
  if (input.reading) {
    return {
      kind: "reading",
      title: "Lanjut baca",
      detail: `"${input.reading.title}" masih ${input.reading.daysLeft} hari lagi. Semangat!`,
      actionLabel: "Buka Buku",
      actionView: "book-detail",
      actionParams: { id: input.reading.bookId },
    };
  }
  if (input.recommend) {
    return {
      kind: "discover",
      title: "Belum pinjam minggu ini",
      detail: `Coba "${input.recommend.title}" — cocok dari riwayat bacamu.`,
      actionLabel: "Lihat Rekomendasi",
      actionView: "book-detail",
      actionParams: { id: input.recommend.bookId },
    };
  }
  return {
    kind: "idle",
    title: "Yuk, mulai baca",
    detail: "Belum ada pinjaman aktif. Pilih satu buku dari katalog hari ini.",
    actionLabel: "Buka Katalog",
    actionView: "catalog",
  };
}
