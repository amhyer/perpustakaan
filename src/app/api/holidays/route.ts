import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// GET /api/holidays — daftar semua hari libur (sorted by date asc)
export async function GET() {
  const { error } = await requireRole("LIBRARIAN");
  if (error) return error;

  const holidays = await db.libraryHoliday.findMany({
    orderBy: { date: "asc" },
  });

  return NextResponse.json(holidays);
}

// POST /api/holidays — tambah hari libur baru
// Body: { date: string (ISO), description: string }
export async function POST(req: Request) {
  const { error } = await requireRole("LIBRARIAN");
  if (error) return error;

  try {
    const body = await req.json();
    const { date, description } = body;

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "Tanggal wajib diisi" },
        { status: 400 }
      );
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "Keterangan wajib diisi" },
        { status: 400 }
      );
    }

    // Parse tanggal: input biasanya "YYYY-MM-DD" dari <input type="date">
    // Buat Date di awal hari lokal (bukan UTC midnight) untuk hindari offset
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) {
      return NextResponse.json(
        { error: "Format tanggal tidak valid (gunakan YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    const dateObj = new Date(y, m - 1, d, 0, 0, 0, 0);

    // Cek duplikat
    const existing = await db.libraryHoliday.findFirst({
      where: {
        date: {
          gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
          lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1),
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Tanggal ini sudah terdaftar sebagai hari libur" },
        { status: 409 }
      );
    }

    const holiday = await db.libraryHoliday.create({
      data: {
        date: dateObj,
        description: description.trim(),
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal menambah hari libur" },
      { status: 500 }
    );
  }
}
