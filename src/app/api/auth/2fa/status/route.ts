import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/auth/2fa/status — cek status 2FA user saat ini.
 * Returns: { enabled: boolean, enabledAt: string | null }
 */
export async function GET() {
  const { user, error } = await requireRole("LIBRARIAN", "PUSTAKAWAN_JUNIOR");
  if (error) return error;

  const twoFA = await db.twoFactorSecret.findUnique({ where: { userId: user!.id } });

  return NextResponse.json({
    enabled: twoFA?.enabled ?? false,
    enabledAt: twoFA?.enabledAt?.toISOString() ?? null,
  });
}
