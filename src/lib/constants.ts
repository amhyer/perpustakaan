// Konstanta & aturan perpustakaan Jendela Ilmu

export const ROLES = {
  LIBRARIAN: "LIBRARIAN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  LIBRARIAN: "Pustakawan",
  TEACHER: "Guru",
  STUDENT: "Siswa",
};

export const ROLE_COLORS: Record<string, string> = {
  LIBRARIAN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  TEACHER: "bg-amber-100 text-amber-700 border-amber-200",
  STUDENT: "bg-sky-100 text-sky-700 border-sky-200",
};

// Aturan peminjaman default per kategori anggota
export const LOAN_RULES: Record<
  string,
  { maxBooks: number; loanDays: number; finePerDay: number; maxRenewals: number }
> = {
  LIBRARIAN: { maxBooks: 10, loanDays: 30, finePerDay: 0, maxRenewals: 2 },
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

export function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// Hitung denda berdasarkan tanggal jatuh tempo
export function calculateFine(dueDate: Date, returnDate: Date | null, finePerDay: number): number {
  const ref = returnDate ?? new Date();
  if (ref <= dueDate) return 0;
  const overdueDays = daysBetween(ref, dueDate);
  return Math.max(0, overdueDays) * finePerDay;
}
