import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireLibrarian();
  if (error) return error;
  const { id } = await params;

  try {
    const body = await req.json();
    const room = await db.libraryRoom.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        capacity: body.capacity ? parseInt(body.capacity) : undefined,
        description: body.description,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      },
    });
    await logAudit(user!.id, "SETTING_CHANGE", "LibraryRoom", id, `Update ruangan`);
    return NextResponse.json(room);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireLibrarian();
  if (error) return error;
  const { id } = await params;

  try {
    // Soft delete: set isActive=false
    await db.libraryRoom.update({ where: { id }, data: { isActive: false } });
    await logAudit(user!.id, "SETTING_CHANGE", "LibraryRoom", id, `Nonaktifkan ruangan`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal" }, { status: 500 });
  }
}
