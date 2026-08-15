import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireLibrarian } from "@/lib/auth";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const mine = searchParams.get("mine");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (mine === "1" && user!.member) where.memberId = user!.member.id;

  const proposals = await db.bookProposal.findMany({
    where,
    include: {
      member: { select: { id: true, fullName: true, memberNumber: true, category: true, classGrade: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(proposals);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const body = await req.json();

  if (!user!.member) return NextResponse.json({ error: "Anda belum terdaftar sebagai anggota" }, { status: 400 });
  if (!body.title) return NextResponse.json({ error: "Judul buku wajib diisi" }, { status: 400 });

  const proposal = await db.bookProposal.create({
    data: {
      memberId: user!.member.id,
      title: body.title,
      author: body.author || null,
      publisher: body.publisher || null,
      isbn: body.isbn || null,
      reason: body.reason || null,
      status: "PENDING",
    },
    include: { member: true },
  });

  // Notifikasi ke semua pustakawan
  const librarians = await db.user.findMany({ where: { role: "LIBRARIAN" } });
  await db.notification.createMany({
    data: librarians.map((lib) => ({
      userId: lib.id,
      title: "Usulan Buku Baru",
      message: `${user!.name} mengajukan usulan: "${body.title}"`,
      type: "INFO",
      relatedId: proposal.id,
    })),
  });

  return NextResponse.json(proposal, { status: 201 });
}

export async function PUT(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json();
  const proposal = await db.bookProposal.findUnique({
    where: { id: body.id },
    include: { member: true },
  });
  if (!proposal) return NextResponse.json({ error: "Usulan tidak ditemukan" }, { status: 404 });

  const updated = await db.bookProposal.update({
    where: { id: body.id },
    data: {
      status: body.status, // APPROVED | REJECTED
      reviewedBy: user!.id,
      reviewNote: body.reviewNote || null,
      reviewedAt: new Date(),
    },
    include: { member: true },
  });

  await db.notification.create({
    data: {
      userId: proposal.member.userId,
      title: body.status === "APPROVED" ? "Usulan Buku Disetujui!" : "Usulan Buku Ditolak",
      message:
        body.status === "APPROVED"
          ? `Usulan buku "${proposal.title}" disetujui. Akan segera diadakan.`
          : `Usulan buku "${proposal.title}" belum dapat disetujui. ${body.reviewNote || ""}`,
      type: body.status === "APPROVED" ? "INFO" : "WARNING",
      relatedId: proposal.id,
    },
  });

  return NextResponse.json(updated);
}
