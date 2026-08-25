import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAssignment, trackConversion, getExperimentResults } from "@/lib/experiments";

/**
 * GET /api/experiments/[key] — Get user's variant for experiment.
 * Pustakawan (LIBRARIAN) bisa juga GET results via ?results=true
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member" }, { status: 403 });
  }

  try {
    const { key } = await params;
    const url = new URL(req.url);
    const wantResults = url.searchParams.get("results") === "true";

    // Pustakawan can view results
    if (wantResults && (user.role === "LIBRARIAN" || user.role === "PUSTAKAWAN_JUNIOR")) {
      const results = await getExperimentResults(key);
      return NextResponse.json(results);
    }

    const assignment = await getAssignment(key, user.member.id);
    if (!assignment) {
      return NextResponse.json(
        { error: "Experiment tidak aktif atau tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(assignment);
  } catch (err) {
    console.error("GET experiments/[key] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/experiments/[key] — Track conversion.
 * Body: { eventName: string, metadata?: object }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user?.member) {
    return NextResponse.json({ error: "Hanya member" }, { status: 403 });
  }

  try {
    const { key } = await params;
    const body = await req.json().catch(() => ({}));
    const { eventName, metadata } = body;

    if (!eventName) {
      return NextResponse.json({ error: "eventName wajib" }, { status: 400 });
    }

    await trackConversion(key, user.member.id, eventName, metadata);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST experiments/[key] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
