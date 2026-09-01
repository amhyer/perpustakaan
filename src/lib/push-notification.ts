/**
 * Push Notification Service
 *
 * Web Push API integration:
 * 1. User opts-in → browser gets push subscription
 * 2. Subscription disimpan di DB (PushSubscription table)
 * 3. Server kirim notif via web-push library
 *
 * Setup:
 * 1. Generate VAPID keys: `npx web-push generate-vapid-keys`
 * 2. Set env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * 3. Use this service to send
 */

import { logger } from "@/lib/logger";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@jendelailmu.sch.id";

export interface PushPayload {
  title: string;
  message: string;
  url?: string;
  tag?: string;
  icon?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: Array<{ action: string; title: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/**
 * Check apakah VAPID keys sudah di-set.
 */
export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Format subscription for storage.
 */
export interface PushSubscriptionData {
  endpoint: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keys: any;
  userId?: string;
  userAgent?: string;
}

/**
 * Send push notification ke single subscription.
 * Return true kalau sukses, false kalau error.
 */
export async function sendPushToSubscription(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  if (!isPushConfigured()) {
    logger.warn("Push notification skipped: VAPID not configured");
    return false;
  }

  try {
    // Dynamic import untuk avoid loading web-push kalau tidak dipakai
    // Use variable path to prevent Turbopack from statically resolving at build time
    const mod = "web-push";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    // @ts-ignore - web-push module not installed
    const webpush = await import(/* webpackIgnore: true */ mod).catch(() => null);
    if (!webpush) {
      logger.warn("web-push not installed, skipping push");
      return false;
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify({
        title: payload.title,
        message: payload.message,
        url: payload.url || "/",
        tag: payload.tag || "default",
        icon: payload.icon || "/icons/icon-192.svg",
        actions: payload.actions,
        data: payload.data,
      })
    );
    return true;
  } catch (err) {
    logger.error("Push notification failed", {
      endpoint: subscription.endpoint,
      error: String(err),
    });
    return false;
  }
}

/**
 * Send push ke multiple subscriptions.
 */
export async function sendPushBulk(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const ok = await sendPushToSubscription(sub, payload);
    if (ok) sent++;
    else failed++;
  }

  return { sent, failed };
}

/**
 * Browser-side: Request push permission & get subscription.
 */
export async function requestPushPermission(): Promise<PushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    if (!VAPID_PUBLIC_KEY) {
      logger.warn("VAPID public key not set, cannot subscribe");
      return null;
    }

    // Convert VAPID key to Uint8Array
    const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey as BufferSource,
    });

    return subscription;
  } catch (err) {
    logger.error("Push permission denied", { error: String(err) });
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert PushSubscription to DB storable format.
 */
export function serializePushSubscription(sub: PushSubscription): PushSubscriptionData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = sub.toJSON() as any;
  return {
    endpoint: json.endpoint,
    keys: json.keys,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}
