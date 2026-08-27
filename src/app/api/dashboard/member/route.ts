import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getLoanRule } from "@/lib/loan-rules";
import { ApiError } from "@/lib/response";
import { isMemberRole } from "@/lib/role-access";
import {
  buildClassActivity,
  buildClassmateRows,
  buildClassPulse,
  buildClassRanking,
  buildSilentStudents,
  describeLoanRules,
  latestActivityAt,
  summarizePulse,
} from "@/lib/member-dashboard";
import { readTaughtClasses, studentClassScope } from "@/lib/taught-classes";

/**
 * GET /api/dashboard/member
 * Data tambahan beranda yang berbeda untuk guru vs siswa.
 * Tidak mengembalikan statistik operasional pustakawan.
 */
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!isMemberRole(user!.role)) {
    return ApiError.forbidden("Beranda ini hanya untuk guru dan siswa.");
  }
  if (!user!.member) {
    return ApiError.forbidden("Akun belum terdaftar sebagai anggota.");
  }

  const member = user!.member;
  const rule = describeLoanRules(await getLoanRule(member.category));
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const now = new Date();

  if (user!.role === "TEACHER") {
    const taughtClasses = readTaughtClasses(member);
    const classScope = studentClassScope(taughtClasses);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const students = await db.member.findMany({
      where: { category: "STUDENT", status: "ACTIVE", ...classScope },
      select: {
        id: true,
        fullName: true,
        memberNumber: true,
        classGrade: true,
        loans: {
          where: {
            OR: [
              { status: { in: ["LOANED", "OVERDUE"] } },
              { status: "RETURNED", returnDate: { gte: yearStart } },
              { loanDate: { gte: thirtyDaysAgo } },
            ],
          },
          select: { status: true, dueDate: true, loanDate: true, returnDate: true },
        },
      },
      orderBy: [{ classGrade: "asc" }, { fullName: "asc" }],
    });

    const studentStats = students.map((s) => {
      const active = s.loans.filter((l) => l.status === "LOANED" || l.status === "OVERDUE");
      const overdue = active.filter((l) => l.status === "OVERDUE" || l.dueDate < now);
      const returned = s.loans.filter((l) => l.status === "RETURNED");
      const lastActivityAt = latestActivityAt(s.loans);
      return {
        id: s.id,
        fullName: s.fullName,
        memberNumber: s.memberNumber,
        classGrade: s.classGrade,
        activeLoanCount: active.length,
        overdueLoanCount: overdue.length,
        returnedThisYearCount: returned.length,
        lastActivityAt,
        loanThisMonth: s.loans.some((l) => l.loanDate >= monthStart),
      };
    });

    const classSummary = buildClassActivity(studentStats);
    const pulse = buildClassPulse(studentStats, now);
    const pulseTotal = summarizePulse(pulse);
    const silentStudents = buildSilentStudents(studentStats, now);

    const overdueStudents = await db.loan.findMany({
      where: {
        status: { in: ["LOANED", "OVERDUE"] },
        dueDate: { lt: now },
        member: { category: "STUDENT", status: "ACTIVE", ...classScope },
      },
      select: {
        id: true,
        dueDate: true,
        member: { select: { fullName: true, classGrade: true, memberNumber: true } },
        bookItem: { select: { book: { select: { id: true, title: true } } } },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    });

    const subject = member.classGrade?.trim() || "";
    let subjectBooks: {
      id: string;
      title: string;
      author: string;
      coverColor: string;
      coverImage: string | null;
      subject: string | null;
      available: number;
    }[] = [];

    if (subject) {
      const found = await db.book.findMany({
        where: {
          OR: [
            { subject: { contains: subject } },
            { title: { contains: subject } },
            { category: { name: { contains: subject } } },
          ],
        },
        select: {
          id: true,
          title: true,
          author: true,
          coverColor: true,
          coverImage: true,
          subject: true,
          items: { select: { status: true } },
        },
        take: 6,
      });
      subjectBooks = found.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        coverColor: b.coverColor,
        coverImage: b.coverImage,
        subject: b.subject,
        available: b.items.filter((i) => i.status === "AVAILABLE").length,
      }));
    }

    if (subjectBooks.length === 0) {
      const digital = await db.book.findMany({
        where: { OR: [{ source: "SIBI" }, { sourceUrl: { not: null } }] },
        select: {
          id: true,
          title: true,
          author: true,
          coverColor: true,
          coverImage: true,
          subject: true,
          items: { select: { status: true } },
        },
        take: 6,
      });
      subjectBooks = digital.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        coverColor: b.coverColor,
        coverImage: b.coverImage,
        subject: b.subject,
        available: b.items.filter((i) => i.status === "AVAILABLE").length,
      }));
    }

    return NextResponse.json({
      role: "TEACHER",
      rules: rule,
      teacher: {
        subject: subject || null,
        taughtClasses,
        needsClassSetup: taughtClasses.length === 0,
        studentCount: students.length,
        overdueCount: overdueStudents.length,
        classSummary,
        students: students.map((s) => {
          const active = s.loans.filter((l) => l.status === "LOANED" || l.status === "OVERDUE");
          const overdue = active.filter((l) => l.status === "OVERDUE" || l.dueDate < now);
          return {
            id: s.id,
            fullName: s.fullName,
            memberNumber: s.memberNumber,
            classGrade: s.classGrade,
            activeLoans: active.length,
            overdueLoans: overdue.length,
          };
        }),
        overdueStudents: overdueStudents.map((l) => ({
          id: l.id,
          dueDate: l.dueDate,
          memberName: l.member.fullName,
          memberNumber: l.member.memberNumber,
          classGrade: l.member.classGrade,
          bookId: l.bookItem.book.id,
          bookTitle: l.bookItem.book.title,
        })),
        subjectBooks,
        pulse,
        pulseTotal,
        silentStudents,
      },
      student: null,
    });
  }

  const classGrade = member.classGrade?.trim() || "";
  const mates = classGrade
    ? await db.member.findMany({
        where: {
          category: "STUDENT",
          status: "ACTIVE",
          classGrade,
        },
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
          _count: { select: { loans: true } },
        },
        take: 24,
      })
    : [];

  const booksReadThisYear = await db.loan.count({
    where: {
      memberId: member.id,
      status: "RETURNED",
      returnDate: { gte: yearStart },
    },
  });

  const mateInputs = mates.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    memberNumber: m.memberNumber,
    loanCount: m._count.loans,
  }));
  const ranking = buildClassRanking(mateInputs, member.id);

  return NextResponse.json({
    role: "STUDENT",
    rules: rule,
    teacher: null,
    student: {
      classGrade: classGrade || null,
      booksReadThisYear,
      ranking,
      classmates: buildClassmateRows(mateInputs, member.id),
    },
  });
}
