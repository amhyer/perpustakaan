import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFullLibrarian } from "@/lib/auth";

// GET /api/authors — daftar semua pengarang master
// Sekaligus auto-seed: ambil nilai unik author dari Book yang belum ada di master
export async function GET() {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  // Auto-seed: ambil semua author unik dari Book
  const books = await db.book.findMany({
    select: { author: true },
    distinct: ["author"],
  });
  const uniqueNames = books
    .map((b) => b.author)
    .filter((n) => n.trim().length > 0)
    .map((n) => n.trim());

  if (uniqueNames.length > 0) {
    await db.$transaction(
      uniqueNames.map((name) =>
        db.author.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );
  }

  const authors = await db.author.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(authors);
}

// POST /api/authors — tambah pengarang baru ke master
// Body: { name: string }
export async function POST(req: Request) {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Nama pengarang wajib diisi" }, { status: 400 });
    }

    const author = await db.author.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    return NextResponse.json(author, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah pengarang" }, { status: 500 });
  }
}
