import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireFullLibrarian, isLibrarian } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await params;

    // Non-librarians can only view their own profile
    if (!isLibrarian(user!.role) && user!.member?.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const member = await db.member.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, name: true } },
        loans: {
          include: { bookItem: { include: { book: true } } },
          orderBy: { loanDate: "desc" },
          take: 50,
        },
        reservations: { include: { book: true }, orderBy: { createdAt: "desc" } },
        wishlists: { include: { book: true }, orderBy: { createdAt: "desc" } },
        proposals: { orderBy: { createdAt: "desc" } },
        _count: { select: { loans: true, reservations: true } },
      },
    });

    if (!member) return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    return NextResponse.json(member);
  } catch (err) {
    console.error("GET member error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await params;
    const body = await req.json();

    // Pustakawan (penuh/junior) bisa edit semua; anggota hanya bisa edit sendiri sebagian
    const isLibrarianRole = isLibrarian(user!.role);
    const isOwner = user!.member?.id === id;
    if (!isLibrarianRole && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const member = await db.member.findUnique({ where: { id } });
    if (!member) return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.fullName !== undefined) data.fullName = body.fullName;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.address !== undefined) data.address = body.address;
    if (body.photo !== undefined) data.photo = body.photo;
    if (body.classGrade !== undefined) data.classGrade = body.classGrade;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.birthDate !== undefined) data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    // expiryDate hanya bisa diedit oleh pustakawan (Tahap 16 #4) — anggota tidak boleh set sendiri
    if (isLibrarianRole && body.expiryDate !== undefined) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;

    if (isLibrarianRole) {
      if (body.status !== undefined) data.status = body.status;
      if (body.category !== undefined) data.category = body.category;
      if (body.memberNumber !== undefined) data.memberNumber = body.memberNumber;
    }

    const updated = await db.member.update({
      where: { id },
      data,
      include: { user: { select: { email: true, role: true } } },
    });

    // Update email/password jika pustakawan
    if (isLibrarianRole) {
      if (body.email) {
        await db.user.update({ where: { id: member.userId }, data: { email: body.email.toLowerCase(), name: body.fullName || updated.fullName } });
      }
      if (body.password) {
        if (body.password.length < 8) {
          return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
        }
        const hash = await hashPassword(body.password);
        await db.user.update({ where: { id: member.userId }, data: { passwordHash: hash } });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT member error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireFullLibrarian();
  if (error) return error;
  try {
    const { id } = await params;

    // Nonaktifkan alih-alih hapus (untuk menjaga integritas data)
    await db.member.update({ where: { id }, data: { status: "INACTIVE" } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE member error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
