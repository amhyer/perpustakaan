import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getArchiveDetail } from "@/lib/semester-archive";

/**
 * GET /api/rewards/archives/[id] — Detail archive with rankings.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { id } = await params;
  const archive = await getArchiveDetail(id);

  if (!archive) {
    return NextResponse.json({ error: "Archive tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ archive });
}
