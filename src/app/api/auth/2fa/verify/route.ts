import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTempToken } from "@/lib/temp-token";
import { verifyTotpCode, isValidTotpFormat, verifyBackupCode } from "@/lib/two-factor";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

/**
 * POST /api/auth/2fa/verify — verifikasi kode TOTP setelah login.
 *
 * Flow:
 * 1. User login dengan email+password → jika 2FA aktif, return
 *    { status: "2FA_REQUIRED", tempToken } (bukan session cookie)
 * 2. Frontend minta user masukkan kode 6 digit
 * 3. POST /api/auth/2fa/verify { tempToken, code }
 * 4. Server verify token + kode, jika sukses → set session cookie
 *
 * Body: { tempToken: "...", code: "123456" }
 * Backup code juga diterima (8 char alphanumeric).
 */
export async function POST(req: Request) {
  // Rate limit by IP
  const identifier = getClientIdentifier(req);
  const rl = rateLimit({
    key: `2fa-verify:${identifier}`,
    ...RATE_LIMITS.LOGIN,
  });
  if (!rl.success) {
    return rateLimitResponse(rl, "Terlalu banyak percobaan verifikasi. Coba lagi dalam 1 menit.");
  }

  try {
    const body = await req.json();
    const { tempToken, code } = body as { tempToken: string; code: string };

    if (!tempToken || !code) {
      return NextResponse.json({ error: "Token dan kode wajib diisi" }, { status: 400 });
    }

    // Verify temp token
    const tokenData = await verifyTempToken(tempToken, "2fa");
    if (!tokenData) {
      return NextResponse.json({ error: "Token tidak valid atau sudah kadaluwarsa" }, { status: 401 });
    }

    // Ambil 2FA secret
    const twoFA = await db.twoFactorSecret.findUnique({ where: { userId: tokenData.userId } });
    if (!twoFA || !twoFA.enabled) {
      return NextResponse.json({ error: "2FA tidak aktif untuk akun ini" }, { status: 400 });
    }

    let verified = false;

    // Cek kode TOTP (6 digit) ATAU backup code (8 char)
    if (isValidTotpFormat(code)) {
      verified = verifyTotpCode(twoFA.secret, code);
    } else {
      // Backup code
      const hashedCodes: string[] = JSON.parse(twoFA.backupCodes || "[]");
      const matchIndex = hashedCodes.findIndex((h) => verifyBackupCode(code, h));
      if (matchIndex >= 0) {
        // Hapus backup code yang dipakai (sekali pakai)
        hashedCodes.splice(matchIndex, 1);
        await db.twoFactorSecret.update({
          where: { userId: tokenData.userId },
          data: { backupCodes: JSON.stringify(hashedCodes) },
        });
        verified = true;
      }
    }

    if (!verified) {
      return NextResponse.json({ error: "Kode verifikasi salah" }, { status: 401 });
    }

    // Sukses — ambil user, create session
    const user = await db.user.findUnique({
      where: { id: tokenData.userId },
      include: { member: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (user.member && user.member.status !== "ACTIVE") {
      return NextResponse.json({ error: "Akun dinonaktifkan" }, { status: 403 });
    }

    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    await setSessionCookie(sessionToken);

    // Ambil default dashboard preference (Sprint 4 — Fix #9)
    const pref = await db.userPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, defaultDashboard: "default" },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      member: user.member
        ? {
            id: user.member.id,
            memberNumber: user.member.memberNumber,
            fullName: user.member.fullName,
            category: user.member.category,
            photo: user.member.photo,
            classGrade: user.member.classGrade,
          }
        : null,
      defaultDashboard: pref.defaultDashboard,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal verifikasi 2FA", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
