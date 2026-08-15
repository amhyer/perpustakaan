import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { member: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const member = user.member;
    // Auto-deactivate expired members at login (Tahap 16 #4)
    // Pengecualian: LIBRARIAN & PUSTAKAWAN_JUNIOR TIDAK PERNAH auto-deactivate
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

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    await setSessionCookie(token);

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
    });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
