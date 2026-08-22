import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { recommendBooks, getCollaborativeRecommendations, getSimilarBooks } from "@/lib/recommendations";

/**
 * GET /api/recommendations — AI-powered book recommendations.
 *
 * Query params:
 * - ?for=bookId — recommendations for specific book (collaborative)
 * - ?similar=bookId — similar books
 * - ?limit=N — number of recommendations (default 10)
 * - ?exclude=id1,id2 — exclude these book IDs
 *
 * Untuk personalized recommendations, user harus login.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const forBook = url.searchParams.get("for");
  const similarBook = url.searchParams.get("similar");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const excludeParam = url.searchParams.get("exclude") || "";
  const excludeBookIds = excludeParam ? excludeParam.split(",") : [];

  try {
    // Get member for personalization
    const member = await db.member.findUnique({
      where: { userId: session.userId },
    });

    // "Because you read X" (collaborative)
    if (forBook) {
      const recs = await getCollaborativeRecommendations(forBook, limit);
      return NextResponse.json({
        type: "collaborative",
        recommendations: recs,
        for: forBook,
      });
    }

    // Similar to X (content)
    if (similarBook) {
      const recs = await getSimilarBooks(similarBook, limit);
      return NextResponse.json({
        type: "similar",
        recommendations: recs,
        for: similarBook,
      });
    }

    // Personalized for user
    const recs = await recommendBooks({
      userId: session.userId,
      memberId: member?.id,
      limit,
      excludeBookIds,
    });

    return NextResponse.json({
      type: "personalized",
      recommendations: recs,
      user: session.email,
    });
  } catch (err) {
    console.error("[recommendations] Error:", err);
    return NextResponse.json({ error: "Gagal generate rekomendasi" }, { status: 500 });
  }
}
