/**
 * Reading Challenges API — List available challenge templates.
 *
 * GET /api/gamification/challenges
 *   Returns: list of challenge templates for users to opt into
 *
 * Sprint M - Tier 1 #2: Reading challenges.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { CHALLENGE_TEMPLATES } from "@/lib/reading-challenges";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    return NextResponse.json({
      templates: CHALLENGE_TEMPLATES,
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
