/**
 * Kelas yang diajar guru disimpan di Member.taughtClasses
 * sebagai daftar dipisah koma: "IX-A, VIII-B".
 */

export function parseTaughtClasses(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(/[,;|\n]+/)) {
    const trimmed = part.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function serializeTaughtClasses(value: string | string[] | null | undefined): string {
  const list = Array.isArray(value) ? parseTaughtClasses(value.join(",")) : parseTaughtClasses(value);
  return list.join(", ");
}

export function readTaughtClasses(member: { taughtClasses?: string | null } | null | undefined): string[] {
  return parseTaughtClasses(member?.taughtClasses);
}

export function studentInTaughtClasses(
  studentClass: string | null | undefined,
  taught: string[]
): boolean {
  if (!studentClass || taught.length === 0) return false;
  const key = studentClass.trim().toLowerCase();
  return taught.some((c) => c.trim().toLowerCase() === key);
}

/**
 * Nilai classGrade yang mungkin tersimpan di DB untuk satu kelas ajar.
 * SQLite `in` case-sensitive — guru "IX-A" harus tetap melihat siswa "ix-a".
 */
export function classGradeMatchValues(taught: string[]): string[] {
  const out = new Set<string>();
  for (const raw of taught) {
    const t = raw.trim();
    if (!t) continue;
    const compact = t.replace(/\s+/g, "");
    for (const v of [t, t.toLowerCase(), t.toUpperCase(), compact, compact.toLowerCase(), compact.toUpperCase()]) {
      out.add(v);
    }
    const m = compact.match(/^([ivxIVX0-9]+)[-–—]?([a-zA-Z0-9]+)$/);
    if (m) {
      out.add(`${m[1].toUpperCase()}-${m[2].toUpperCase()}`);
      out.add(`${m[1].toUpperCase()}-${m[2]}`);
      out.add(`${m[1].toLowerCase()}-${m[2].toLowerCase()}`);
    }
  }
  return [...out];
}

/** Filter Prisma: tanpa kelas ajar → tidak ada siswa. */
export function studentClassScope(taught: string[]): { classGrade: { in: string[] } } | { id: { in: string[] } } {
  if (taught.length === 0) return { id: { in: [] } };
  return { classGrade: { in: classGradeMatchValues(taught) } };
}

/** Intersect filter kelas laporan dengan kelas yang boleh dilihat guru. */
export function resolveTeacherClassFilter(taught: string[], requested: string): string[] {
  if (taught.length === 0) return [];
  const want = requested.trim();
  if (!want) return taught;
  const match = taught.find((c) => c.toLowerCase() === want.toLowerCase());
  return match ? [match] : [];
}
