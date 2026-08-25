import { NextResponse } from "next/server";
import { requireAuth, verifyPassword, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Password lama dan password baru wajib diisi" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Password baru harus berbeda dari password lama" },
        { status: 400 }
      );
    }

    const fullUser = await db.user.findUnique({ where: { id: user!.id } });
    if (!fullUser) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, fullUser.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Password lama salah" },
        { status: 400 }
      );
    }

    const hash = await hashPassword(newPassword);
    await db.$transaction([
      db.user.update({ where: { id: user!.id }, data: { passwordHash: hash } }),
      db.activeSession.deleteMany({ where: { userId: user!.id } }),
    ]);

    return NextResponse.json({ success: true, message: "Password berhasil diubah. Silakan login kembali." });
  } catch (err) {
    console.error("PUT auth/change-password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
