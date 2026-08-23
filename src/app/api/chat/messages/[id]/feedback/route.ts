import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { saveFeedback } from "@/lib/chat-assistant";
import { db } from "@/lib/db";

/**
 * POST /api/chat/messages/[id]/feedback — Save feedback for a specific message.
 *
 * Body: { isHelpful: boolean, note?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) return error;

  const { id } = await params;

  let body: { isHelpful?: boolean; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.isHelpful !== "boolean") {
    return NextResponse.json({ error: "isHelpful must be boolean" }, { status: 400 });
  }

  // Verify ownership (message must be in user's conversation)
  try {
    const msg = await db.chatMessage.findUnique({
      where: { id },
      include: { conversation: { select: { userId: true } } },
    });
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (msg.conversation.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const success = await saveFeedback(id, body.isHelpful, body.note);
  if (!success) {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
