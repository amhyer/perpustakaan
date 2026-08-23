/**
 * Bulk notification sending endpoint.
 *
 * POST /api/bulk/notifications/send
 * Body: {
 *   userIds: string[],
 *   notification: { title: string, message: string, type?: string }
 * }
 *
 * Librarian-only. Sends notification to many users at once.
 *
 * Sprint L-Phase 2: Bulk Operations API.
 */

import { NextResponse } from "next/server";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { bulkSendNotifications } from "@/lib/bulk/bulk-operations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

const VALID_TYPES = ["INFO", "WARNING", "DUE_DATE", "OVERDUE", "ANNOUNCEMENT"] as const;
type NotificationType = (typeof VALID_TYPES)[number];

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!isLibrarian(user!.role)) {
    return NextResponse.json(
      { error: "Hanya pustakawan yang dapat mengirim notifikasi massal" },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const userIds: string[] = body.userIds;
  const notification = body.notification;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: "userIds harus berupa array minimal 1 item" },
      { status: 400 }
    );
  }

  if (userIds.length > 5000) {
    return NextResponse.json(
      { error: "Maksimal 5000 penerima per batch" },
      { status: 400 }
    );
  }

  if (!notification || !notification.title || !notification.message) {
    return NextResponse.json(
      { error: "notification.title dan notification.message wajib diisi" },
      { status: 400 }
    );
  }

  if (notification.title.length > 200) {
    return NextResponse.json(
      { error: "Title maksimal 200 karakter" },
      { status: 400 }
    );
  }

  if (notification.message.length > 1000) {
    return NextResponse.json(
      { error: "Message maksimal 1000 karakter" },
      { status: 400 }
    );
  }

  const notifType: NotificationType =
    notification.type && VALID_TYPES.includes(notification.type)
      ? notification.type
      : "INFO";

  const result = await bulkSendNotifications(
    userIds,
    {
      title: notification.title,
      message: notification.message,
      type: notifType,
    },
    {
      userId: user!.id,
      reason: `Broadcast ke ${userIds.length} user`,
    }
  );

  await logAudit({
    userId: user!.id,
    action: "BULK_SEND_NOTIFICATIONS",
    resource: "Notification",
    resourceId: "bulk",
    changes: {
      recipientCount: result.total,
      successful: result.successful,
      failed: result.failed,
      title: notification.title,
    },
  });

  logger.info("Bulk notification API", {
    userId: user!.id,
    total: result.total,
    successful: result.successful,
  });

  return NextResponse.json({
    success: result.failed === 0,
    total: result.total,
    successful: result.successful,
    failed: result.failed,
  });
}
