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
]);

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json(map);
}

export async function PUT(req: Request) {
  const { user, error } = await requireFullLibrarian();
  if (error) return error;

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
}
