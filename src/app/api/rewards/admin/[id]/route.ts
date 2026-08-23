import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * PATCH /api/rewards/admin/[id] — Update hadiah.
 * DELETE /api/rewards/admin/[id] — Soft delete (set isActive=false).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const existing = await db.reward.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Hadiah tidak ditemukan" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  const allowedFields = [
    "name", "description", "imageUrl", "category", "pointCost",
    "minRole", "stock", "requiresApproval", "maxPerMember",
    "cooldownDays", "isActive", "isFeatured", "sortOrder"
  ];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const updated = await db.reward.update({ where: { id }, data });

  await logAudit(user!.id, "REWARD_UPDATE", "Reward", id, `Update hadiah: ${existing.name}`);

  return NextResponse.json({ success: true, reward: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const { id } = await params;
  const existing = await db.reward.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Hadiah tidak ditemukan" }, { status: 404 });
  }

  // Soft delete: set isActive = false
  // History redemption tetap ada (pakai snapshot rewardName)
  await db.reward.update({
    where: { id },
    data: { isActive: false },
  });

  await logAudit(user!.id, "REWARD_DEACTIVATE", "Reward", id, `Nonaktifkan hadiah: ${existing.name}`);

  return NextResponse.json({ success: true });
}
