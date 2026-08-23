/**
 * Notification Schedule Service
 *
 * Menjalankan notifikasi berkala (digest mingguan/bulanan) berdasarkan
 * NotificationSchedule table.
 *
 * Contoh:
 * - Weekly digest untuk siswa: ringkasan poin minggu ini
 * - Monthly recap untuk guru: top 3 reader di kelas
 * - Anniversary reminder: member yang join X tahun lalu
 *
 * Scheduler logic (dipanggil dari cron harian):
 * 1. Cari schedule yang enabled & due (sesuai dayOfWeek/dayOfMonth)
 * 2. Untuk setiap member yang match targetRole, kirim notifikasi
 * 3. Update lastRunAt, lastRunStatus, lastRunCount
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notification-service";
import { getBalance } from "@/lib/points-engine";
import { getTopMembers } from "@/lib/semester-archive";

/**
 * Jalankan semua notifikasi yang due hari ini.
 * Dipanggil dari cron /api/cron/notification-digest.
 */
export async function runDueNotifications(now: Date = new Date()): Promise<{
  ran: number;
  success: number;
  failed: number;
}> {
  const dayOfWeek = now.getDay(); // 0-6 (Sun-Sat)
  const dayOfMonth = now.getDate(); // 1-31
  const hour = now.getHours();

  // Cari schedule yang due (match day & enabled)
  const schedules = await db.notificationSchedule.findMany({
    where: {
      enabled: true,
      hour,
      OR: [
        { type: "WEEKLY", dayOfWeek },
        { type: "MONTHLY", dayOfMonth },
        { type: "CUSTOM" }, // CUSTOM always run (controlled externally)
      ],
    },
  });

  let success = 0;
  let failed = 0;

  for (const schedule of schedules) {
    try {
      const count = await runSchedule(schedule);
      success += count > 0 ? 1 : 0;
    } catch (err) {
      failed += 1;
      logger.error("Notification schedule failed", {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        error: String(err),
      });
    }
  }

  logger.info("Notification digest run", {
    total: schedules.length,
    success,
    failed,
  });

  return { ran: schedules.length, success, failed };
}

/**
 * Jalankan satu schedule.
 */
async function runSchedule(schedule: {
  id: string;
  name: string;
  type: string;
  channel: string;
  targetRole: string;
  templateKey: string;
}): Promise<number> {
  let count = 0;

  // === Weekly Student Digest ===
  if (schedule.templateKey === "weeklyDigestStudent") {
    count = await sendWeeklyDigestStudents();
  }
  // === Monthly Top Reader Notification ===
  else if (schedule.templateKey === "monthlyTopReader") {
    count = await sendMonthlyTopReader();
  }
  // === Weekly Teacher Recap ===
  else if (schedule.templateKey === "weeklyDigestTeacher") {
    count = await sendWeeklyDigestTeachers();
  } else {
    logger.warn("Unknown templateKey", { templateKey: schedule.templateKey });
  }

  // Update lastRun
  await db.notificationSchedule.update({
    where: { id: schedule.id },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: count > 0 ? "success" : "partial",
      lastRunCount: count,
    },
  });

  return count;
}

/**
 * Weekly digest untuk siswa: ringkasan poin minggu ini.
 */
async function sendWeeklyDigestStudents(): Promise<number> {
  const weekStart = new Date(Date.now() - 7 * 86400000);

  // Get all students
  const students = await db.member.findMany({
    where: { category: "STUDENT", status: "ACTIVE" },
    select: { id: true, userId: true, fullName: true },
  });

  let count = 0;
  for (const student of students) {
    // Get stats untuk minggu ini
    const weekTxns = await db.pointTransaction.findMany({
      where: {
        memberId: student.id,
        type: "EARN",
        createdAt: { gte: weekStart },
      },
    });
    const weekPoints = weekTxns.reduce((sum, t) => sum + t.amount, 0);
    const booksRead = await db.loan.count({
      where: {
        memberId: student.id,
        status: "RETURNED",
        returnDate: { gte: weekStart },
      },
    });

    // Skip kalau gak ada aktivitas minggu ini
    if (weekPoints === 0 && booksRead === 0) continue;

    const balance = await getBalance(student.id);

    await notify({
      userId: student.userId,
      title: "📊 Ringkasan Mingguan Poin",
      message: `Minggu ini: +${weekPoints} poin, ${booksRead} buku selesai. Saldo total: ${balance} poin.`,
      type: "INFO",
    });
    count++;
  }

  return count;
}

/**
 * Monthly top reader — kirim ke top 10 members.
 */
async function sendMonthlyTopReader(): Promise<number> {
  const top = await getTopMembers(10);
  let count = 0;

  for (const entry of top) {
    const member = await db.member.findUnique({
      where: { id: entry.memberId },
      select: { userId: true, fullName: true },
    });
    if (!member) continue;

    await notify({
      userId: member.userId,
      title: `🏆 Anda di Top ${entry.rank} Bulan Ini!`,
      message: `Selamat! Anda排名第 ${entry.rank} pembaca bulan ini dengan ${entry.totalPoints} poin dari ${entry.booksRead} buku.`,
      type: "ANNOUNCEMENT",
    });
    count++;
  }

  return count;
}

/**
 * Weekly recap untuk guru: aktivitas anggota di periode guru.
 */
async function sendWeeklyDigestTeachers(): Promise<number> {
  const weekStart = new Date(Date.now() - 7 * 86400000);

  const teachers = await db.member.findMany({
    where: { category: "TEACHER", status: "ACTIVE" },
    select: { id: true, userId: true, fullName: true, classGrade: true },
  });

  let count = 0;
  for (const teacher of teachers) {
    // Get loans in teacher's class (simplified: by classGrade)
    const studentLoans = teacher.classGrade
      ? await db.loan.count({
          where: {
            member: { classGrade: teacher.classGrade, status: "ACTIVE" },
            createdAt: { gte: weekStart },
          },
        })
      : 0;

    await notify({
      userId: teacher.userId,
      title: "📚 Recap Mingguan",
      message: `Minggu ini, ${studentLoans} buku dipinjam di ${teacher.classGrade || "kelas Anda"}. Terus dorong literasi!`,
      type: "INFO",
    });
    count++;
  }

  return count;
}

/**
 * Initialize default schedules (seed).
 */
export async function seedDefaultSchedules() {
  const defaults = [
    {
      name: "Weekly Student Digest",
      type: "WEEKLY",
      channel: "BOTH",
      targetRole: "STUDENT",
      dayOfWeek: 0, // Sunday
      dayOfMonth: null,
      hour: 18, // 6 PM
      templateKey: "weeklyDigestStudent",
    },
    {
      name: "Monthly Top Reader",
      type: "MONTHLY",
      channel: "BOTH",
      targetRole: "STUDENT",
      dayOfWeek: null,
      dayOfMonth: 1, // 1st of month
      hour: 9, // 9 AM
      templateKey: "monthlyTopReader",
    },
    {
      name: "Weekly Teacher Recap",
      type: "WEEKLY",
      channel: "EMAIL",
      targetRole: "TEACHER",
      dayOfWeek: 5, // Friday
      dayOfMonth: null,
      hour: 16, // 4 PM
      templateKey: "weeklyDigestTeacher",
    },
  ];

  for (const s of defaults) {
    const existing = await db.notificationSchedule.findFirst({
      where: { name: s.name },
    });
    if (!existing) {
      await db.notificationSchedule.create({ data: s });
      logger.info("Schedule seeded", { name: s.name });
    }
  }
}
