import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";
import { notify } from "@/lib/notification-service";
import { runSmartReminders } from "@/lib/scheduler";

/**
 * (d) Notifikasi "wishlist tersedia": untuk wishlist yang belum dinotifikasi
 * (notifiedAvailable=false) dan bukunya punya eksemplar AVAILABLE — dan anggota
 * belum punya reservasi aktif (PENDING/READY) untuk buku yang sama — kirim
 * notifikasi sekali, lalu tandai notifiedAvailable=true.
 */
async function notifyWishlistAvailable(prisma: PrismaClient, now: Date): Promise<number> {
  const candidates = await prisma.wishlist.findMany({
    where: { notifiedAvailable: false },
    include: {
      member: { select: { userId: true, fullName: true, phone: true } },
      book: {
        select: { title: true, items: { select: { status: true } } },
      },
    },
    take: 200,
  });

  let notified = 0;
  for (const w of candidates) {
    const hasAvailable = w.book.items.some((i) => i.status === "AVAILABLE");
    if (!hasAvailable) continue;

    const activeReservation = await prisma.reservation.findFirst({
      where: {
        memberId: w.memberId,
        bookId: w.bookId,
        status: { in: ["PENDING", "READY"] },
      },
      select: { id: true },
    });
    if (activeReservation) continue; // Sudah direservasi — tidak perlu notif

    // Multi-channel notification (in-app + email + WA)
    await notify({
      userId: w.member.userId,
      title: "Buku Favorit Tersedia!",
      message: `"${w.book.title}" yang Anda masukkan ke wishlist kini tersedia. Cepat pinjam sebelum kehabisan!`,
      type: "INFO",
      relatedId: w.bookId,
      template: {
        whatsappKey: "wishlistAvailable",
        templateData: {
          name: w.member.fullName,
          bookTitle: w.book.title,
        },
      },
    });
    await prisma.wishlist.update({
      where: { id: w.id },
      data: { notifiedAvailable: true },
    });
    notified++;
  }
  return notified;
}

// POST /api/cron/daily-tasks — cron job harian
// Dilindungi CRON_SECRET via header Authorization: Bearer <secret>
// Tugas:
// (a) Reminder pintar — multi-interval (H-3, H-1, H+1, H+3, H+7) via notification-service
// (b) Pinjaman lewat jatuh tempo → status OVERDUE
// (c) Reservasi READY kedaluwarsa → EXPIRED + promote antrean
// (d) Wishlist: buku tersedia → notifikasi
// (e) Keanggotaan kedaluwarsa → auto-deactivate
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

    // Cek apakah reminder enabled
    const reminderEnabledRow = await db.setting.findUnique({ where: { key: "reminder_enabled" } });
    const reminderEnabled = reminderEnabledRow?.value !== "false"; // default true

    // (a) Reminder pintar (multi-channel) — hanya jika enabled
    let preDueReminders = 0;
    let overdueReminders = 0;
    let smartErrors = 0;
    if (reminderEnabled) {
      const smartResult = await runSmartReminders();
      preDueReminders = smartResult.preDueReminders;
      overdueReminders = smartResult.overdueReminders;
      smartErrors = smartResult.errors;
    }

    // (b) Update pinjaman LOANED yang sudah lewat jatuh tempo → OVERDUE
    const overdueUpdateResult = await db.loan.updateMany({
      where: {
        status: "LOANED",
        dueDate: { lt: now },
      },
      data: { status: "OVERDUE" },
    });

    // (c) Reservasi READY yang kedaluwarsa → EXPIRED + bebaskan eksemplar + promosikan antrean
    const expiredReservations = await db.reservation.findMany({
      where: { status: "READY", expiresAt: { lt: now } },
      include: {
        member: { select: { userId: true } },
        book: { select: { title: true } },
      },
    });

    const expiredIds = expiredReservations.map((r) => r.id);
    const booksToPromote = [...new Set(expiredReservations.map((r) => r.bookId))];

    for (const r of expiredReservations) {
      await db.notification.create({
        data: {
          userId: r.member.userId,
          title: "Reservasi Kedaluwarsa",
          message: `Reservasi "${r.book.title}" kedaluwarsa karena tidak diambil dalam 3 hari. Anda dapat memesan ulang.`,
          type: "WARNING",
          relatedId: r.id,
        },
      });
    }
    if (expiredIds.length > 0) {
      await db.reservation.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: "EXPIRED" },
      });
    }

    let reservationsPromoted = 0;
    for (const bookId of booksToPromote) {
      const next = await db.reservation.findFirst({
        where: { bookId, status: "PENDING" },
        orderBy: { queueOrder: "asc" },
        include: {
          member: { select: { userId: true } },
          book: { select: { title: true } },
        },
      });

      if (!next) {
        // Tidak ada antrean → kembalikan eksemplar (hanya bila tidak ada READY lain)
        const otherReady = await db.reservation.count({
          where: { bookId, status: "READY" },
        });
        if (otherReady === 0) {
          const reservedItem = await db.bookItem.findFirst({
            where: { bookId, status: "RESERVED" },
          });
          if (reservedItem) {
            await db.bookItem.update({
              where: { id: reservedItem.id },
              data: { status: "AVAILABLE" },
            });
          }
        }
        continue;
      }

      const availableItem = await db.bookItem.findFirst({
        where: { bookId, status: "AVAILABLE" },
      });
      if (!availableItem) continue; // Belum ada eksemplar bebas — tunggu pengembalian

      await db.bookItem.update({
        where: { id: availableItem.id },
        data: { status: "RESERVED" },
      });
      await db.reservation.update({
        where: { id: next.id },
        data: { status: "READY", expiresAt: new Date(now.getTime() + 3 * 86400000) },
      });
      await db.reservation.updateMany({
        where: { bookId, status: "PENDING", queueOrder: { gt: next.queueOrder } },
        data: { queueOrder: { decrement: 1 } },
      });
      await db.notification.create({
        data: {
          userId: next.member.userId,
          title: "Buku Reservasi Siap Diambil!",
          message: `"${next.book.title}" sudah tersedia. Ambil dalam 3 hari di perpustakaan.`,
          type: "INFO",
          relatedId: next.id,
        },
      });
      reservationsPromoted++;
    }

    // (d) Wishlist: buku yang sekarang tersedia → notifikasi (idempotent via flag)
    const wishlistNotified = await notifyWishlistAvailable(db, now);

    // (e) Anggota kedaluwarsa: expiryDate < now && ACTIVE → INACTIVE + notifikasi
    const expiredMembers = await db.member.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: { lt: now },
      },
      include: { user: { select: { id: true } } },
    });

    let membersDeactivated = 0;
    for (const m of expiredMembers) {
      await db.member.update({ where: { id: m.id }, data: { status: "INACTIVE" } });
      await db.notification.create({
        data: {
          userId: m.user.id,
          title: "Keanggotaan Kedaluwarsa",
          message: `Keanggotaan Anda telah kedaluwarsa. Silakan hubungi pustakawan untuk memperpanjang.`,
          type: "WARNING",
        },
      });
      membersDeactivated++;
    }

    return NextResponse.json({
      success: true,
      date: now.toISOString().slice(0, 10),
      config: { reminderEnabled },
      tasks: {
        preDueReminders,
        overdueReminders,
        smartErrors,
        overdueUpdated: overdueUpdateResult.count,
        reservationsExpired: expiredIds.length,
        reservationsPromoted,
        wishlistNotified,
        membersDeactivated,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal menjalankan daily tasks", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
