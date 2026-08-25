import { NextResponse } from "next/server";
import { handleIntent, parseIntent, toGoogleResponse, type VoiceIntent } from "@/lib/voice-assistant";
import { logger } from "@/lib/logger";

/**
 * POST /api/voice/google — Google Assistant Actions webhook.
 *
 * Body: Dialogflow webhook request
 * {
 *   "queryResult": {
 *     "intent": { "displayName": "..." },
 *     "parameters": { ... }
 *   }
 * }
 *
 * Returns: Dialogflow webhook response
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
    const queryResult = body.queryResult;
    const intentName = queryResult?.intent?.displayName;
    const params = queryResult?.parameters || {};
    const queryText = queryResult?.queryText || "";

    // Map Dialogflow intent ke VoiceIntent
    const map: Record<string, VoiceIntent["name"]> = {
      "Search Book": "SearchBook",
      "Check Availability": "CheckAvailability",
      "My Loans": "MyLoans",
      "Due Soon": "DueSoon",
      "My Points": "Points",
      "Recommend": "Recommend",
    };

    let intent: VoiceIntent;
    if (map[intentName]) {
      intent = {
        name: map[intentName],
        confidence: 0.9,
        parameters: flattenParams(params),
      };
    } else {
      // Fallback: parse dari query text
      intent = parseIntent(queryText);
    }

    const result = await handleIntent({
      intent,
      memberId: undefined,
      locale: "id",
    });

    return NextResponse.json(toGoogleResponse(result));
  } catch (err) {
    logger.error("Google webhook failed", { error: String(err) });
    return NextResponse.json(
      toGoogleResponse({
        text: "Maaf, terjadi kesalahan.",
        shouldEndSession: true,
      })
    );
  }
}

function flattenParams(params: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") result[k] = v;
    else if (typeof v === "number") result[k] = String(v);
    else if (Array.isArray(v) && v.length > 0) result[k] = String(v[0]);
  }
  return result;
}
