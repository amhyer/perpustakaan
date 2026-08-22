/**
 * Email service — Nodemailer + Gmail SMTP.
 *
 * Setup:
 * 1. Sekolah buat akun Gmail khusus (mis. perpus.jendelailmu.sekolah@gmail.com)
 * 2. Aktifkan 2-Step Verification di akun Gmail tsb
 * 3. Buat App Password: https://myaccount.google.com/apppasswords
 * 4. Set env: GMAIL_USER, GMAIL_APP_PASSWORD
 *
 * Untuk production sekolah, ganti ke SMTP sekolah (Zoho, custom domain, dll).
 * Interface `sendEmail` tetap sama.
 *
 * Email yang dikirim di-log ke EmailLog untuk audit & debugging.
 */

import nodemailer from "nodemailer";
import { db } from "@/lib/db";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category: string;
  relatedId?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn("[email] GMAIL_USER / GMAIL_APP_PASSWORD belum di-set. Email tidak akan terkirim.");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

/**
 * Kirim email.
 * Otomatis log ke EmailLog.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const t = getTransporter();

  // Selalu catat attempt (untuk audit)
  const log = await db.emailLog.create({
    data: {
      to: options.to,
      subject: options.subject,
      body: options.text || options.html.substring(0, 500),
      category: options.category,
      relatedId: options.relatedId,
      status: "PENDING",
    },
  });

  if (!t) {
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMsg: "Transporter not configured" },
    });
    return { success: false, error: "Email transporter belum dikonfigurasi" };
  }

  try {
    const info = await t.sendMail({
      from: `"Perpustakaan Jendela Ilmu" <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMsg },
    });
    return { success: false, error: errorMsg };
  }
}

// ============================================================
// Email Templates — Bahasa Indonesia
// ============================================================

const LIBRARY_NAME = "Perpustakaan Jendela Ilmu";
const PRIMARY_COLOR = "#1e3a5f";
const LOGO_URL = `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/logo.svg`;

function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background-color:#f5f1e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f1e8;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color:${PRIMARY_COLOR};padding:24px;text-align:center;">
              <img src="${LOGO_URL}" alt="Logo" width="48" height="48" style="display:inline-block;vertical-align:middle;">
              <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:20px;font-weight:600;">${LIBRARY_NAME}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;color:#2d2d2d;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f5f1e8;padding:16px 24px;text-align:center;color:#666;font-size:12px;">
              <p style="margin:0 0 4px 0;">Email otomatis dari sistem perpustakaan. Mohon tidak membalas.</p>
              <p style="margin:0;">© ${new Date().getFullYear()} ${LIBRARY_NAME}. Membuka Jendela Ilmu untuk Semua.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export const emailTemplates = {
  passwordReset({ name, resetUrl, expiresInMinutes }: { name: string; resetUrl: string; expiresInMinutes: number }) {
    const subject = `Reset Password — ${LIBRARY_NAME}`;
    const html = baseTemplate(
      subject,
      `
        <h2 style="margin:0 0 16px 0;color:${PRIMARY_COLOR};">Halo ${name},</h2>
        <p>Kami menerima permintaan untuk mereset password akun Anda.</p>
        <p>Klik tombol di bawah ini untuk mengatur password baru. Link berlaku selama <strong>${expiresInMinutes} menit</strong>.</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;">Reset Password</a>
        </p>
        <p>Atau copy paste link ini ke browser:</p>
        <p style="word-break:break-all;background-color:#f5f1e8;padding:12px;border-radius:4px;font-family:monospace;font-size:13px;">${resetUrl}</p>
        <p style="color:#a04040;margin-top:24px;">⚠ Jika Anda tidak merasa meminta reset password, abaikan email ini. Akun Anda tetap aman.</p>
      `
    );
    const text = `Halo ${name},\n\nKlik link berikut untuk reset password (berlaku ${expiresInMinutes} menit):\n${resetUrl}\n\nJika bukan Anda, abaikan email ini.`;
    return { subject, html, text };
  },

  passwordChanged({ name }: { name: string }) {
    const subject = `Password Berhasil Diubah — ${LIBRARY_NAME}`;
    const html = baseTemplate(
      subject,
      `
        <h2 style="margin:0 0 16px 0;color:${PRIMARY_COLOR};">Halo ${name},</h2>
        <p>Password akun Anda telah berhasil diubah pada <strong>${new Date().toLocaleString("id-ID")}</strong>.</p>
        <p>Semua sesi login di perangkat lain telah diakhiri. Silakan login ulang dengan password baru.</p>
        <p style="color:#a04040;margin-top:24px;">⚠ Jika Anda tidak merasa melakukan perubahan ini, segera hubungi pustakawan.</p>
      `
    );
    const text = `Halo ${name},\n\nPassword Anda telah berhasil diubah pada ${new Date().toLocaleString("id-ID")}. Semua sesi login diakhiri.`;
    return { subject, html, text };
  },

  dueDateReminder({ name, bookTitle, dueDate, daysRemaining }: { name: string; bookTitle: string; dueDate: string; daysRemaining: number }) {
    const subject = `📚 Pengingat: Buku "${bookTitle}" jatuh tempo ${daysRemaining === 0 ? "hari ini" : `dalam ${daysRemaining} hari`}`;
    const html = baseTemplate(
      subject,
      `
        <h2 style="margin:0 0 16px 0;color:${PRIMARY_COLOR};">Halo ${name},</h2>
        <p>Buku yang sedang Anda pinjam akan jatuh tempo ${daysRemaining === 0 ? "<strong>hari ini</strong>" : `dalam <strong>${daysRemaining} hari</strong>`}.</p>
        <div style="background-color:#fff8e1;border-left:4px solid #f59e0b;padding:16px;margin:24px 0;border-radius:4px;">
          <p style="margin:0;font-weight:600;">📖 ${bookTitle}</p>
          <p style="margin:8px 0 0 0;color:#666;">Jatuh tempo: ${dueDate}</p>
        </div>
        <p>Segera kembalikan atau perpanjang pinjaman untuk menghindari denda keterlambatan.</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3001"}/my-loans" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;">Lihat Pinjaman Saya</a>
        </p>
      `
    );
    const text = `Halo ${name},\n\nBuku "${bookTitle}" jatuh tempo ${dueDate}. Segera kembalikan atau perpanjang.`;
    return { subject, html, text };
  },

  overdueNotice({ name, bookTitle, daysOverdue, fineAmount }: { name: string; bookTitle: string; daysOverdue: number; fineAmount: number }) {
    const subject = `⚠ Buku Terlambat: "${bookTitle}" (${daysOverdue} hari)`;
    const formattedFine = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(fineAmount);
    const html = baseTemplate(
      subject,
      `
        <h2 style="margin:0 0 16px 0;color:#a04040;">Halo ${name},</h2>
        <p>Buku berikut sudah <strong>terlambat ${daysOverdue} hari</strong> dari tanggal jatuh tempo.</p>
        <div style="background-color:#fee;border-left:4px solid #a04040;padding:16px;margin:24px 0;border-radius:4px;">
          <p style="margin:0;font-weight:600;">📖 ${bookTitle}</p>
          <p style="margin:8px 0 0 0;color:#666;">Denda saat ini: <strong>${formattedFine}</strong></p>
        </div>
        <p>Denda akan terus bertambah selama buku belum dikembalikan. Mohon segera kembalikan ke perpustakaan.</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3001"}/my-loans" style="display:inline-block;background-color:#a04040;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;">Lihat Pinjaman Saya</a>
        </p>
      `
    );
    const text = `Halo ${name},\n\nBuku "${bookTitle}" terlambat ${daysOverdue} hari. Denda: ${formattedFine}.`;
    return { subject, html, text };
  },

  welcome({ name, email, temporaryPassword }: { name: string; email: string; temporaryPassword: string }) {
    const subject = `Selamat Datang di ${LIBRARY_NAME}`;
    const html = baseTemplate(
      subject,
      `
        <h2 style="margin:0 0 16px 0;color:${PRIMARY_COLOR};">Selamat Datang, ${name}! 🎉</h2>
        <p>Akun Anda telah berhasil dibuat di sistem ${LIBRARY_NAME}. Anda sekarang dapat:</p>
        <ul style="line-height:1.8;">
          <li>🔍 Mencari buku di katalog</li>
          <li>📖 Meminjam & memperpanjang buku</li>
          <li>📚 Membuat wishlist & usulan buku</li>
          <li>🔔 Menerima notifikasi jatuh tempo</li>
        </ul>
        <div style="background-color:#f5f1e8;padding:16px;margin:24px 0;border-radius:4px;">
          <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin:0 0 8px 0;"><strong>Password Sementara:</strong> <code style="background-color:#fff;padding:4px 8px;border-radius:3px;">${temporaryPassword}</code></p>
        </div>
        <p style="color:#a04040;">⚠ Harap ganti password Anda setelah login pertama.</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3001"}" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;">Login Sekarang</a>
        </p>
      `
    );
    const text = `Selamat Datang di ${LIBRARY_NAME}, ${name}!\n\nEmail: ${email}\nPassword Sementara: ${temporaryPassword}\n\nHarap ganti password setelah login pertama.`;
    return { subject, html, text };
  },

  announcementBroadcast({ title, content, authorName }: { title: string; content: string; authorName: string }) {
    const subject = `📢 ${title}`;
    const html = baseTemplate(
      subject,
      `
        <h2 style="margin:0 0 16px 0;color:${PRIMARY_COLOR};">📢 ${title}</h2>
        <div style="color:#2d2d2d;font-size:15px;line-height:1.7;white-space:pre-wrap;">${content.replace(/\n/g, "<br>")}</div>
        <p style="margin-top:24px;color:#666;font-size:13px;">— ${authorName}, ${LIBRARY_NAME}</p>
      `
    );
    const text = `📢 ${title}\n\n${content}\n\n— ${authorName}, ${LIBRARY_NAME}`;
    return { subject, html, text };
  },
};
