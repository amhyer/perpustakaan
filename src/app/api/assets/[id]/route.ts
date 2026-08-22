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
    const asset = await db.asset.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category,
        serialNumber: body.serialNumber,
        brand: body.brand,
        model: body.model,
        condition: body.condition,
        status: body.status,
        locationId: body.locationId,
        notes: body.notes,
      },
    });
    await logAudit(user!.id, "SETTING_CHANGE", "Asset", id, `Update aset`);
    return NextResponse.json(asset);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireLibrarian();
  if (error) return error;
  const { id } = await params;
  try {
    await db.asset.delete({ where: { id } });
    await logAudit(user!.id, "SETTING_CHANGE", "Asset", id, `Hapus aset`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal" }, { status: 500 });
  }
}
