import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireFullLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const ALLOWED_SETTINGS_KEYS = new Set([
  "library_name", "head_librarian", "library_address", "card_back_text",
  "fine_per_day_student", "fine_per_day_teacher",
  "loan_days_student", "loan_days_teacher",
  "max_books_student", "max_books_teacher",
  "max_renewals_student", "max_renewals_teacher",
  "reminder_enabled", "reminder_days_before",
  "show_gamification",
  // Notification channels (Tahap 21)
  "notif_channel_in_app", "notif_channel_email", "notif_channel_whatsapp",
  "reminder_overdue_enabled", "reminder_overdue_intervals",
  // WhatsApp
  "fonnte_device",
  // Email
  "email_from_name", "email_reply_to",
  // Operasional
  "library_opens_at", "library_closes_at", "library_open_days",
  "max_loan_extension_days",
  // Kiosk
  "kiosk_enabled", "kiosk_welcome_message",
]);

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  try {
    const settings = await db.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json(map);
  } catch (err) {
    console.error("GET settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;

  try {
    const body = await req.json();
    const changed: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_SETTINGS_KEYS.has(key)) {
        return NextResponse.json({ error: `Invalid setting key: ${key}` }, { status: 400 });
      }
      await db.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
      changed.push(key);
    }
    await logAudit(user!.id, "SETTING_CHANGE", "Setting", undefined, changed.join(", "));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
