import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getRecommendations, enrichRecommendations } from "@/lib/recommendation-engine";

/**
 * GET /api/recommendations — Personalized book recommendations untuk user.
 *
 * Query params:
 * - topN: berapa banyak (default 10, max 20)
 * - refresh: 'true' untuk force recompute (default pakai cache)
 *
 * Returns: array of { bookId, bookTitle, score, reason, ... }
 */
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member yang bisa dapat rekomendasi" }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const topN = Math.min(20, Math.max(1, parseInt(searchParams.get("topN") || "10")));
  const forceRefresh = searchParams.get("refresh") === "true";

  try {
    let recs = await getRecommendations(user.member.id, {
      topN,
      forceRefresh,
    });

    // Enrich dengan detail buku (kalau cached, belum ada detail)
    recs = await enrichRecommendations(recs);

    return NextResponse.json({
      memberId: user.member.id,
      recommendations: recs,
      cached: !forceRefresh,
    });
  } catch (err) {
    return NextResponse.json({ error: "Gagal memuat rekomendasi" }, { status: 500 });
  }
}
