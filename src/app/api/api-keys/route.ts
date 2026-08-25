import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFullLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateApiKey } from "@/lib/api-auth";

/**
 * GET /api/api-keys — daftar API key (hanya prefix, bukan full key).
 */
export async function GET() {
  const { error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const keys = await db.apiKey.findMany({
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(keys);
  } catch (err) {
    console.error("GET api-keys error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/api-keys — buat API key baru.
 * Body: { name, scopes: string[], expiresInDays?: number }
 *
 * Returns: { id, key } — key HANYA DITAMPILKAN SEKALI.
 * Simpan key di tempat aman, tidak bisa dilihat lagi.
 */
export async function POST(req: Request) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    if (!body.name || !Array.isArray(body.scopes) || body.scopes.length === 0) {
      return NextResponse.json({ error: "name dan scopes wajib diisi" }, { status: 400 });
    }

    const { plain, prefix } = generateApiKey("live");
    const keyHash = require("crypto").createHash("sha256").update(plain).digest("hex");

    const apiKey = await db.apiKey.create({
      data: {
        name: body.name,
        keyHash,
        prefix,
        scopes: JSON.stringify(body.scopes),
        createdById: user!.id,
        expiresAt: body.expiresInDays
          ? new Date(Date.now() + body.expiresInDays * 86400000)
          : null,
      },
    });

    await logAudit(user!.id, "SETTING_CHANGE", "ApiKey", apiKey.id, `Buat API key: ${apiKey.name}`);

    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key: plain, // ONLY ONCE
      prefix,
      scopes: body.scopes,
      expiresAt: apiKey.expiresAt,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal" }, { status: 500 });
  }
}
