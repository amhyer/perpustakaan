import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireFullLibrarian } from "@/lib/auth";
import { cache, CACHE_TTL, CACHE_TAGS } from "@/lib/cache";

/**
 * GET /api/categories — list kategori.
 * Cached 5 menit (jarang berubah).
 * Invalidate otomatis saat POST/PUT/DELETE.
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    // Try cache first
    const cached = cache.get<any[]>("categories:all");
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const cats = await db.category.findMany({ orderBy: { name: "asc" } });

    // Cache 5 menit
    cache.set("categories:all", cats, CACHE_TTL.FIVE_MINUTES, [CACHE_TAGS.CATEGORIES]);

    return NextResponse.json(cats, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("GET categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireFullLibrarian();
  if (error) return error;
  try {
    const body = await req.json();
    const cat = await db.category.create({
      data: { name: body.name, code: body.code, description: body.description || null },
    });

    // Invalidate cache
    cache.invalidateTag(CACHE_TAGS.CATEGORIES);

    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    console.error("POST categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
