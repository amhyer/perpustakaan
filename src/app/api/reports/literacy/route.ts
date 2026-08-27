import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canAccessLiteracyReport } from "@/lib/role-access";
import { classGradeMatchValues, readTaughtClasses, resolveTeacherClassFilter } from "@/lib/taught-classes";

// GET /api/reports/literacy?classGrade=X&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Laporan literasi untuk GLS/Akreditasi: buku dibaca per siswa per kelas
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!canAccessLiteracyReport(user!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const classGrade = searchParams.get("classGrade") || "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build where clause untuk loans RETURNED
  const dateFilter: Record<string, unknown> = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  const loanWhere: Record<string, unknown> = {
    status: "RETURNED",
  };
  if (Object.keys(dateFilter).length > 0) {
    loanWhere.loanDate = dateFilter;
  }

  const memberWhere: Record<string, unknown> = {
    category: "STUDENT",
    status: "ACTIVE",
  };
  let scopedClasses: string[] | null = null;
  if (user!.role === "TEACHER") {
    const taught = readTaughtClasses(user!.member);
    scopedClasses = resolveTeacherClassFilter(taught, classGrade);
    memberWhere.classGrade = { in: classGradeMatchValues(scopedClasses) };
  } else if (classGrade) {
    memberWhere.classGrade = { in: classGradeMatchValues([classGrade]) };
  }

  // Ambil semua member siswa (filtered by class)
  const members = await db.member.findMany({
    where: memberWhere,
    select: {
      id: true,
      memberNumber: true,
      fullName: true,
      classGrade: true,
      loans: {
        where: loanWhere,
        include: {
          bookItem: {
            select: {
              book: {
                select: {
                  id: true,
                  title: true,
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { loanDate: "desc" },
      },
    },
    orderBy: { fullName: "asc" },
  });

  // Build per-student data
  const students = members.map((m) => {
    const booksRead = m.loans.length;
    // Count categories
    const categoryCount = new Map<string, { name: string; count: number }>();
    for (const loan of m.loans) {
      const catId = loan.bookItem.book.categoryId ?? "unknown";
      const catName = loan.bookItem.book.category?.name ?? "Tanpa Kategori";
      const existing = categoryCount.get(catId);
      if (existing) {
        existing.count++;
      } else {
        categoryCount.set(catId, { name: catName, count: 1 });
      }
    }
    // Favorite category
    let favoriteCategory = "-";
    let maxCount = 0;
    for (const [, val] of categoryCount) {
      if (val.count > maxCount) {
        maxCount = val.count;
        favoriteCategory = val.name;
      }
    }

    return {
      id: m.id,
      memberNumber: m.memberNumber,
      fullName: m.fullName,
      classGrade: m.classGrade ?? "-",
      booksRead,
      favoriteCategory,
      categories: Array.from(categoryCount.values()).sort((a, b) => b.count - a.count),
    };
  });

  // Filter out students with 0 books if no specific class selected
  // (untuk laporan literasi, hanya tampilkan yang ada aktivitasnya)
  const activeStudents = students.filter((s) => s.booksRead > 0);

  // Ringkasan per kelas
  const classMap = new Map<string, { totalBooks: number; studentCount: number; students: typeof activeStudents }>();
  for (const s of activeStudents) {
    const cg = s.classGrade;
    const existing = classMap.get(cg);
    if (existing) {
      existing.totalBooks += s.booksRead;
      existing.studentCount++;
      existing.students.push(s);
    } else {
      classMap.set(cg, { totalBooks: s.booksRead, studentCount: 1, students: [s] });
    }
  }

  const classSummary = Array.from(classMap.entries()).map(([className, data]) => {
    const avg = data.studentCount > 0 ? Math.round(data.totalBooks / data.studentCount) : 0;
    const topStudent = data.students.sort((a, b) => b.booksRead - a.booksRead)[0];
    // Kategori terpopuler di kelas ini
    const classCatCount = new Map<string, number>();
    for (const s of data.students) {
      for (const cat of s.categories) {
        classCatCount.set(cat.name, (classCatCount.get(cat.name) ?? 0) + cat.count);
      }
    }
    let popularCategory = "-";
    let maxCat = 0;
    for (const [name, count] of classCatCount) {
      if (count > maxCat) {
        maxCat = count;
        popularCategory = name;
      }
    }
    return {
      className,
      totalBooks: data.totalBooks,
      studentCount: data.studentCount,
      average: avg,
      topStudent: topStudent ? topStudent.fullName : "-",
      topStudentBooks: topStudent ? topStudent.booksRead : 0,
      popularCategory,
    };
  }).sort((a, b) => a.className.localeCompare(b.className));

  return NextResponse.json({
    students: activeStudents,
    classSummary,
    totalBooksRead: activeStudents.reduce((sum, s) => sum + s.booksRead, 0),
    totalActiveStudents: activeStudents.length,
    filter: {
      classGrade: classGrade || (scopedClasses ? scopedClasses.join(", ") || "Kelas belum diatur" : "Semua Kelas"),
      startDate: startDate || null,
      endDate: endDate || null,
    },
  });
}
