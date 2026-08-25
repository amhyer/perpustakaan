import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * POST /api/rewards/admin — Tambah hadiah baru.
 *
 * Body: { name, description?, imageUrl?, category, pointCost, minRole?, stock?, requiresApproval?, maxPerMember?, cooldownDays?, isFeatured?, sortOrder? }
 */
export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    const {
      name,
      description,
      imageUrl,
      category,
      pointCost,
      minRole = "STUDENT",
      stock = null,
      requiresApproval = false,
      maxPerMember = null,
      cooldownDays = null,
      isFeatured = false,
      sortOrder = 0,
    } = body;

    if (!name || !category || !pointCost) {
      return NextResponse.json(
        { error: "name, category, pointCost wajib diisi" },
        { status: 400 }
      );
    }

    if (pointCost < 1) {
      return NextResponse.json({ error: "pointCost minimal 1" }, { status: 400 });
    }

    const validCategories = ["BOOK", "STATIONERY", "VOUCHER", "GIFT_CARD", "PRIVILEGE", "CERTIFICATE", "CUSTOM"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `Category harus salah satu dari: ${validCategories.join(", ")}` }, { status: 400 });
    }

    const reward = await db.reward.create({
      data: {
        name: String(name).slice(0, 200),
        description: description ? String(description).slice(0, 1000) : null,
        imageUrl: imageUrl || null,
        category,
        pointCost: parseInt(pointCost),
        minRole,
        stock: stock !== null ? parseInt(stock) : null,
        requiresApproval: !!requiresApproval,
        maxPerMember: maxPerMember !== null ? parseInt(maxPerMember) : null,
        cooldownDays: cooldownDays !== null ? parseInt(cooldownDays) : null,
        isFeatured: !!isFeatured,
        sortOrder: parseInt(sortOrder) || 0,
        createdById: user!.id,
      },
    });

    await logAudit(user!.id, "REWARD_CREATE", "Reward", reward.id, `Buat hadiah: ${name} (${pointCost} poin)`);
    logger.info("Reward created", { rewardId: reward.id, name, by: user!.id });

    return NextResponse.json({ success: true, reward });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
