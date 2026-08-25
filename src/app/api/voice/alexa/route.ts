import { NextResponse } from "next/server";
import { handleIntent, parseIntent, toAlexaResponse, type VoiceIntent } from "@/lib/voice-assistant";
import { logger } from "@/lib/logger";

/**
 * POST /api/voice/alexa — Alexa Skills webhook.
 *
 * Body: Alexa Request Format JSON
 * {
 *   "version": "1.0",
 *   "session": { ... },
 *   "request": {
 *     "type": "IntentRequest",
 *     "intent": { "name": "...", "slots": { ... } }
 *   }
 * }
 *
 * Returns: Alexa Response Format JSON
 */
export async function POST(req: Request) {
  const secret = process.env.VOICE_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn("VOICE_WEBHOOK_SECRET is not set — allowing request without auth");
  } else {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();
    const request = body.request;

    if (request.type === "LaunchRequest") {
      return NextResponse.json(
        toAlexaResponse({
          text: "Halo! Saya asisten perpustakaan Jendela Ilmu. Mau cari buku apa?",
          shouldEndSession: false,
        })
      );
    }

    if (request.type === "IntentRequest") {
      const intentName = request.intent?.name;
      const slots = request.intent?.slots || {};

      // Build VoiceIntent from Alexa intent
      const intent: VoiceIntent = mapAlexaIntent(intentName, slots);
      const result = await handleIntent({
        intent,
        memberId: undefined, // Alexa skill tidak terautentikasi langsung
        locale: "id",
      });

      return NextResponse.json(toAlexaResponse(result));
    }

    return NextResponse.json(
      toAlexaResponse({ text: "Maaf, saya tidak mengerti.", shouldEndSession: true })
    );
  } catch (err) {
    logger.error("Alexa webhook failed", { error: String(err) });
    return NextResponse.json(
      toAlexaResponse({
        text: "Maaf, terjadi kesalahan. Silakan coba lagi.",
        shouldEndSession: true,
      })
    );
  }
}

function mapAlexaIntent(name: string, slots: Record<string, any>): VoiceIntent {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(slots)) {
    if (v?.value) params[k] = String(v.value);
  }

  const map: Record<string, VoiceIntent["name"]> = {
    SearchBookIntent: "SearchBook",
    CheckAvailabilityIntent: "CheckAvailability",
    MyLoansIntent: "MyLoans",
    DueSoonIntent: "DueSoon",
    PointsIntent: "Points",
    RecommendIntent: "Recommend",
  };

  return {
    name: map[name] || "Fallback",
    confidence: 0.8,
    parameters: params,
  };
}
