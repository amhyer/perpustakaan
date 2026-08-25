/**
 * WhatsApp Notification Service — Fonnte Provider.
 *
 * Fonnte adalah WhatsApp Gateway populer di Indonesia dengan harga terjangkau
 * (~Rp 800/msg). Cocok untuk sekolah.
 *
 * Setup:
 * 1. Daftar di https://fonnte.com
 * 2. Hubungkan nomor WhatsApp sekolah (scan QR)
 * 3. Set env: FONNTE_TOKEN
 * 4. (Opsional) Whitelist IP server di dashboard Fonnte untuk keamanan ekstra
 *
 * Dokumentasi API: https://fonnte.com/api
 */

import { db } from "@/lib/db";

interface SendWhatsAppOptions {
  phone: string; // format 6281234567890 (country code tanpa +)
  message: string;
  category: string;
  relatedId?: string;
}

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const FONNTE_API_URL = "https://api.fonnte.com/send";

/**
 * Normalisasi nomor HP ke format Fonnte (628xxx).
 * Handle:
 * - 0812... → 62812...
 * - +62 812... → 62812...
 * - 62 812... → 62812...
 */
export function normalizePhone(phone: string): string {
  // Hapus semua karakter non-digit
  let cleaned = phone.replace(/\D/g, "");

  // Ganti 62 di awal
  if (cleaned.startsWith("62")) {
    // sudah benar
  } else if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }

  return cleaned;
}

/**
 * Kirim WhatsApp via Fonnte.
 * Otomatis log ke WhatsAppLog.
 */
