import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPushConfigured } from "@/lib/push-notification";
import { logger } from "@/lib/logger";

/**
 * POST /api/push/subscribe — Subscribe user untuk push notification.
 *
 * Body: { endpoint: string, keys: { p256dh: string, auth: string } }
 *
 * Returns: { success, publicKey } (VAPID public key buat client)
 */
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        error: "Push notification belum di-configure di server",
        help: "Set VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY di environment",
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: "endpoint, keys.p256dh, keys.auth wajib diisi" },
      { status: 400 }
    );
  }

  // Upsert subscription
  try {
    const subscription = await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: user!.id,
        keys: JSON.stringify(keys),
        userAgent: req.headers.get("user-agent") || undefined,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        userId: user!.id,
        endpoint,
        keys: JSON.stringify(keys),
        userAgent: req.headers.get("user-agent") || undefined,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    logger.info("Push subscription saved", {
      userId: user!.id,
      subscriptionId: subscription.id,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
  } catch (err) {
    logger.error("Failed to save push subscription", { error: String(err) });
    return NextResponse.json({ error: "Gagal menyimpan subscription" }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe — Unsubscribe.
 * Body: { endpoint: string }
 */
export async function DELETE(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { endpoint } = body;

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint wajib diisi" }, { status: 400 });
  }

  await db.pushSubscription.deleteMany({
    where: { endpoint, userId: user!.id },
  });

  return NextResponse.json({ success: true });
}

/**
 * GET /api/push/subscribe — Get user's subscriptions + VAPID public key.
 */
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const subs = await db.pushSubscription.findMany({
    where: { userId: user!.id, isActive: true },
    select: {
      id: true,
      endpoint: true,
      userAgent: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    isConfigured: isPushConfigured(),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    subscriptions: subs,
  });
}
