import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireFullLibrarian } from "@/lib/auth";
import { cache, CACHE_TTL, CACHE_TAGS } from "@/lib/cache";

/**
 * GET /api/locations — list rak/lokasi.
 * Cached 5 menit. Invalidate saat mutasi.
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const cached = cache.get<any[]>("locations:all");
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  const locs = await db.location.findMany({ orderBy: { name: "asc" } });
  cache.set("locations:all", locs, CACHE_TTL.FIVE_MINUTES, [CACHE_TAGS.LOCATIONS]);

  return NextResponse.json(locs, { headers: { "X-Cache": "MISS" } });
}

export async function POST(req: Request) {
  const { error } = await requireFullLibrarian();
  if (error) return error;
  const body = await req.json();
  const loc = await db.location.create({
    data: { name: body.name, code: body.code, description: body.description || null },
  });

  cache.invalidateTag(CACHE_TAGS.LOCATIONS);

  return NextResponse.json(loc, { status: 201 });
}
