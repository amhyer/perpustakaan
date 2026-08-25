import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFullLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * DELETE /api/api-keys/[id] — hapus (nonaktifkan) API key.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const { id } = await params;

    await db.apiKey.update({ where: { id }, data: { isActive: false } });
    await logAudit(user!.id, "SETTING_CHANGE", "ApiKey", id, `Hapus API key`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE api-keys/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/api-keys/[id] — update (enable/disable, scopes).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;
  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await db.apiKey.update({
      where: { id },
      data: {
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        scopes: body.scopes ? JSON.stringify(body.scopes) : undefined,
      },
    });
    await logAudit(user!.id, "SETTING_CHANGE", "ApiKey", id, `Update API key`);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal" }, { status: 500 });
  }
}
