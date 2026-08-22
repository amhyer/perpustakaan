import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFullLibrarian } from "@/lib/auth";
import { logError } from "@/lib/error-tracker";

/**
 * PATCH /api/error-log/[id] — tandai error sebagai resolved.
 * Body: { resolved: boolean }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { resolved } = body as { resolved: boolean };

    const updated = await db.errorLog.update({
      where: { id },
      data: {
        resolved: !!resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? user!.id : null,
      },
    });

    return NextResponse.json({ success: true, error: updated });
  } catch (err) {
    await logError(err instanceof Error ? err : new Error(String(err)), {
      level: "ERROR",
      context: { url: req.url, method: "PATCH" },
    });
    return NextResponse.json({ error: "Gagal update error log" }, { status: 500 });
  }
}

/**
 * DELETE /api/error-log/[id] — hapus error log entry.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const { id } = await params;
    await db.errorLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    await logError(err instanceof Error ? err : new Error(String(err)), {
      level: "ERROR",
      context: { url: req.url, method: "DELETE" },
    });
    return NextResponse.json({ error: "Gagal hapus error log" }, { status: 500 });
  }
}
