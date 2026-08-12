import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// GET /api/publishers — daftar semua penerbit master
// Sekaligus auto-seed: ambil nilai unik publisher dari Book yang belum ada di master
export async function GET() {
  const { error } = await requireRole("LIBRARIAN");
  if (error) return error;

  // Auto-seed: ambil semua publisher unik dari Book yang non-null
  const books = await db.book.findMany({
    where: { publisher: { not: null } },
    select: { publisher: true },
    distinct: ["publisher"],
  });
  const uniqueNames = books
    .map((b) => b.publisher as string)
    .filter((n) => n.trim().length > 0)
    .map((n) => n.trim());

  // Upsert setiap nama yang belum ada di master Publisher
  // (gunakan createMany dengan skipDuplicates untuk efisiensi)
  if (uniqueNames.length > 0) {
    await db.$transaction(
      uniqueNames.map((name) =>
        db.publisher.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );
  }

  const publishers = await db.publisher.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(publishers);
}

// POST /api/publishers — tambah penerbit baru ke master
// Body: { name: string }
export async function POST(req: Request) {
  const { error } = await requireRole("LIBRARIAN");
  if (error) return error;

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Nama penerbit wajib diisi" }, { status: 400 });
    }

    // Upsert: kalau sudah ada, return existing; kalau belum, create
    const publisher = await db.publisher.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    return NextResponse.json(publisher, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah penerbit" }, { status: 500 });
  }
}
