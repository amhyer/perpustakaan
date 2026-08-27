import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ApiError } from "@/lib/response";
import { isMemberRole, isTeacherRole } from "@/lib/role-access";
import { readTaughtClasses } from "@/lib/taught-classes";
import { resolveCoverImage } from "@/lib/cover";
import {
  listTargetsClass,
  parseReadingList,
  readingListSettingKey,
  serializeReadingList,
} from "@/lib/reading-list";

const BOOK_SELECT = {
  id: true,
  title: true,
  author: true,
  isbn: true,
  coverColor: true,
  coverImage: true,
  synopsis: true,
  category: { select: { name: true } },
};

async function hydrateItems(items: { bookId: string; note?: string | null }[]) {
  const books = await db.book.findMany({
    where: { id: { in: items.map((i) => i.bookId) } },
    select: BOOK_SELECT,
  });
  const byId = new Map(books.map((b) => [b.id, b]));
  return items
    .map((item) => {
      const book = byId.get(item.bookId);
      if (!book) return null;
      return {
        note: item.note ?? null,
        book: { ...book, coverImage: resolveCoverImage(book) },
      };
    })
    .filter(Boolean);
}

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!isMemberRole(user!.role) || !user!.member) {
    return ApiError.forbidden("Daftar bacaan hanya untuk guru dan siswa.");
  }

  if (isTeacherRole(user!.role)) {
    const setting = await db.setting.findUnique({
      where: { key: readingListSettingKey(user!.member.id) },
    });
    const parsed = parseReadingList(setting?.value);
    return NextResponse.json({
      mine: parsed
        ? {
            classGrades: parsed.classGrades,
            updatedAt: parsed.updatedAt,
            items: await hydrateItems(parsed.items),
          }
        : { classGrades: readTaughtClasses(user!.member), updatedAt: null, items: [] },
      lists: [],
    });
  }

  const classGrade = user!.member.classGrade;
  const settings = await db.setting.findMany({
    where: { key: { startsWith: "reading_list:" } },
  });
  const lists = [];
  for (const row of settings) {
    const parsed = parseReadingList(row.value);
    if (!parsed || !listTargetsClass(parsed, classGrade)) continue;
    const teacherId = row.key.slice("reading_list:".length);
    const teacher = await db.member.findUnique({
      where: { id: teacherId },
      select: { id: true, fullName: true, classGrade: true },
    });
    lists.push({
      teacherId,
      teacherName: teacher?.fullName ?? "Guru",
      subject: teacher?.classGrade ?? null,
      classGrades: parsed.classGrades,
      updatedAt: parsed.updatedAt,
      items: await hydrateItems(parsed.items),
    });
  }

  return NextResponse.json({ mine: null, lists });
}

export async function PUT(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!isTeacherRole(user!.role) || !user!.member) {
    return ApiError.forbidden("Hanya guru yang dapat menyusun daftar bacaan.");
  }

  const taught = readTaughtClasses(user!.member);
  if (taught.length === 0) {
    return NextResponse.json(
      { error: "Atur kelas yang Anda ajar di Pengaturan sebelum menyusun daftar bacaan." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const requestedGrades = Array.isArray(body.classGrades)
    ? body.classGrades.map((c: unknown) => String(c).trim()).filter(Boolean)
    : taught;
  const classGrades = requestedGrades.filter((g: string) =>
    taught.some((t) => t.toLowerCase() === g.toLowerCase())
  );
  if (classGrades.length === 0) {
    return NextResponse.json(
      { error: "Daftar bacaan hanya boleh untuk kelas yang Anda ajar." },
      { status: 400 }
    );
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((it: { bookId?: string; note?: string }) => ({
      bookId: String(it?.bookId || "").trim(),
      note: it?.note?.trim() || null,
    }))
    .filter((it: { bookId: string }) => it.bookId)
    .slice(0, 12);

  if (items.length > 0) {
    const found = await db.book.findMany({
      where: { id: { in: items.map((i: { bookId: string }) => i.bookId) } },
      select: { id: true },
    });
    const ok = new Set(found.map((b) => b.id));
    if (found.length !== items.length) {
      return NextResponse.json({ error: "Ada buku yang tidak ditemukan." }, { status: 400 });
    }
    if (items.some((i: { bookId: string }) => !ok.has(i.bookId))) {
      return NextResponse.json({ error: "Ada buku yang tidak ditemukan." }, { status: 400 });
    }
  }

  const key = readingListSettingKey(user!.member.id);
  if (items.length === 0) {
    await db.setting.deleteMany({ where: { key } });
    return NextResponse.json({ success: true, items: [] });
  }

  await db.setting.upsert({
    where: { key },
    update: { value: serializeReadingList({ classGrades, items }) },
    create: { key, value: serializeReadingList({ classGrades, items }) },
  });

  return NextResponse.json({
    success: true,
    classGrades,
    items: await hydrateItems(items),
  });
}
