import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { COVER_COLORS } from "@/lib/constants";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category");
  const status = searchParams.get("status");

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

  const members = await db.member.findMany({
    where,
    include: {
      user: { select: { email: true, role: true } },
      _count: { select: { loans: true } },
    },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "LIBRARIAN") {
    return NextResponse.json({ error: "Hanya pustakawan yang dapat menambah anggota" }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, name, role, fullName, memberNumber, category, gender, birthDate, phone, address, photo, classGrade, expiryDate } = body;

  if (!email || !password || !name || !fullName || !memberNumber) {
    return NextResponse.json({ error: "Email, password, nama, dan nomor anggota wajib diisi" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });

  const existingMember = await db.member.findUnique({ where: { memberNumber } });
  if (existingMember) return NextResponse.json({ error: "Nomor anggota sudah digunakan" }, { status: 400 });

  const passwordHash = await hashPassword(password);
  const newUser = await db.user.create({
    data: { email: email.toLowerCase(), passwordHash, name, role: role || "STUDENT" },
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
}

export { COVER_COLORS };
