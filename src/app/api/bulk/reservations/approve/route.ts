/**
 * Bulk reservation approval endpoint.
 *
 * POST /api/bulk/reservations/approve
 * Body: { reservationIds: string[], reason?: string }
 *
 * Librarian-only. Approves multiple pending reservations at once.
 *
 * Sprint L-Phase 2: Bulk Operations API.
 */

import { NextResponse } from "next/server";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { bulkApproveReservations } from "@/lib/bulk/bulk-operations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!isLibrarian(user!.role)) {
    return NextResponse.json(
      { error: "Hanya pustakawan yang dapat menyetujui reservasi massal" },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const reservationIds: string[] = body.reservationIds;
  const reason: string | undefined = body.reason;

  if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
    return NextResponse.json(
      { error: "reservationIds harus berupa array minimal 1 item" },
      { status: 400 }
    );
  }

  if (reservationIds.length > 500) {
    return NextResponse.json(
      { error: "Maksimal 500 items per batch" },
      { status: 400 }
    );
  }

  const result = await bulkApproveReservations(reservationIds, true, {
    userId: user!.id,
    reason: reason || "Bulk approval",
  });

  await logAudit(
    user!.id,
    "BULK_APPROVE_RESERVATIONS",
    "Reservation",
    "bulk",
    JSON.stringify({
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      reason,
    })
  );

  logger.info("Bulk reservation approval API", {
    userId: user!.id,
    total: result.total,
    successful: result.successful,
    failed: result.failed,
  });

  return NextResponse.json({
    success: result.failed === 0,
    total: result.total,
    successful: result.successful,
    failed: result.failed,
    results: result.results,
  });
}
