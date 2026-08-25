import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";

/**
 * PATCH /api/visitors/[id]/checkout — check-out pengunjung.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const { id } = await params;

    const visitor = await db.visitor.update({
      where: { id },
      data: { checkOut: new Date() },
    });
    return NextResponse.json(visitor);
  } catch (err) {
    console.error("PATCH visitors/[id]/checkout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
