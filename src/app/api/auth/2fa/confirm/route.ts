import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { verifyTotpCode, isValidTotpFormat, hashBackupCode } from "@/lib/two-factor";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/auth/2fa/confirm — konfirmasi setup 2FA dengan kode TOTP.
 * Setelah konfirmasi, secret diaktifkan dan backup codes di-hash.
 *
 * Body: { code: "123456" }
 */
export async function POST(req: Request) {
  const { user, error } = await requireRole("LIBRARIAN");
  if (error) return error;

  try {
    const body = await req.json();
    const { code, backupCodes } = body as { code: string; backupCodes: string[] };

    if (!code || !isValidTotpFormat(code)) {
      return NextResponse.json({ error: "Kode harus 6 digit angka" }, { status: 400 });
    }

    if (!Array.isArray(backupCodes) || backupCodes.length !== 8) {
      return NextResponse.json({ error: "Backup codes tidak valid" }, { status: 400 });
    }

    const twoFA = await db.twoFactorSecret.findUnique({ where: { userId: user!.id } });
    if (!twoFA) {
      return NextResponse.json({ error: "Setup 2FA belum dimulai. Panggil /api/auth/2fa/setup dulu." }, { status: 400 });
    }

    if (!verifyTotpCode(twoFA.secret, code)) {
      return NextResponse.json({ error: "Kode verifikasi salah" }, { status: 400 });
    }

    // Hash backup codes untuk disimpan
    const hashedCodes = backupCodes.map(hashBackupCode);

    await db.twoFactorSecret.update({
      where: { userId: user!.id },
      data: {
        enabled: true,
        enabledAt: new Date(),
        backupCodes: JSON.stringify(hashedCodes),
      },
    });

    await logAudit(user!.id, "SETTING_CHANGE", "TwoFactor", user!.id, "2FA diaktifkan");

    return NextResponse.json({ success: true, message: "2FA berhasil diaktifkan" });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal konfirmasi 2FA", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/2fa/confirm — disable 2FA (perlu password konfirmasi).
 * Body: { password: "..." }
 */
export async function DELETE(req: Request) {
  const { user, error } = await requireRole("LIBRARIAN");
  if (error) return error;

  try {
    const body = await req.json();
    const { password } = body as { password: string };

    if (!password) {
      return NextResponse.json({ error: "Password wajib diisi untuk menonaktifkan 2FA" }, { status: 400 });
    }

    const fullUser = await db.user.findUnique({ where: { id: user!.id } });
    if (!fullUser) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const { verifyPassword } = await import("@/lib/auth");
    const valid = await verifyPassword(password, fullUser.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    await db.twoFactorSecret.delete({ where: { userId: user!.id } });
    await logAudit(user!.id, "SETTING_CHANGE", "TwoFactor", user!.id, "2FA dinonaktifkan");

    return NextResponse.json({ success: true, message: "2FA berhasil dinonaktifkan" });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal menonaktifkan 2FA", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
