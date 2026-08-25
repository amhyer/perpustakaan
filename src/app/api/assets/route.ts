import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/assets — daftar aset (proyektor, laptop, dll).
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const assets = await db.asset.findMany({
      include: { location: { select: { name: true, code: true } } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(assets);
  } catch (err) {
    console.error("GET assets error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/assets — tambah aset baru.
 */
export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;
  try {
    const body = await req.json();
    if (!body.name || !body.category) {
      return NextResponse.json({ error: "Nama dan kategori wajib diisi" }, { status: 400 });
    }
    const asset = await db.asset.create({
      data: {
        name: body.name,
        category: body.category,
        serialNumber: body.serialNumber || null,
        brand: body.brand || null,
        model: body.model || null,
        condition: body.condition || "BAIK",
        status: "AVAILABLE",
        locationId: body.locationId || null,
        notes: body.notes || null,
      },
    });
    await logAudit(user!.id, "SETTING_CHANGE", "Asset", asset.id, `Tambah aset: ${asset.name}`);
    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("POST /api/assets error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
