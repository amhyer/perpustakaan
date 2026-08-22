import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { generateTotpSecret, generateOtpAuthUri, generateBackupCodes } from "@/lib/two-factor";

/**
 * POST /api/auth/2fa/setup — mulai proses setup 2FA untuk pustakawan.
 * Return: { secret, otpAuthUri, backupCodes }
 * Pustakawan harus scan QR lalu konfirmasi via /api/auth/2fa/confirm.
 */
export async function POST(req: Request) {
  const { user, error } = await requireRole("LIBRARIAN");
  if (error) return error;

  try {
    const secret = generateTotpSecret();
    const otpAuthUri = generateOtpAuthUri(secret, user!.email, "Jendela Ilmu");
    const { plain: backupCodes } = generateBackupCodes(8);

    // Simpan secret (enabled=false dulu, akan diaktifkan setelah konfirmasi)
    await db.twoFactorSecret.upsert({
      where: { userId: user!.id },
      create: { userId: user!.id, secret, enabled: false },
      update: { secret, enabled: false, enabledAt: null },
    });

    return NextResponse.json({
      secret,
      otpAuthUri,
      backupCodes, // plain — hanya ditampilkan SEKALI
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal setup 2FA", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
