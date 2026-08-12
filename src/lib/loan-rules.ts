import { db } from "@/lib/db";
import { LOAN_RULES } from "@/lib/constants";

/**
 * Ambil semua tanggal hari libur dari database.
 * Return sebagai Set<string> dengan format "YYYY-MM-DD" untuk lookup cepat.
 */
export async function getHolidayDateSet(): Promise<Set<string>> {
  const holidays = await db.libraryHoliday.findMany({
    select: { date: true },
  });
  return new Set(holidays.map((h) => toDateKey(h.date)));
}

/**
 * Format Date ke "YYYY-MM-DD" (local time, bukan UTC) untuk komparasi.
 */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Cek apakah sebuah Date jatuh di hari libur (match berdasarkan YYYY-MM-DD).
 */
function isHoliday(date: Date, holidaySet: Set<string>): boolean {
  return holidaySet.has(toDateKey(date));
}

/**
 * Hitung dueDate dengan menggeser maju kalau jatuh di hari libur.
 *
 * Algoritma:
 * 1. Hitung dueDate awal = baseDate + loanDays hari
 * 2. Selama dueDate jatuh di hari libur, geser maju 1 hari
 * 3. Return dueDate yang sudah disesuaikan
 *
 * @param baseDate tanggal acuan (biasanya loanDate atau dueDate lama saat renew)
 * @param loanDays jumlah hari peminjaman dari LOAN_RULES
 * @param holidaySet Set tanggal libur (dari getHolidayDateSet)
 * @param shiftedOut jumlah hari yang digeser (untuk info/debug)
 */
export function computeDueDate(
  baseDate: Date,
  loanDays: number,
  holidaySet: Set<string>
): { dueDate: Date; shiftedDays: number } {
  // Hitung dueDate awal (baseDate + loanDays)
  const dueDate = new Date(baseDate.getTime() + loanDays * 86400000);
  let shiftedDays = 0;

  // Geser maju selama dueDate jatuh di hari libur
  // Safety limit: max 365 hari geser (kalau lebih, ada masalah data)
  let safety = 0;
  while (isHoliday(dueDate, holidaySet) && safety < 365) {
    dueDate.setDate(dueDate.getDate() + 1);
    shiftedDays++;
    safety++;
  }

  return { dueDate, shiftedDays };
}

/**
 * Helper gabungan: ambil holiday set + compute dueDate.
 * Dipakai di POST /api/loans dan renew route.
 */
export async function computeDueDateWithHolidays(
  baseDate: Date,
  category: string
): Promise<{ dueDate: Date; shiftedDays: number; rule: typeof LOAN_RULES.STUDENT }> {
  const rule = LOAN_RULES[category as keyof typeof LOAN_RULES] ?? LOAN_RULES.STUDENT;
  const holidaySet = await getHolidayDateSet();
  return { ...computeDueDate(baseDate, rule.loanDays, holidaySet), rule };
}
