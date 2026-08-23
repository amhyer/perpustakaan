import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConversationMessages } from "@/lib/chat-assistant";

/**
 * GET /api/chat/conversations/[id]/messages — Get messages in a conversation.
 *
 * Returns: MessageRecord[]
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) return error;

  const { id } = await params;

  // Verify conversation ownership
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

  const messages = await getConversationMessages(id);
  return NextResponse.json({ items: messages });
}
