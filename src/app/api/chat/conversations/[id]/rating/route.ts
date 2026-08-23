import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { saveConversationRating } from "@/lib/chat-assistant";
import { db } from "@/lib/db";

/**
 * POST /api/chat/conversations/[id]/rating — Rate conversation (1-5 stars).
 *
 * Body: { rating: number, feedback?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) return error;

  const { id } = await params;

  let body: { rating?: number; feedback?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  // Verify ownership
  try {
    const conv = await db.chatConversation.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (conv.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const success = await saveConversationRating(id, body.rating, body.feedback);
  if (!success) {
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
