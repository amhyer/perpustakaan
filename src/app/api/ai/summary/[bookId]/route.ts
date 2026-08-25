import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getBookSummary } from "@/lib/ai-summary";

/**
 * GET /api/ai/summary/[bookId] — AI-generated summary untuk buku.
 *
 * Returns: { bookId, bookTitle, shortSummary, keyPoints, targetAudience, generatedBy, generatedAt }
 *
 * Cached 30 hari. Kalau synopsis sudah ada, extract langsung.
 * Kalau tidak, panggil AI (OpenAI/Anthropic/Google) sesuai env.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { bookId } = await params;

    const summary = await getBookSummary(bookId);
    if (!summary) {
      return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET ai/summary/[bookId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
