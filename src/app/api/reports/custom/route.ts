import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/reports/custom — custom report builder.
 *
 * Query params:
 * - type: report type (loans-by-period, loans-by-category, etc)
 * - dateFrom, dateTo: date range
 * - groupBy: day/week/month/category/member/book
 * - memberCategory: STUDENT/TEACHER/LIBRARIAN
 * - categoryId: filter by category
 */
export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "loans-by-period";
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const groupBy = url.searchParams.get("groupBy") || "day";
    const memberCategory = url.searchParams.get("memberCategory");
    const categoryId = url.searchParams.get("categoryId");

    const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
    const toDate = dateTo ? new Date(dateTo + "T23:59:59") : new Date();
    const dateFilter = { gte: fromDate, lte: toDate };

    let data: any[] = [];
    let summary: Record<string, any> = {};

    switch (type) {
      case "loans-by-period": {
        const loans = await db.loan.findMany({
          where: { loanDate: dateFilter },
          include: {
            member: { select: { category: true } },
            bookItem: { include: { book: { include: { category: true } } } },
          },
        });

        // Group by period
        const grouped = new Map<string, number>();
        for (const loan of loans) {
          let key: string;
          const d = new Date(loan.loanDate);
          if (groupBy === "day") {
            key = d.toISOString().slice(0, 10);
          } else if (groupBy === "week") {
            const weekNum = getWeekNumber(d);
            key = `${d.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
          } else if (groupBy === "month") {
            key = d.toISOString().slice(0, 7);
          } else {
            key = d.toISOString().slice(0, 10);
          }
          grouped.set(key, (grouped.get(key) || 0) + 1);
        }
        data = Array.from(grouped.entries())
          .map(([period, count]) => ({ period, count }))
          .sort((a, b) => a.period.localeCompare(b.period));

        summary = {
          totalLoans: loans.length,
          avgPerDay: Math.round(loans.length / Math.max(1, getDaysDiff(fromDate, toDate))),
        };
        break;
      }

      case "loans-by-category": {
        const loans = await db.loan.findMany({
          where: { loanDate: dateFilter },
          include: {
            bookItem: { include: { book: { include: { category: true } } } },
          },
        });
        const grouped = new Map<string, number>();
        for (const loan of loans) {
          const cat = loan.bookItem.book.category?.name || "Tanpa Kategori";
          grouped.set(cat, (grouped.get(cat) || 0) + 1);
        }
        data = Array.from(grouped.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count);

        summary = {
          totalCategories: data.length,
          totalLoans: loans.length,
        };
        break;
      }

      case "loans-by-member": {
        const loans = await db.loan.findMany({
          where: {
            loanDate: dateFilter,
            ...(memberCategory
              ? { member: { category: memberCategory } }
              : {}),
          },
          include: {
            member: { select: { fullName: true, memberNumber: true, category: true, classGrade: true } },
          },
        });
        const grouped = new Map<string, any>();
        for (const loan of loans) {
          const id = loan.memberId;
          const existing = grouped.get(id) || {
            memberId: id,
            memberName: loan.member.fullName,
            memberNumber: loan.member.memberNumber,
            category: loan.member.category,
            classGrade: loan.member.classGrade,
            loanCount: 0,
          };
          existing.loanCount++;
          grouped.set(id, existing);
        }
        data = Array.from(grouped.values()).sort((a, b) => b.loanCount - a.loanCount);
        summary = {
          activeMembers: data.length,
          totalLoans: loans.length,
        };
        break;
      }

      case "overdue-summary": {
        const overdue = await db.loan.findMany({
          where: { status: { in: ["LOANED", "OVERDUE"] }, dueDate: { lt: new Date() } },
          include: {
            member: { select: { fullName: true, memberNumber: true, category: true } },
            bookItem: { include: { book: { select: { title: true, author: true } } } },
          },
        });
        data = overdue.map((l) => {
          const daysOverdue = Math.ceil(
            (Date.now() - new Date(l.dueDate).getTime()) / 86400000
          );
          const rule = l.member.category === "TEACHER" ? 500 : 1000;
          return {
            memberName: l.member.fullName,
            memberNumber: l.member.memberNumber,
            bookTitle: l.bookItem.book.title,
            dueDate: new Date(l.dueDate).toLocaleDateString("id-ID"),
            daysOverdue,
            estimatedFine: daysOverdue * rule,
          };
        });
        data.sort((a, b) => b.daysOverdue - a.daysOverdue);
        summary = {
          totalOverdue: data.length,
          totalEstimatedFine: data.reduce((s, d) => s + d.estimatedFine, 0),
        };
        break;
      }

      case "popular-books": {
        const raw = await db.loan.groupBy({
          by: ["bookId"],
          where: { loanDate: dateFilter },
          _count: true,
          orderBy: { _count: { bookId: "desc" } },
          take: 50,
        });
        const bookIds = raw.map((r) => r.bookId);
        const books = await db.book.findMany({ where: { id: { in: bookIds } } });
        const bookMap = new Map(books.map((b) => [b.id, b]));
        data = raw
          .map((r) => {
            const b = bookMap.get(r.bookId);
            return b
              ? {
                  title: b.title,
                  author: b.author,
                  isbn: b.isbn,
                  loanCount: r._count,
                }
              : null;
          })
          .filter(Boolean);
        summary = {
          topBook: data[0]?.title || "-",
          totalLoans: data.reduce((s, d) => s + d.loanCount, 0),
        };
        break;
      }

      case "member-activity": {
        const members = await db.member.findMany({
          where: {
            ...(memberCategory ? { category: memberCategory } : {}),
          },
          include: {
            loans: {
              where: { loanDate: dateFilter },
              select: { id: true, status: true, fineAmount: true },
            },
          },
        });
        data = members
          .map((m) => {
            const totalLoans = m.loans.length;
            const active = m.loans.filter((l) => l.status === "LOANED" || l.status === "OVERDUE").length;
            const returned = m.loans.filter((l) => l.status === "RETURNED").length;
            const totalFine = m.loans.reduce((s, l) => s + l.fineAmount, 0);
            return {
              memberNumber: m.memberNumber,
              fullName: m.fullName,
              category: m.category,
              totalLoans,
              activeLoans: active,
              returnedLoans: returned,
              totalFine,
            };
          })
          .filter((m) => m.totalLoans > 0)
          .sort((a, b) => b.totalLoans - a.totalLoans);
        summary = {
          activeMembers: data.length,
          totalTransactions: data.reduce((s, d) => s + d.totalLoans, 0),
        };
        break;
      }

      case "fine-collection": {
        const loans = await db.loan.findMany({
          where: { loanDate: dateFilter, fineAmount: { gt: 0 } },
          include: {
            member: { select: { fullName: true, memberNumber: true } },
            bookItem: { include: { book: { select: { title: true } } } },
          },
          orderBy: { fineAmount: "desc" },
        });
        data = loans.map((l) => ({
          memberName: l.member.fullName,
          memberNumber: l.member.memberNumber,
          bookTitle: l.bookItem.book.title,
          fineAmount: l.fineAmount,
          finePaid: l.finePaid,
          fineUnpaid: l.fineAmount - l.finePaid,
          status: l.status,
        }));
        summary = {
          totalFines: data.reduce((s, d) => s + d.fineAmount, 0),
          totalCollected: data.reduce((s, d) => s + d.finePaid, 0),
          totalUnpaid: data.reduce((s, d) => s + d.fineUnpaid, 0),
          collectionRate:
            data.length > 0
              ? Math.round(
                  (data.reduce((s, d) => s + d.finePaid, 0) /
                    data.reduce((s, d) => s + d.fineAmount, 0)) *
                    100
                ) / 100
              : 0,
        };
        break;
      }

      case "book-condition": {
        const items = await db.bookItem.findMany({
          include: {
            book: {
              select: { title: true, author: true, category: { select: { name: true } } },
            },
          },
        });
        const grouped = new Map<string, number>();
        for (const item of items) {
          grouped.set(item.condition, (grouped.get(item.condition) || 0) + 1);
        }
        data = Array.from(grouped.entries()).map(([condition, count]) => ({
          condition,
          count,
          percentage: Math.round((count / items.length) * 1000) / 10,
        }));
        summary = {
          totalItems: items.length,
          damagedCount: items.filter((i) => i.condition !== "BAIK").length,
          lostCount: items.filter((i) => i.status === "LOST").length,
        };
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
    }

    return NextResponse.json({
      type,
      totalRows: data.length,
      data,
      summary,
      period: { from: fromDate, to: toDate },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Report generation failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Gagal generate laporan" }, { status: 500 });
  }
}

function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}

function getDaysDiff(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
}
