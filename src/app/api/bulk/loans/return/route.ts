/**
 * Bulk loan return endpoint.
 *
 * POST /api/bulk/loans/return
 * Body: { loanIds: string[], reason?: string }
 *
 * Librarian-only. Returns success/failure per loan.
 *
 * Sprint L-Phase 2: Bulk Operations API.
 */

import { NextResponse } from "next/server";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { bulkReturnLoans } from "@/lib/bulk/bulk-operations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!isLibrarian(user!.role)) {
    return NextResponse.json(
      { error: "Hanya pustakawan yang dapat melakukan pengembalian massal" },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const loanIds: string[] = body.loanIds;
  const reason: string | undefined = body.reason;

  if (!Array.isArray(loanIds) || loanIds.length === 0) {
    return NextResponse.json(
      { error: "loanIds harus berupa array minimal 1 item" },
      { status: 400 }
    );
  }

  if (loanIds.length > 500) {
    return NextResponse.json(
      { error: "Maksimal 500 items per batch" },
      { status: 400 }
    );
  }

  const result = await bulkReturnLoans(loanIds, {
    userId: user!.id,
    reason: reason || "Bulk return",
  });

  // Audit log
  await logAudit({
    userId: user!.id,
    action: "BULK_RETURN_LOANS",
    resource: "Loan",
    resourceId: "bulk",
    changes: {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      reason,
    },
  });

  logger.info("Bulk loan return API", {
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
