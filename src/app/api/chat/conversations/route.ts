import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserConversations } from "@/lib/chat-assistant";

/**
 * GET /api/chat/conversations — Get user's chat history.
 *
 * Query: ?limit=20
 *
 * Returns: ConversationSummary[] ordered by updatedAt desc.
 */
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 100);

  const conversations = await getUserConversations(user.id, limit);
  return NextResponse.json({ items: conversations });
}
