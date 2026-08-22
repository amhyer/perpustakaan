/**
 * Advanced scheduler — pengingat bertingkat & reminder pintar.
 *
 * Fitur (Tahap 22 - Reminder Pintar):
 * - Reminder H-3, H-1, dan hari-H (jatuh tempo)
 * - Overdue reminder H+1, H+3, H+7 (eskalasi)
 * - Custom intervals via Settings
 *
 * Dipanggil dari /api/cron/daily-tasks atau secara manual.
 */

import { db } from "@/lib/db";
import { notify, notifyDueDateBatch, notifyOverdueBatch } from "@/lib/notification-service";

interface ScheduleResult {
  preDueReminders: number;
  overdueReminders: number;
  errors: number;
}

const DEFAULT_PRE_DUE_DAYS = [3, 1, 0]; // H-3, H-1, hari-H
const DEFAULT_OVERDUE_INTERVALS = [1, 3, 7]; // H+1, H+3, H+7

async function getScheduleSettings() {
  const [preRow, overRow] = await Promise.all([
    db.setting.findUnique({ where: { key: "reminder_pre_due_days" } }),
    db.setting.findUnique({ where: { key: "reminder_overdue_intervals" } }),
  ]);

  const parseDays = (val: string | undefined, fallback: number[]): number[] => {
    if (!val) return fallback;
    const parsed = val.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    return parsed.length > 0 ? parsed : fallback;
  };

  return {
    preDueDays: parseDays(preRow?.value, DEFAULT_PRE_DUE_DAYS),
    overdueIntervals: parseDays(overRow?.value, DEFAULT_OVERDUE_INTERVALS),
  };
}

/**
 * Jalankan reminder untuk semua loan.
 * Idempotent: cek dulu apakah reminder untuk interval ini sudah dikirim hari ini.
 */
export async function runSmartReminders(): Promise<ScheduleResult> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const { preDueDays, overdueIntervals } = await getScheduleSettings();
  let preDueReminders = 0;
  let overdueReminders = 0;
  let errors = 0;

  // ============ PRE-DUE REMINDERS ============
  for (const days of preDueDays) {
    const targetDate = new Date(now.getTime() + days * 86400000);
    const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const targetEnd = new Date(targetStart.getTime() + 86400000);

    const dueLoans = await db.loan.findMany({
      where: {
        status: "LOANED",
        dueDate: { gte: targetStart, lt: targetEnd },
      },
      include: {
        member: {
          select: {
            userId: true,
            fullName: true,
            category: true,
            phone: true,
          },
        },
        bookItem: { include: { book: { select: { title: true } } } },
      },
    });

    // Filter loan yang belum menerima reminder untuk interval ini hari ini
    const loansToNotify: typeof dueLoans = [];
    for (const loan of dueLoans) {
      const reminderTag = `DUE_${days}D`;
      const existing = await db.notification.findFirst({
        where: {
          userId: loan.member.userId,
          type: "DUE_DATE",
          relatedId: loan.id,
          createdAt: { gte: todayStart, lt: todayEnd },
          title: { contains: reminderTag },
        },
      });
      if (!existing) loansToNotify.push(loan);
    }

    if (loansToNotify.length > 0) {
      const result = await notifyDueDateBatch(loansToNotify);
      preDueReminders += result.notified;
      errors += result.errors;
    }
  }

  // ============ OVERDUE REMINDERS ============
  for (const days of overdueIntervals) {
    const targetDate = new Date(now.getTime() - days * 86400000);
    const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const targetEnd = new Date(targetStart.getTime() + 86400000);

    const overdueLoans = await db.loan.findMany({
      where: {
        status: "OVERDUE",
        dueDate: { gte: targetStart, lt: targetEnd },
      },
      include: {
        member: {
          select: {
            userId: true,
            fullName: true,
            category: true,
            phone: true,
          },
        },
        bookItem: { include: { book: { select: { title: true } } } },
      },
    });

    // Filter yang sudah dinotifikasi untuk interval ini
    const loansToNotify: typeof overdueLoans = [];
    for (const loan of overdueLoans) {
      const reminderTag = `OVERDUE_${days}D`;
      const existing = await db.notification.findFirst({
        where: {
          userId: loan.member.userId,
          type: "OVERDUE",
          relatedId: loan.id,
          createdAt: { gte: todayStart, lt: todayEnd },
          title: { contains: reminderTag },
        },
      });
      if (!existing) loansToNotify.push(loan);
    }

    if (loansToNotify.length > 0) {
      const result = await notifyOverdueBatch(loansToNotify);
      overdueReminders += result.notified;
      errors += result.errors;
    }
  }

  return { preDueReminders, overdueReminders, errors };
}
