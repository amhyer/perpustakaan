export const READING_LIST_KEY_PREFIX = "reading_list:";

export interface ReadingListItemInput {
  bookId: string;
  note?: string | null;
}

export interface ReadingListPayload {
  classGrades: string[];
  items: ReadingListItemInput[];
  updatedAt: string;
}

export function readingListSettingKey(memberId: string): string {
  return `${READING_LIST_KEY_PREFIX}${memberId}`;
}

export function parseReadingList(raw: string | null | undefined): ReadingListPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<ReadingListPayload>;
    const classGrades = Array.isArray(data.classGrades)
      ? data.classGrades.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const items = Array.isArray(data.items)
      ? data.items
          .map((it) => ({
            bookId: String((it as ReadingListItemInput).bookId || "").trim(),
            note: (it as ReadingListItemInput).note?.trim() || null,
          }))
          .filter((it) => it.bookId)
      : [];
    if (classGrades.length === 0 || items.length === 0) return null;
    return {
      classGrades,
      items: items.slice(0, 12),
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeReadingList(list: Omit<ReadingListPayload, "updatedAt">): string {
  return JSON.stringify({
    classGrades: list.classGrades,
    items: list.items.slice(0, 12),
    updatedAt: new Date().toISOString(),
  } satisfies ReadingListPayload);
}

export function listTargetsClass(list: ReadingListPayload, classGrade: string | null | undefined): boolean {
  if (!classGrade) return false;
  const key = classGrade.trim().toLowerCase();
  return list.classGrades.some((c) => c.trim().toLowerCase() === key);
}
