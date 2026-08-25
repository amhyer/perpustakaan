import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { sendWhatsApp, normalizePhone, whatsappTemplates } from "@/lib/whatsapp";

export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "overdue";

    if (mode === "history") {
      const logs = await db.whatsAppLog2.findMany({
        orderBy: { sentAt: "desc" },
        take: 100,
      });
      return NextResponse.json(logs);
    }

    // Default: list overdue loans
    const overdueLoans = await db.loan.findMany({
      where: {
        status: { in: ["LOANED", "OVERDUE"] },
        dueDate: { lt: new Date() },
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            memberNumber: true,
            phone: true,
            classGrade: true,
          },
        },
        bookItem: {
          include: {
            book: { select: { title: true, author: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Enrich with existing notification status
    const loanIds = overdueLoans.map((l) => l.id);
    const sentLogs = await db.whatsAppLog2.findMany({
      where: { loanId: { in: loanIds } },
      select: { loanId: true, sentAt: true, status: true },
    });
    const logMap = new Map(sentLogs.map((l) => [l.loanId, l]));

    const enriched = overdueLoans.map((loan) => ({
      ...loan,
      daysOverdue: Math.ceil(
        (Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
      lastNotification: logMap.get(loan.id) || null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    const { loanIds } = body;

    if (!Array.isArray(loanIds) || loanIds.length === 0) {
      return NextResponse.json({ error: "loanIds wajib diisi" }, { status: 400 });
    }

    const loans = await db.loan.findMany({
      where: { id: { in: loanIds } },
      include: {
        member: { select: { fullName: true, memberNumber: true, phone: true } },
        bookItem: { include: { book: { select: { title: true } } } },
      },
    });

    const results = { sent: 0, failed: 0, skipped: 0 };

    for (const loan of loans) {
      if (!loan.member.phone) {
        results.skipped++;
        continue;
      }

      const daysOverdue = Math.ceil(
        (Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const message = whatsappTemplates.overdueNotice({
        name: loan.member.fullName,
        bookTitle: loan.bookItem.book.title,
        daysOverdue,
        fineAmount: daysOverdue * 500,
      });

      const phone = normalizePhone(loan.member.phone);
      const result = await sendWhatsApp({
        phone,
        message,
        category: "OVERDUE",
        relatedId: loan.id,
      });

      if (result.success) {
        await db.whatsAppLog2.create({
          data: {
            loanId: loan.id,
            memberId: loan.memberId,
            phone,
            message,
            status: "SENT",
          },
        });
        results.sent++;
      } else {
        results.failed++;
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
