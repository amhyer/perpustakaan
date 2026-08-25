import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { COVER_COLORS } from "@/lib/constants";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    // Pagination (Tahap 16 #26) — backward compatible
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam) : null;
    const pageSize = parseInt(searchParams.get("pageSize") || "12");

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q } },
        { memberNumber: { contains: q } },
        { phone: { contains: q } },
        { classGrade: { contains: q } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const include = {
      user: { select: { email: true, role: true } },
      _count: { select: { loans: true } },
    };

    // Mode pagination: return { data, total, page, pageSize }
    if (page !== null && !isNaN(page)) {
      const [members, total] = await Promise.all([
        db.member.findMany({
          where,
          include,
          orderBy: { fullName: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.member.count({ where }),
      ]);
      return NextResponse.json({ data: members, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }

    // Mode lama (tanpa pagination): return array biasa
    const members = await db.member.findMany({
      where,
      include,
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(members);
  } catch (err) {
    console.error("GET members error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;
  try {
    const body = await req.json();
    const { email, password, name, role, fullName, memberNumber, category, gender, birthDate, phone, address, photo, classGrade, expiryDate } = body;

    if (!email || !password || !name || !fullName || !memberNumber) {
      return NextResponse.json({ error: "Email, password, nama, dan nomor anggota wajib diisi" }, { status: 400 });
    }

    // Validasi format email (Tahap 16 #21)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    // Validasi password minimal 8 karakter dengan complexity (Tahap 16 #22)
    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password harus mengandung huruf besar dan angka" }, { status: 400 });
    }

    // Role validation: only STUDENT and TEACHER allowed for member creation
    const ALLOWED_ROLES = ["STUDENT", "TEACHER"];
    const userRole = role && ALLOWED_ROLES.includes(role) ? role : "STUDENT";

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });

    const existingMember = await db.member.findUnique({ where: { memberNumber } });
    if (existingMember) return NextResponse.json({ error: "Nomor anggota sudah digunakan" }, { status: 400 });

    const passwordHash = await hashPassword(password);
    const newUser = await db.user.create({
      data: { email: email.toLowerCase(), passwordHash, name, role: userRole },
    });

    const member = await db.member.create({
      data: {
        userId: newUser.id,
        memberNumber,
        fullName,
        category: category || "STUDENT",
        status: "ACTIVE",
        gender: gender || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        phone: phone || null,
        address: address || null,
        photo: photo || null,
        classGrade: classGrade || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      include: { user: { select: { email: true, role: true } } },
    });

    // Notifikasi sambutan
    await db.notification.create({
      data: {
        userId: newUser.id,
        title: "Selamat Datang!",
        message: `Selamat datang di Perpustakaan Jendela Ilmu, ${fullName}. Akun Anda telah aktif.`,
        type: "INFO",
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error("POST members error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { COVER_COLORS };
