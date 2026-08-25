/**
 * Natural Language Search API.
 *
 * GET /api/search/natural?q=Cari+buku+tentang+persahabatan+untuk+SMP&limit=20
 *   Returns: { parsed, results, total }
 *
 * Sprint N - Tier 2 #5: AI-Powered Search.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { nlSearch, parseQuery, describeQuery } from "@/lib/nl-search";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const minScore = parseFloat(searchParams.get("minScore") || "0.1");

  if (!q || q.trim().length < 2) {
    return NextResponse.json(
      { error: "Parameter 'q' wajib diisi (min 2 karakter)" },
      { status: 400 }
    );
  }

  if (limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: "limit harus antara 1-50" },
      { status: 400 }
    );
  }

  try {
    // Parse query for metadata
    const parsed = parseQuery(q);
    const description = describeQuery(parsed);

    // Search
    const results = await nlSearch(q, { limit, minScore });

    return NextResponse.json({
      query: q,
      parsed,
      description,
      results,
      total: results.length,
      user: {
        id: user!.id,
        role: user!.role,
      },
    });
  } catch (err) {
    console.error("GET search/natural error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
