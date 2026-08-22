import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian, isLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notification-service";

/**
 * GET /api/room-bookings — daftar booking ruangan.
 * - Siswa: hanya booking miliknya
 * - Pustakawan: semua
 * Query: ?date=YYYY-MM-DD, ?roomId=xxx, ?mine=1
 */
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const roomId = url.searchParams.get("roomId");
  const mine = url.searchParams.get("mine") === "1";

  const where: any = {};
  if (roomId) where.roomId = roomId;
  if (date) {
    const dayStart = new Date(date);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    where.startTime = { lt: dayEnd };
    where.endTime = { gt: dayStart };
  }
  if (mine || !isLibrarian(user!.role)) {
    where.memberId = user!.member?.id;
  }

  const bookings = await db.roomBooking.findMany({
    where,
    include: {
      room: { select: { name: true, type: true, capacity: true } },
      member: { select: { fullName: true, memberNumber: true, classGrade: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(bookings);
}

/**
 * POST /api/room-bookings — buat booking ruangan baru.
 * Body: { roomId, startTime, endTime, purpose, memberId? }
 * - Siswa: book untuk diri sendiri
 * - Pustakawan: bisa book untuk member lain (memberId) atau walk-in (bookerName)
 */
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    if (!body.roomId || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: "roomId, startTime, endTime wajib diisi" }, { status: 400 });
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);
    if (endTime <= startTime) {
      return NextResponse.json({ error: "endTime harus setelah startTime" }, { status: 400 });
    }

    // Cek overlap dengan booking lain
    const overlapping = await db.roomBooking.findFirst({
      where: {
        roomId: body.roomId,
        status: { in: ["BOOKED", "CHECKED_IN"] },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    });
    if (overlapping) {
      return NextResponse.json({ error: "Ruangan sudah dipesan pada waktu tersebut" }, { status: 409 });
    }

    // Tentukan booker
    const memberId = isLibrarian(user!.role) && body.memberId ? body.memberId : user!.member?.id;
    if (!memberId) {
      return NextResponse.json({ error: "Hanya anggota yang bisa booking ruangan" }, { status: 403 });
    }

    const booking = await db.roomBooking.create({
      data: {
        roomId: body.roomId,
        memberId,
        bookerName: body.bookerName || user!.name,
        bookerPhone: body.bookerPhone || user!.member?.phone || null,
        startTime,
        endTime,
        purpose: body.purpose || null,
        notes: body.notes || null,
      },
      include: {
        room: { select: { name: true } },
        member: { select: { fullName: true, userId: true } },
      },
    });

    // Notifikasi ke member
    if (booking.member) {
      await notify({
        userId: booking.member.userId,
        title: `Booking Ruangan: ${booking.room.name}`,
        message: `Booking Anda untuk "${booking.room.name}" pada ${startTime.toLocaleString("id-ID")} - ${endTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`,
        type: "INFO",
        relatedId: booking.id,
      });
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal" }, { status: 500 });
  }
}
