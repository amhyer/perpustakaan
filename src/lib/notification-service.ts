/**
 * Notification Service — orchestrasi multi-channel.
 *
 * Mengirim notifikasi ke berbagai channel (in-app, email, WhatsApp) sesuai
 * preferensi user. Settings perpustakaan menentukan channel mana yang aktif.
 *
 * Channel priority:
 * 1. In-app (selalu) — ke tabel Notification
 * 2. WhatsApp (jika diaktifkan & member punya nomor HP)
 * 3. Email (jika diaktifkan & user punya email)
 *
 * Settings (Setting table):
 * - "notif_channel_in_app" = "true" (default true)
 * - "notif_channel_email" = "true" (default false)
 * - "notif_channel_whatsapp" = "true" (default false)
 * - "reminder_due_date_enabled" = "true"
 * - "reminder_days_before" = "1"
 * - "reminder_overdue_enabled" = "true"
 * - "reminder_overdue_intervals" = "1,3,7"
 */

import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { sendWhatsApp, whatsappTemplates } from "@/lib/whatsapp";

interface NotifyOptions {
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "DUE_DATE" | "OVERDUE" | "ANNOUNCEMENT";
  relatedId?: string;
  // Channel override — jika tidak diset, pakai default dari settings
  channels?: ("in_app" | "email" | "whatsapp")[];
  // Template data untuk email/wa (jika applicable)
  template?: {
    emailKey?: keyof typeof emailTemplates;
    whatsappKey?: keyof typeof whatsappTemplates;
    templateData: Record<string, any>;
  };
}

interface NotifyResult {
  inApp: boolean;
  email: { sent: boolean; error?: string };
  whatsapp: { sent: boolean; error?: string };
}

async function isChannelEnabled(channel: "in_app" | "email" | "whatsapp"): Promise<boolean> {
  const settingKey = `notif_channel_${channel === "in_app" ? "in_app" : channel}`;
  const setting = await db.setting.findUnique({ where: { key: settingKey } });
  // Default: in_app true, email false, whatsapp false
  if (setting === null) {
    return channel === "in_app";
  }
  return setting.value === "true";
}

/**
 * Kirim notifikasi multi-channel.
 */
export async function notify(options: NotifyOptions): Promise<NotifyResult> {
  const result: NotifyResult = {
    inApp: false,
    email: { sent: false },
    whatsapp: { sent: false },
  };

  // Ambil data user + member
  const user = await db.user.findUnique({
    where: { id: options.userId },
    include: { member: true },
  });

  if (!user) {
    return result;
  }

  const channels = options.channels || (["in_app", "email", "whatsapp"] as const);
  const channelChecks = await Promise.all(
    channels.map((c) => (c === "in_app" ? isChannelEnabled("in_app") : isChannelEnabled(c)))
  );

  // 1. In-app notification (selalu jika channel aktif)
  if (channels.includes("in_app") && channelChecks[channels.indexOf("in_app")]) {
    try {
      await db.notification.create({
        data: {
          userId: options.userId,
          title: options.title,
          message: options.message,
          type: options.type,
          relatedId: options.relatedId,
        },
      });
      result.inApp = true;
    } catch (err) {
      console.error("[notify] Gagal buat notifikasi in-app:", err);
    }
  }

  // 2. Email
  if (channels.includes("email") && user.email) {
    const isEnabled = await isChannelEnabled("email");
    if (isEnabled) {
      try {
        let subject = options.title;
        let html = `<p>${options.message}</p>`;
        let text = options.message;

        // Pakai template jika ada
        if (options.template?.emailKey) {
          const tpl = (emailTemplates as any)[options.template.emailKey];
          if (tpl) {
            const rendered = tpl(options.template.templateData);
            subject = rendered.subject;
            html = rendered.html;
            text = rendered.text;
          }
        }

        const r = await sendEmail({
          to: user.email,
          subject,
          html,
          text,
          category: options.type,
          relatedId: options.relatedId,
        });
        result.email = { sent: r.success, error: r.error };
      } catch (err) {
        result.email = { sent: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  // 3. WhatsApp (hanya untuk member dengan phone)
  if (channels.includes("whatsapp") && user.member?.phone) {
    const isEnabled = await isChannelEnabled("whatsapp");
    if (isEnabled) {
      try {
        let message = options.message;

        // Pakai template jika ada
        if (options.template?.whatsappKey) {
          const tpl = (whatsappTemplates as any)[options.template.whatsappKey];
          if (tpl) {
            message = tpl(options.template.templateData);
          }
        }

        const r = await sendWhatsApp({
          phone: user.member.phone,
          message,
          category: options.type,
          relatedId: options.relatedId,
        });
        result.whatsapp = { sent: r.success, error: r.error };
      } catch (err) {
        result.whatsapp = { sent: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  return result;
}

/**
 * Kirim notifikasi jatuh tempo ke banyak member (untuk cron).
 */
export async function notifyDueDateBatch(loans: any[]): Promise<{ notified: number; errors: number }> {
  let notified = 0;
  let errors = 0;

  for (const loan of loans) {
    try {
      const daysRemaining = Math.ceil((new Date(loan.dueDate).getTime() - Date.now()) / 86400000);
      const result = await notify({
        userId: loan.member.user.id,
        title: `📚 Pengingat: "${loan.bookItem.book.title}" jatuh tempo ${daysRemaining === 0 ? "hari ini" : `dalam ${daysRemaining} hari`}`,
        message: `"${loan.bookItem.book.title}" akan jatuh tempo pada ${new Date(loan.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`,
        type: "DUE_DATE",
        relatedId: loan.id,
        template: {
          emailKey: "dueDateReminder",
          whatsappKey: "dueDateReminder",
          templateData: {
            name: loan.member.fullName,
            bookTitle: loan.bookItem.book.title,
            dueDate: new Date(loan.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
            daysRemaining,
          },
        },
      });
      if (result.inApp || result.email.sent || result.whatsapp.sent) notified++;
    } catch (err) {
      errors++;
      console.error("[notify-due] Gagal untuk loan", loan.id, err);
    }
  }

  return { notified, errors };
}

/**
 * Kirim notifikasi keterlambatan ke banyak member.
 */
export async function notifyOverdueBatch(loans: any[]): Promise<{ notified: number; errors: number }> {
  let notified = 0;
  let errors = 0;

  for (const loan of loans) {
    try {
      const daysOverdue = Math.ceil((Date.now() - new Date(loan.dueDate).getTime()) / 86400000);
      const rule = loan.member.category === "TEACHER" ? 500 : 1000;
      const fineAmount = daysOverdue * rule;

      const result = await notify({
        userId: loan.member.user.id,
        title: `⚠ Buku Terlambat: "${loan.bookItem.book.title}"`,
        message: `"${loan.bookItem.book.title}" terlambat ${daysOverdue} hari. Denda saat ini: Rp ${fineAmount.toLocaleString("id-ID")}.`,
        type: "OVERDUE",
        relatedId: loan.id,
        template: {
          emailKey: "overdueNotice",
          whatsappKey: "overdueNotice",
          templateData: {
            name: loan.member.fullName,
            bookTitle: loan.bookItem.book.title,
            daysOverdue,
            fineAmount,
          },
        },
      });
      if (result.inApp || result.email.sent || result.whatsapp.sent) notified++;
    } catch (err) {
      errors++;
      console.error("[notify-overdue] Gagal untuk loan", loan.id, err);
    }
  }

  return { notified, errors };
}