export async function sendWhatsApp(options: SendWhatsAppOptions): Promise<WhatsAppResult> {
  const token = process.env.FONNTE_TOKEN;
  const normalizedPhone = normalizePhone(options.phone);

  // Log attempt
  const log = await db.whatsAppLog.create({
    data: {
      phone: normalizedPhone,
      message: options.message,
      category: options.category,
      relatedId: options.relatedId,
      status: "PENDING",
    },
  });

  if (!token) {
    await db.whatsAppLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMsg: "FONNTE_TOKEN belum dikonfigurasi" },
    });
    return { success: false, error: "WhatsApp belum dikonfigurasi" };
  }

  try {
    const formData = new FormData();
    formData.append("target", normalizedPhone);
    formData.append("message", options.message);
    formData.append("countryCode", "62");

    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || data.status === false) {
      const errorMsg = data.reason || data.message || `HTTP ${res.status}`;
      await db.whatsAppLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorMsg },
      });
      return { success: false, error: errorMsg };
    }

    await db.whatsAppLog.update({
      where: { id: log.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return { success: true, messageId: data.id?.[0] };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db.whatsAppLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMsg },
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Kirim WhatsApp ke banyak nomor (blast).
 * Delay antar pesan untuk hindari spam detection.
 */
export async function sendWhatsAppBatch(
  recipients: SendWhatsAppOptions[],
  delayMs = 1000
): Promise<{ total: number; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const result = await sendWhatsApp(r);
    if (result.success) sent++;
    else failed++;

    // Delay untuk hindari rate limit Fonnte
    if (delayMs > 0 && recipients.indexOf(r) < recipients.length - 1) {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  return { total: recipients.length, sent, failed };
}

// ============================================================
// WhatsApp Templates — Bahasa Indonesia, dengan emoji
// ============================================================

export const whatsappTemplates = {
  dueDateReminder({ name, bookTitle, dueDate, daysRemaining }: { name: string; bookTitle: string; dueDate: string; daysRemaining: number }) {
    const due = daysRemaining === 0 ? "*hari ini*" : `dalam *${daysRemaining} hari*`;
    return `📚 *Perpustakaan Jendela Ilmu*

Halo *${name}*,

Buku yang sedang Anda pinjam akan jatuh tempo ${due}.

📖 *${bookTitle}*
📅 Jatuh tempo: ${dueDate}

Segera kembalikan atau perpanjang pinjaman untuk menghindari denda.

Cek pinjaman: ${process.env.NEXTAUTH_URL || "http://localhost:3001"}/my-loans

— Perpustakaan Jendela Ilmu`;
  },

  overdueNotice({ name, bookTitle, daysOverdue, fineAmount }: { name: string; bookTitle: string; daysOverdue: number; fineAmount: number }) {
    const formattedFine = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(fineAmount);
    return `⚠ *Perpustakaan Jendela Ilmu*

Halo *${name}*,

Buku berikut sudah *terlambat ${daysOverdue} hari* dari tanggal jatuh tempo.

📖 *${bookTitle}*
💰 Denda saat ini: *${formattedFine}*

Denda akan terus bertambah. Mohon segera kembalikan.

Cek pinjaman: ${process.env.NEXTAUTH_URL || "http://localhost:3001"}/my-loans

— Perpustakaan Jendela Ilmu`;
  },

  reservationReady({ name, bookTitle, expiresIn }: { name: string; bookTitle: string; expiresIn: string }) {
    return `✅ *Perpustakaan Jendela Ilmu*

Halo *${name}*,

Buku yang Anda *reservasi* sudah tersedia dan siap diambil!

📖 *${bookTitle}*
⏰ Ambil dalam: *${expiresIn}*

Datang ke meja sirkulasi untuk mengambil. Bawa kartu anggota.

— Perpustakaan Jendela Ilmu`;
  },

  wishlistAvailable({ name, bookTitle }: { name: string; bookTitle: string }) {
    return `🔔 *Perpustakaan Jendela Ilmu*

Halo *${name}*,

Buku di *wishlist* Anda kini tersedia!

📖 *${bookTitle}*

Cepat pinjam sebelum kehabisan. Cek katalog:
${process.env.NEXTAUTH_URL || "http://localhost:3001"}/catalog

— Perpustakaan Jendela Ilmu`;
  },

  welcome({ name, memberNumber }: { name: string; memberNumber: string }) {
    return `🎉 *Selamat Datang di Perpustakaan Jendela Ilmu!*

Halo *${name}*,

Akun Anda telah aktif. Berikut kartu anggota digital Anda:

🆔 *${memberNumber}*

Sekarang Anda bisa:
✅ Cari & pinjam buku
✅ Buat wishlist
✅ Terima notifikasi jatuh tempo via WA

Login: ${process.env.NEXTAUTH_URL || "http://localhost:3001"}

— Perpustakaan Jendela Ilmu
"Membuka Jendela Ilmu untuk Semua"`;
  },

  announcement({ title, content }: { title: string; content: string }) {
    return `📢 *Perpustakaan Jendela Ilmu*

*${title}*

${content}

— Perpustakaan Jendela Ilmu`;
  },

  // =========================================================================
  // REWARD SYSTEM TEMPLATES
  // =========================================================================

  rewardEarned({ name, amount, description, totalBalance }: {
    name: string;
    amount: number;
    description: string;
    totalBalance: number;
  }) {
    return `⭐ *Perpustakaan Jendela Ilmu*

Halo *${name}*,

Selamat! Anda baru saja mendapat poin:

🎁 *+${amount} poin*
📝 ${description}

💰 Saldo poin Anda: *${totalBalance}*

Tukar poin dengan hadiah menarik di katalog:
${process.env.NEXTAUTH_URL || "http://localhost:3001"}/rewards

— Perpustakaan Jendela Ilmu`;
  },

  rewardClaimApproved({ name, rewardName, pickupCode }: {
    name: string;
    rewardName: string;
    pickupCode: string;
  }) {
    return `🎁 *Perpustakaan Jendela Ilmu*

Halo *${name}*,

Klaim hadiah Anda telah *DISETUJUI* oleh pustakawan!

🎁 *${rewardName}*
🔑 Kode ambil: *${pickupCode}*

Datang ke perpustakaan dan tunjukkan kode di atas ke pustakawan untuk mengambil hadiah.

Cek status klaim: ${process.env.NEXTAUTH_URL || "http://localhost:3001"}/my-redemptions

— Perpustakaan Jendela Ilmu`;
  },

  rewardClaimRejected({ name, rewardName, reason }: {
    name: string;
    rewardName: string;
    reason: string;
  }) {
    return `😔 *Perpustakaan Jendela Ilmu*

Halo *${name}*,

Maaf, klaim hadiah Anda *DITOLAK*.

🎁 *${rewardName}*
📝 Alasan: ${reason}

💰 Poin Anda sudah dikembalikan secara otomatis.

Coba lagi dengan hadiah lain di katalog:
${process.env.NEXTAUTH_URL || "http://localhost:3001"}/rewards

— Perpustakaan Jendela Ilmu`;
  },

  rewardDelivered({ name, rewardName }: {
    name: string;
    rewardName: string;
  }) {
    return `🎉 *Perpustakaan Jendela Ilmu*

Halo *${name}*,

Selamat! Hadiah Anda sudah diterima:

🎁 *${rewardName}*

Semoga bermanfaat! Terus kumpulkan poin dengan membaca buku di perpustakaan kami. 📚

Cek saldo: ${process.env.NEXTAUTH_URL || "http://localhost:3001"}/rewards

— Perpustakaan Jendela Ilmu`;
  },

  // =========================================================================
  // PERIODIC DIGEST TEMPLATES
  // =========================================================================

  weeklyDigestStudent({ name, weekPoints, booksRead, balance }: {
    name: string;
    weekPoints: number;
    booksRead: number;
    balance: number;
  }) {
    return `📊 *Ringkasan Mingguan - Perpustakaan Jendela Ilmu*

Halo *${name}*,

Bagaimana minggu ini? Yuk kita intip:

📚 Buku selesai: *${booksRead}*
⭐ Poin masuk: *+${weekPoints}*
💰 Saldo total: *${balance}*

${weekPoints >= 50 ? "🔥 Hebat! Kamu pembaca aktif minggu ini." : weekPoints > 0 ? "💪 Terus tingkatkan, yuk!" : "📖 Yuk mulai baca buku minggu depan!"}

Cek katalog hadiah:
${process.env.NEXTAUTH_URL || "http://localhost:3001"}/rewards

— Perpustakaan Jendela Ilmu`;
  },

  monthlyTopReader({ name, rank, points, booksRead }: {
    name: string;
    rank: number;
    points: number;
    booksRead: number;
  }) {
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏆";
    return `${medal} *Top Reader Bulan Ini!*

Selamat *${name}*!

Anda排名第 *${rank}* pembaca terbaik bulan ini:

⭐ Poin: *${points}*
📚 Buku selesai: *${booksRead}*

Terus baca, terus menginspirasi! 📖

${process.env.NEXTAUTH_URL || "http://localhost:3001"}/rewards

— Perpustakaan Jendela Ilmu`;
  },

  weeklyDigestTeacher({ name, classGrade, studentLoans }: {
    name: string;
    classGrade: string | null;
    studentLoans: number;
  }) {
    return `📚 *Recap Mingguan untuk Guru*

Halo *${name}*,

Minggu ini, perpustakaan mencatat:

📖 *${studentLoans}* buku dipinjam dari ${classGrade || "kelas Anda"}.

Terus dorong siswa untuk gemar membaca! 💪

Cek aktivitas siswa:
${process.env.NEXTAUTH_URL || "http://localhost:3001"}/reports

— Perpustakaan Jendela Ilmu`;
  },
};
