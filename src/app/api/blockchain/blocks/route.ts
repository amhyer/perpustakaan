import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getBlocks, getBlockDetails } from "@/lib/blockchain-audit";

/**
 * GET /api/blockchain/blocks — List all blocks.
 *
 * Query: ?limit=20&offset=0
 * Or: ?hash=xxx or ?index=N for specific block details
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const hash = searchParams.get("hash");
  const indexParam = searchParams.get("index");

  if (hash) {
    const block = await getBlockDetails(hash);
    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }
    return NextResponse.json(block);
  }

  if (indexParam) {
    const block = await getBlockDetails(parseInt(indexParam, 10));
    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }
    return NextResponse.json(block);
  }

  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;
  const blocks = await getBlocks(limit, offset);
  return NextResponse.json({ items: blocks });
}
