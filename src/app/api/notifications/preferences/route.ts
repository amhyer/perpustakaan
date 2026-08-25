/**
 * Smart Notification Preferences API.
 *
 * GET  /api/notifications/preferences — get current user's preferences
 * PUT  /api/notifications/preferences — update preferences
 *
 * Sprint N - Tier 1 #3: Smart notification preferences.
 *
 * Preferences stored in localStorage on client (no DB needed for V1).
 * Can be upgraded to a UserNotificationSettings table later.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { DEFAULT_PREFERENCES, type SmartNotificationPreferences } from "@/lib/smart-notifications";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    // For V1, return defaults. In future, fetch from UserNotificationSettings table.
    return NextResponse.json({
      userId: user!.id,
      preferences: DEFAULT_PREFERENCES,
    });
  } catch (err) {
    console.error("GET notifications/preferences error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  let body: { preferences: Partial<SmartNotificationPreferences> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  if (!body.preferences || typeof body.preferences !== "object") {
    return NextResponse.json(
      { error: "Field 'preferences' wajib diisi" },
      { status: 400 }
    );
  }

  // Validate maxPerDay
  if (body.preferences.maxPerDay !== undefined) {
    const v = body.preferences.maxPerDay;
    if (typeof v !== "number" || v < 1 || v > 100) {
      return NextResponse.json(
        { error: "maxPerDay harus antara 1-100" },
        { status: 400 }
      );
    }
  }

  // Validate quiet hours
  if (body.preferences.quietHoursStart !== undefined) {
    const v = body.preferences.quietHoursStart;
    if (typeof v !== "number" || v < 0 || v > 23) {
      return NextResponse.json(
        { error: "quietHoursStart harus 0-23" },
        { status: 400 }
      );
    }
  }
  if (body.preferences.quietHoursEnd !== undefined) {
    const v = body.preferences.quietHoursEnd;
    if (typeof v !== "number" || v < 0 || v > 23) {
      return NextResponse.json(
        { error: "quietHoursEnd harus 0-23" },
        { status: 400 }
      );
    }
  }

  // Merge with defaults
  const merged: SmartNotificationPreferences = {
    ...DEFAULT_PREFERENCES,
    ...body.preferences,
    triggers: {
      ...DEFAULT_PREFERENCES.triggers,
      ...(body.preferences.triggers || {}),
    },
  };

  return NextResponse.json({
    success: true,
    preferences: merged,
    message: "Preferensi disimpan (client-side)",
  });
}
