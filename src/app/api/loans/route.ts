import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isLibrarian } from "@/lib/auth";
import { LOAN_RULES, calculateFine } from "@/lib/constants";
import { computeDueDateWithHolidays } from "@/lib/loan-rules";

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const memberId = searchParams.get("memberId");
  const overdue = searchParams.get("overdue");
  const mine = searchParams.get("mine");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (memberId) where.memberId = memberId;
  if (mine === "1" && user!.member) where.memberId = user!.member.id;
  if (overdue === "1") {
    where.status = { in: ["LOANED", "OVERDUE"] };
    where.dueDate = { lt: new Date() };
  }

  const loans = await db.loan.findMany({
    where,
    include: {
      member: { select: { id: true, memberNumber: true, fullName: true, category: true, classGrade: true } },
      bookItem: { include: { book: { select: { id: true, title: true, author: true, coverColor: true, coverImage: true } } } },
    },
    orderBy: { loanDate: "desc" },
    take: 200,
  });

  // Update status overdue secara dinamis & hitung denda
  const now = new Date();
  const result = loans.map((l) => {
    let dynamicStatus = l.status;
    let dynamicFine = l.fineAmount;
    if (l.status === "LOANED" && l.dueDate < now) {
      dynamicStatus = "OVERDUE";
    }
    if (l.status !== "RETURNED") {
      const rule = LOAN_RULES[l.member.category] ?? LOAN_RULES.STUDENT;
      dynamicFine = calculateFine(l.dueDate, null, rule.finePerDay);
    }
    return { ...l, status: dynamicStatus, fineAmount: dynamicFine };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const body = await req.json();

  // Pustakawan (penuh atau junior) bisa meminjamkan untuk anggota lain; guru/siswa hanya untuk diri sendiri
  let memberId = body.memberId;
  if (!isLibrarian(user!.role)) {
    if (!user!.member) return NextResponse.json({ error: "Anda belum terdaftar sebagai anggota" }, { status: 400 });
    memberId = user!.member.id;
  }

  if (!memberId || !body.bookItemId) {
    return NextResponse.json({ error: "Anggota dan eksemplar buku wajib diisi" }, { status: 400 });
  }

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
  if (member.status !== "ACTIVE") return NextResponse.json({ error: "Anggota tidak aktif" }, { status: 400 });

  const item = await db.bookItem.findUnique({
    where: { id: body.bookItemId },
    include: { book: true },
  });
  if (!item) return NextResponse.json({ error: "Eksemplar tidak ditemukan" }, { status: 404 });
  if (item.status !== "AVAILABLE") {
    return NextResponse.json({ error: "Eksemplar tidak tersedia untuk dipinjam" }, { status: 400 });
  }

  // Cek kuota peminjaman
  const rule = LOAN_RULES[member.category] ?? LOAN_RULES.STUDENT;
  const activeLoans = await db.loan.count({
    where: { memberId, status: { in: ["LOANED", "OVERDUE"] } },
  });
  if (activeLoans >= rule.maxBooks) {
    return NextResponse.json({ error: `Kuota peminjaman penuh (maksimal ${rule.maxBooks} buku). Kembalikan buku lain dahulu.` }, { status: 400 });
  }

  // Cek denda belum dibayar / buku terlambat
  const overdueLoans = await db.loan.count({
    where: { memberId, status: "OVERDUE" },
  });
  if (overdueLoans > 0) {
    return NextResponse.json({ error: `Masih ada ${overdueLoans} buku terlambat. Kembalikan dahulu.` }, { status: 400 });
  }

  const loanDate = new Date();
  // Hitung dueDate dengan menyesuaikan hari libur (Tahap 15-B)
  // Jika dueDate awal jatuh di hari libur, geser maju ke hari kerja berikutnya
  const { dueDate, shiftedDays } = await computeDueDateWithHolidays(loanDate, member.category);

  const loan = await db.loan.create({
    data: {
      memberId,
      bookItemId: item.id,
      bookId: item.book.id,
      loanDate,
      dueDate,
      status: "LOANED",
      notes: body.notes || null,
    },
    include: {
      member: true,
      bookItem: { include: { book: true } },
    },
  });

  await db.bookItem.update({ where: { id: item.id }, data: { status: "BORROWED" } });

  // Notifikasi
  const shiftedNote = shiftedDays > 0
    ? ` (disesuaikan +${shiftedDays} hari karena jatuh di hari libur)`
    : "";
  await db.notification.create({
    data: {
      userId: member.userId,
      title: "Peminjaman Berhasil",
      message: `Anda meminjam "${item.book.title}". Jatuh tempo ${dueDate.toLocaleDateString("id-ID")}${shiftedNote}.`,
      type: "INFO",
      relatedId: loan.id,
    },
  });

  return NextResponse.json(loan, { status: 201 });
}
