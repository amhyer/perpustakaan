import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian, requireAuth, isLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/rooms — daftar ruangan.
 * Query: ?date=YYYY-MM-DD (filter availability untuk tanggal tertentu)
 */
export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");

    const rooms = await db.libraryRoom.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    if (!date) return NextResponse.json(rooms);

    // Tambah info booking untuk tanggal tsb
    const dayStart = new Date(date);
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const bookings = await db.roomBooking.findMany({
      where: {
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
        status: { in: ["BOOKED", "CHECKED_IN"] },
      },
    });

    const withBookings = rooms.map((r) => ({
      ...r,
      bookingsOnDate: bookings.filter((b) => b.roomId === r.id),
    }));

    return NextResponse.json(withBookings);
  } catch (err) {
    console.error("GET rooms error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/rooms — buat ruangan baru (pustakawan).
 */
export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    if (!body.name || !body.type || !body.capacity) {
      return NextResponse.json({ error: "Nama, tipe, dan kapasitas wajib diisi" }, { status: 400 });
    }
    const room = await db.libraryRoom.create({
      data: {
        name: body.name,
        type: body.type,
        capacity: parseInt(body.capacity),
        description: body.description || null,
      },
    });
    await logAudit(user!.id, "SETTING_CHANGE", "LibraryRoom", room.id, `Buat ruangan: ${room.name}`);
    return NextResponse.json(room, { status: 201 });
  } catch (err) {
    console.error("POST /api/rooms error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
