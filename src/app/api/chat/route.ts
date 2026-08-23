import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { chat, ChatError } from "@/lib/chat-assistant";

/**
 * POST /api/chat — Send message to AI assistant.
 *
 * Body: {
 *   message: string,
 *   conversationId?: string,
 *   locale?: "id" | "en" | "ar"
 * }
 *
 * Returns: {
 *   conversationId, userMessageId, assistantMessage, intent, confidence,
 *   provider, model, tokens, latencyMs, fromCache, shouldEscalate, suggestedActions
 * }
 */
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error;

  let body: { message?: string; conversationId?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Cap message length (prevent abuse)
  if (body.message.length > 1000) {
    return NextResponse.json(
      { error: "Pesan terlalu panjang (max 1000 karakter)" },
      { status: 400 }
    );
  }

  try {
    const result = await chat({
      userId: user.id,
      message: body.message.trim(),
      conversationId: body.conversationId,
      locale: body.locale || "id",
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    console.error("[/api/chat] error:", err);
    return NextResponse.json(
      { error: "Maaf, asisten sedang sibuk. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
