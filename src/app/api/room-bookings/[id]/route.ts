import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * DELETE /api/room-bookings/[id] — batalkan booking.
 * - Siswa: hanya booking miliknya
 * - Pustakawan: semua
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const booking = await db.roomBooking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });

    if (!isLibrarian(user!.role) && booking.memberId !== user!.member?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.roomBooking.update({ where: { id }, data: { status: "CANCELLED" } });
    await logAudit(user!.id, "SETTING_CHANGE", "RoomBooking", id, `Cancel booking`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE room-bookings/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
