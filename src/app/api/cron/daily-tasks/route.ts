import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/cron/daily-tasks — cron job harian
// Dilindungi CRON_SECRET via header Authorization: Bearer <secret>
// Tugas:
// (a) Pinjaman aktif dengan jatuh tempo BESOK → notifikasi in-app (idempotent)
// (b) Pinjaman aktif yang jatuh temponya sudah lewat → update status OVERDUE
export async function POST(req: Request) {
  // Auth via Bearer token
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);

    // (a) Pinjaman dengan jatuh tempo BESOK → notifikasi (idempotent)
    // Cek: dueDate di rentang [besok 00:00, besok 23:59], status LOANED
    const dueTomorrowLoans = await db.loan.findMany({
      where: {
        status: "LOANED",
        dueDate: { gte: tomorrowStart, lt: tomorrowEnd },
      },
      include: { member: { select: { userId: true, fullName: true } } },
    });

    let notificationsCreated = 0;
    for (const loan of dueTomorrowLoans) {
      // Idempotent: cek apakah sudah ada notifikasi DUE_DATE untuk loan ini hari ini
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const existing = await db.notification.findFirst({
        where: {
          userId: loan.member.userId,
          type: "DUE_DATE",
          relatedId: loan.id,
          createdAt: { gte: todayStart, lt: todayEnd },
        },
      });
      if (existing) continue; // Sudah ada, skip (idempotent)

      await db.notification.create({
        data: {
          userId: loan.member.userId,
          title: "Pengingat Jatuh Tempo",
          message: `Buku Anda jatuh tempo besok (${tomorrow.toLocaleDateString("id-ID")}). Kembalikan tepat waktu untuk hindari denda.`,
          type: "DUE_DATE",
          relatedId: loan.id,
        },
      });
      notificationsCreated++;
    }

    // (b) Update pinjaman LOANED yang sudah lewat jatuh tempo → OVERDUE
    const overdueResult = await db.loan.updateMany({
      where: {
        status: "LOANED",
        dueDate: { lt: now },
      },
      data: { status: "OVERDUE" },
    });

    return NextResponse.json({
      success: true,
      date: now.toISOString().slice(0, 10),
      tasks: {
        dueTomorrowNotified: notificationsCreated,
        overdueUpdated: overdueResult.count,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal menjalankan daily tasks", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
