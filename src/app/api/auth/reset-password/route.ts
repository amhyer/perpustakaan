import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth";
import { rateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/auth/reset-password — reset password dengan token dari email.
 *
 * Body: { token: "...", newPassword: "..." }
 *
 * Token:
 * - Plain (dari URL email) → di-hash sha256 → dicocokkan dengan DB
 * - Hanya sekali pakai (usedAt di-set setelah berhasil)
 * - Expire 1 jam
 *
 * Setelah reset:
 * - Password di-update
 * - Semua session aktif di-invalidate (security best practice)
 * - Email notifikasi dikirim ke user
 */
export async function POST(req: Request) {
  // Rate limit
  const identifier = getClientIdentifier(req);
  const rl = rateLimit({
    key: `reset-pwd:${identifier}`,
    ...RATE_LIMITS.FORGOT_PASSWORD,
  });
  if (!rl.success) {
    return rateLimitResponse(rl, "Terlalu banyak percobaan. Coba lagi dalam 5 menit.");
  }

  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token dan password baru wajib diisi" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ error: "Password terlalu panjang" }, { status: 400 });
    }

    // Hash token untuk dicocokkan dengan DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await db.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: { include: { member: true } } },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ error: "Token sudah pernah digunakan" }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ error: "Token sudah kadaluwarsa. Minta link reset baru." }, { status: 400 });
    }

    // Hash password baru
    const passwordHash = await hashPassword(newPassword);

    // Update password + tandai token used + invalidate semua active session
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      db.activeSession.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    await logAudit(resetToken.userId, "SETTING_CHANGE", "User", resetToken.userId, "Password direset via email");

    // Kirim email konfirmasi
    const template = emailTemplates.passwordChanged({
      name: resetToken.user.member?.fullName || resetToken.user.name,
    });
    await sendEmail({
      to: resetToken.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: "RESET_PASSWORD",
      relatedId: resetToken.userId,
    }).catch((err) => console.error("[reset-password] Gagal kirim email:", err));

    return NextResponse.json({
      success: true,
      message: "Password berhasil direset. Silakan login dengan password baru.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal reset password", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
