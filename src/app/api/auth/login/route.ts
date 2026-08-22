import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { rateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createTempToken } from "@/lib/temp-token";
import crypto from "crypto";

export async function POST(req: Request) {
  // Rate limit by IP: max 5 attempt / menit (anti brute-force)
  const identifier = getClientIdentifier(req);
  const rl = rateLimit({
    key: `login:${identifier}`,
    ...RATE_LIMITS.LOGIN,
  });
  if (!rl.success) {
    return rateLimitResponse(rl, "Terlalu banyak percobaan login. Coba lagi dalam 1 menit.");
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { member: true, twoFactor: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const member = user.member;
    // Auto-deactivate expired members at login (Tahap 16 #4)
    if (
      member &&
      member.status === "ACTIVE" &&
      member.expiryDate &&
      (user.role === "TEACHER" || user.role === "STUDENT")
    ) {
      if (new Date(member.expiryDate) < new Date()) {
        await db.member.update({
          where: { id: member.id },
          data: { status: "INACTIVE" },
        });
        member.status = "INACTIVE";
      }
    }
    if (member && member.status !== "ACTIVE") {
      return NextResponse.json({ error: "Akun Anda dinonaktifkan atau kedaluwarsa. Hubungi pustakawan." }, { status: 403 });
    }

    // ===== 2FA Check (Tahap 17) =====
    if (user.twoFactor?.enabled && (user.role === "LIBRARIAN" || user.role === "PUSTAKAWAN_JUNIOR")) {
      const { token: tempToken } = await createTempToken(user.id, "2fa", 10);
      return NextResponse.json(
        {
          status: "2FA_REQUIRED",
          tempToken,
          message: "Masukkan kode 2FA dari authenticator app Anda.",
        },
        { status: 200 }
      );
    }

    // Normal login flow + track active session
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    await setSessionCookie(token);

    // Track session untuk force-logout feature
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const userAgent = req.headers.get("user-agent") || undefined;
    await db.activeSession.create({
      data: {
        userId: user.id,
        token: hashedToken,
        userAgent: userAgent?.substring(0, 255),
        ip: identifier,
        lastActive: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari
      },
    });

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
      member: member
        ? {
            id: member.id,
            memberNumber: member.memberNumber,
            fullName: member.fullName,
            category: member.category,
            photo: member.photo,
            classGrade: member.classGrade,
          }
        : null,
      defaultDashboard: pref.defaultDashboard,
    });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
