import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { rateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail, emailTemplates } from "@/lib/email";

/**
 * POST /api/auth/forgot-password — minta reset password.
 *
 * Body: { email: "user@school.id" }
 *
 * Untuk ANTI-ENUMERATION: response SELALU return success (200) dengan pesan
 * generik, meskipun email tidak ada. Email hanya dikirim jika email valid.
 *
 * Token di-hash (sha256) sebelum disimpan. Token plain hanya dikembalikan
 * via email link.
 */
export async function POST(req: Request) {
  // Rate limit by IP (lebih ketat: 3 / 5 menit)
  const identifier = getClientIdentifier(req);
  const rl = rateLimit({
    key: `forgot-pwd:${identifier}`,
    ...RATE_LIMITS.FORGOT_PASSWORD,
  });
  if (!rl.success) {
    return rateLimitResponse(rl, "Terlalu banyak permintaan. Coba lagi dalam 5 menit.");
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { member: true },
    });

    // Selalu return success untuk anti-enumeration
    const genericResponse = NextResponse.json({
      success: true,
      message: "Jika email terdaftar, link reset telah dikirim. Cek inbox Anda.",
    });

    if (!user) return genericResponse;

    // Generate token random 32 byte
    const plainToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    // Hapus token lama untuk user ini
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    // Kirim email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    if (!appUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL atau NEXTAUTH_URL belum dikonfigurasi" }, { status: 500 });
    }
    const resetUrl = `${appUrl}/reset-password?token=${plainToken}`;
    const template = emailTemplates.passwordReset({
      name: user.member?.fullName || user.name,
      resetUrl,
      expiresInMinutes: 60,
    });

    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: "RESET_PASSWORD",
      relatedId: user.id,
    }).catch((err) => {
      // Log error tapi tetap return success ke user
      console.error("[forgot-password] Gagal kirim email:", err);
    });

    return genericResponse;
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal memproses permintaan", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
