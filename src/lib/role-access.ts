/**
 * Sumber tunggal aturan akses & kemampuan dashboard per role.
 *
 * Guru dan siswa sama-sama anggota, tapi aturannya beda:
 * - kuota/denda/perpanjangan (lihat LOAN_RULES)
 * - menu & widget dashboard
 * - data yang boleh dilihat (statistik sekolah, literasi, usulan orang lain)
 */

export type MemberDashboardVariant = "teacher" | "student";

function isStaff(role: string | undefined | null): boolean {
  return role === "LIBRARIAN" || role === "PUSTAKAWAN_JUNIOR";
}

/** View key anggota — string literal agar file ini tidak bergantung ke Zustand client store. */
export const MEMBER_VIEW_KEYS = [
  "my-dashboard",
  "catalog",
  "my-loans",
  "reading-history",
  "rooms",
  "proposals",
  "wishlist",
  "my-card",
  "my-profile",
  "my-sessions",
  "announcements",
  "notifications",
  "settings",
] as const;

export type MemberViewKey = (typeof MEMBER_VIEW_KEYS)[number];

/** Menu guru: fokus referensi mengajar + usulan pengadaan. */
export const TEACHER_NAV_KEYS: readonly MemberViewKey[] = [
  "my-dashboard",
  "catalog",
  "my-loans",
  "reading-history",
  "rooms",
  "proposals",
  "wishlist",
  "my-card",
  "my-profile",
  "my-sessions",
  "announcements",
  "notifications",
  "settings",
];

/** Menu siswa: fokus pinjam, baca, gamifikasi. Usulan tetap ada (self-service). */
export const STUDENT_NAV_KEYS: readonly MemberViewKey[] = [
  "my-dashboard",
  "catalog",
  "my-loans",
  "reading-history",
  "rooms",
  "proposals",
  "wishlist",
  "my-card",
  "my-profile",
  "my-sessions",
  "announcements",
  "notifications",
];

/** Grup sidebar anggota — harus mencakup semua kunci di TEACHER_NAV_KEYS. */
export const MEMBER_NAV_GROUPS: readonly { label: string; keys: readonly MemberViewKey[] }[] = [
  { label: "Baca", keys: ["my-dashboard", "catalog", "wishlist", "reading-history"] },
  { label: "Pinjaman", keys: ["my-loans", "rooms", "proposals"] },
  { label: "Akun", keys: ["my-card", "my-profile", "my-sessions", "announcements", "notifications", "settings"] },
];

export function getDashboardVariant(
  role: string | undefined | null
): MemberDashboardVariant {
  return role === "TEACHER" ? "teacher" : "student";
}

export function getMemberNavKeys(role: string | undefined | null): readonly MemberViewKey[] {
  return role === "TEACHER" ? TEACHER_NAV_KEYS : STUDENT_NAV_KEYS;
}

/** Dashboard operasional pustakawan (/api/stats, sirkulasi, anggota). */
export function canAccessLibraryStats(role: string | undefined | null): boolean {
  return isStaff(role);
}

/** Semua usulan pengadaan — hanya staf perpustakaan. Anggota hanya milik sendiri. */
export function canAccessAllProposals(role: string | undefined | null): boolean {
  return isStaff(role);
}

/** Laporan literasi GLS: pustakawan + guru (pantau kelas). Siswa tidak. */
export function canAccessLiteracyReport(role: string | undefined | null): boolean {
  return isStaff(role) || role === "TEACHER";
}

/** Badge, target baca, leaderboard — khusus siswa. */
export function showsGamification(role: string | undefined | null): boolean {
  return role === "STUDENT";
}

/** Ringkasan kelas & siswa terlambat — khusus guru. */
export function showsClassOverview(role: string | undefined | null): boolean {
  return role === "TEACHER";
}

/** Rekomendasi personal + teman sekelas — khusus siswa. */
export function showsStudentDiscovery(role: string | undefined | null): boolean {
  return role === "STUDENT";
}

export function isTeacherRole(role: string | undefined | null): boolean {
  return role === "TEACHER";
}

export function isStudentRole(role: string | undefined | null): boolean {
  return role === "STUDENT";
}

export function isMemberRole(role: string | undefined | null): boolean {
  return role === "TEACHER" || role === "STUDENT";
}
