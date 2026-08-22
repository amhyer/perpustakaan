// Konstanta & aturan perpustakaan Jendela Ilmu

export const ROLES = {
  LIBRARIAN: "LIBRARIAN",
  PUSTAKAWAN_JUNIOR: "PUSTAKAWAN_JUNIOR",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  LIBRARIAN: "Pustakawan",
  PUSTAKAWAN_JUNIOR: "Pustakawan Junior",
  TEACHER: "Guru",
  STUDENT: "Siswa",
};

export const ROLE_COLORS: Record<string, string> = {
  LIBRARIAN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PUSTAKAWAN_JUNIOR: "bg-teal-100 text-teal-700 border-teal-200",
  TEACHER: "bg-amber-100 text-amber-700 border-amber-200",
  STUDENT: "bg-sky-100 text-sky-700 border-sky-200",
};

// Aturan peminjaman default per kategori anggota
export const LOAN_RULES: Record<
  string,
  { maxBooks: number; loanDays: number; finePerDay: number; maxRenewals: number }
> = {
  LIBRARIAN: { maxBooks: 10, loanDays: 30, finePerDay: 0, maxRenewals: 2 },
  PUSTAKAWAN_JUNIOR: { maxBooks: 10, loanDays: 30, finePerDay: 0, maxRenewals: 2 },
  TEACHER: { maxBooks: 5, loanDays: 14, finePerDay: 500, maxRenewals: 2 },
  STUDENT: { maxBooks: 3, loanDays: 7, finePerDay: 1000, maxRenewals: 1 },
};

export const ITEM_STATUS = {
  AVAILABLE: "AVAILABLE",
  BORROWED: "BORROWED",
  DAMAGED: "DAMAGED",
  LOST: "LOST",
  RESERVED: "RESERVED",
} as const;

export const ITEM_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Tersedia",
  BORROWED: "Dipinjam",
  DAMAGED: "Rusak",
  LOST: "Hilang",
  RESERVED: "Reservasi",
};

export const ITEM_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  BORROWED: "bg-amber-100 text-amber-700 border-amber-200",
  DAMAGED: "bg-orange-100 text-orange-700 border-orange-200",
  LOST: "bg-red-100 text-red-700 border-red-200",
  RESERVED: "bg-violet-100 text-violet-700 border-violet-200",
};

export const BOOK_CONDITION = {
  BAIK: "BAIK",
  RUSAK_RINGAN: "RUSAK_RINGAN",
  RUSAK_BERAT: "RUSAK_BERAT",
} as const;

export const BOOK_CONDITION_LABELS: Record<string, string> = {
  BAIK: "Baik",
  RUSAK_RINGAN: "Rusak Ringan",
  RUSAK_BERAT: "Rusak Berat",
};

export const BOOK_CONDITION_COLORS: Record<string, string> = {
  BAIK: "bg-emerald-100 text-emerald-700 border-emerald-200",
  RUSAK_RINGAN: "bg-amber-100 text-amber-700 border-amber-200",
  RUSAK_BERAT: "bg-orange-100 text-orange-700 border-orange-200",
};

export const DAMAGE_FINE_AMOUNT = 50000; // Rp 50.000 untuk buku rusak/hilang

export const LOAN_STATUS = {
  LOANED: "LOANED",
  RETURNED: "RETURNED",
  OVERDUE: "OVERDUE",
} as const;

export const LOAN_STATUS_LABELS: Record<string, string> = {
  LOANED: "Dipinjam",
  RETURNED: "Dikembalikan",
  OVERDUE: "Terlambat",
};

export const LOAN_STATUS_COLORS: Record<string, string> = {
  LOANED: "bg-sky-100 text-sky-700 border-sky-200",
  RETURNED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-100 text-red-700 border-red-200",
};

export const RESERVATION_STATUS = {
  PENDING: "PENDING",
  READY: "READY",
  FULFILLED: "FULFILLED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Mengantre",
  READY: "Siap Diambil",
  FULFILLED: "Dipenuhi",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  READY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FULFILLED: "bg-sky-100 text-sky-700 border-sky-200",
  CANCELLED: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
  EXPIRED: "bg-red-100 text-red-700 border-red-200",
};

export const PROPOSAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};

export const MEMBER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
};

// Warna cover default (palet hangat & akademis)
export const COVER_COLORS = [
  "#1e3a5f", // biru tua
  "#2d5a3d", // hijau daun
  "#7c4a2d", // cokelat hangat
  "#5a3a6b", // ungu tua
  "#8b3a3a", // merah bata
  "#1f5f5b", // teal
  "#3d4a2d", // olive
  "#4a3a6b", // nila
  "#6b3a4a", // marun
  "#2d4a5a", // biru baja
];

export const LIBRARY_NAME = "Jendela Ilmu";
export const LIBRARY_TAGLINE = "Membuka Jendela Ilmu untuk Semua";
export const HEAD_LIBRARIAN_NAME = "Dra. Siti Rahmawati, M.Pd.";

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Normalisasi Date ke awal hari (buang jam/menit/detik/ms) untuk perhitungan kalender
function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

// Hitung selisih HARI KALENDER antara dua tanggal (normalisasi ke awal hari dulu)
export function daysBetween(a: Date, b: Date): number {
  const dayA = startOfDay(a);
  const dayB = startOfDay(b);
  const ms = dayA.getTime() - dayB.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Hitung denda berdasarkan tanggal jatuh tempo (berbasis kalender, bukan timestamp)
export function calculateFine(dueDate: Date, returnDate: Date | null, finePerDay: number): number {
  const ref = returnDate ?? new Date();
  // Normalisasi kedua tanggal ke awal hari, lalu bandingkan
  const refDay = startOfDay(ref);
  const dueDay = startOfDay(dueDate);
  if (refDay <= dueDay) return 0;
  const overdueDays = Math.round((refDay.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, overdueDays) * finePerDay;
}
