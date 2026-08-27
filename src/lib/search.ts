/**
 * Pencarian teks untuk SQLite (Prisma `contains` case-sensitive).
 * Variasi huruf dibuat di sini supaya route tidak perlu raw SQL.
 */

export function searchCaseVariants(q: string): string[] {
  const t = q.trim();
  if (!t) return [];
  const titled = t.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return [...new Set([t, t.toLowerCase(), t.toUpperCase(), titled])];
}

/** Klausa OR Prisma `contains` untuk field teks bebas. */
export function textSearchOr(
  fields: readonly string[],
  q: string
): Record<string, { contains: string }>[] {
  return searchCaseVariants(q).flatMap((v) => fields.map((field) => ({ [field]: { contains: v } })));
}

const BOOK_SEARCH_FIELDS = ["title", "author", "publisher", "isbn", "subject"] as const;
const MEMBER_SEARCH_FIELDS = ["fullName", "memberNumber", "phone", "classGrade"] as const;

/** Klausa OR Prisma: judul/pengarang/penerbit/ISBN/subjek, beberapa kapitalisasi. */
export function bookSearchOr(q: string): Record<string, { contains: string }>[] {
  return textSearchOr(BOOK_SEARCH_FIELDS, q);
}

export function memberSearchOr(q: string): Record<string, { contains: string }>[] {
  return textSearchOr(MEMBER_SEARCH_FIELDS, q);
}
