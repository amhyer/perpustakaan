/**
 * Indonesian (Bahasa Indonesia) — default locale.
 *
 * Sprint 4 Foundation: struktur untuk multi-bahasa di masa depan.
 * Untuk saat ini, hanya 'id' yang tersedia. Konten di-hardcode di
 * komponen, dan helper ini hanya foundation untuk refactor nanti.
 *
 * Cara pakai (future):
 * ```ts
 * import { t } from "@/lib/i18n";
 * t("dashboard.welcome", { name: "Budi" }); // "Selamat datang, Budi!"
 * ```
 */

export const id = {
  // ===== Common =====
  common: {
    appName: "Perpustakaan Jendela Ilmu",
    tagline: "Membuka Jendela Ilmu untuk Semua",
    save: "Simpan",
    cancel: "Batal",
    delete: "Hapus",
    edit: "Edit",
    loading: "Memuat...",
    error: "Terjadi kesalahan",
    retry: "Coba Lagi",
    close: "Tutup",
    confirm: "Konfirmasi",
    yes: "Ya",
    no: "Tidak",
    back: "Kembali",
    next: "Selanjutnya",
    previous: "Sebelumnya",
    search: "Cari",
    filter: "Filter",
    all: "Semua",
    none: "Tidak ada",
    total: "Total",
  },

  // ===== Roles =====
  roles: {
    LIBRARIAN: "Pustakawan",
    PUSTAKAWAN_JUNIOR: "Pustakawan Junior",
    TEACHER: "Guru",
    STUDENT: "Siswa",
  },

  // ===== Dashboard =====
  dashboard: {
    welcome: "Selamat datang, {name}!",
    typeAccount: "Tipe akun: {role}",
    quickActions: "Aksi Cepat",
    todayActivity: "Aktivitas Hari Ini",
    needsAction: "Perlu Tindakan",
    noActionNeeded: "Semua beres!",
    popularBooks: "Buku Terpopuler",
    topMembers: "Anggota Paling Aktif",
    recentLoans: "Peminjaman Terbaru",
    overdueAlert: "Peringatan Keterlambatan",
    setAsHome: "Set sebagai Beranda",
    homeActive: "Beranda Aktif",
    defaultDashboard: "Beranda Pilihan Saya",
    autoRouteHint: "Sistem otomatis memilih dashboard sesuai role",
  },

  // ===== Books =====
  books: {
    totalBooks: "Total Buku",
    available: "Eksemplar Tersedia",
    borrowed: "sedang dipinjam",
    overdue: "Terlambat",
    noLoans: "Belum ada peminjaman",
    bookDetail: "Detail Buku",
  },

  // ===== Members =====
  members: {
    totalMembers: "Total Anggota",
    active: "Aktif",
    student: "Siswa",
    teacher: "Guru",
    addMember: "Tambah Anggota",
  },

  // ===== Loans =====
  loans: {
    active: "Peminjaman Aktif",
    dueSoon: "Jatuh Tempo Minggu Ini",
    fine: "Denda",
    borrow: "Pinjam",
    return: "Kembalikan",
    renew: "Perpanjang",
    days: "hari",
    bookReturned: "Buku berhasil dikembalikan",
  },

  // ===== Errors =====
  errors: {
    notFound: "Tidak ditemukan",
    unauthorized: "Tidak punya akses",
    networkError: "Gagal terhubung ke server",
    tryAgain: "Silakan coba lagi",
  },

  // ===== Months =====
  months: {
    1: "Januari",
    2: "Februari",
    3: "Maret",
    4: "April",
    5: "Mei",
    6: "Juni",
    7: "Juli",
    8: "Agustus",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Desember",
  },

  // ===== Days =====
  days: {
    monday: "Senin",
    tuesday: "Selasa",
    wednesday: "Rabu",
    thursday: "Kamis",
    friday: "Jumat",
    saturday: "Sabtu",
    sunday: "Minggu",
  },
};

export type IdLocale = {
  common: Record<string, string>;
  roles: Record<string, string>;
  dashboard: Record<string, string>;
  books: Record<string, string>;
  members: Record<string, string>;
  loans: Record<string, string>;
  errors: Record<string, string>;
  months: Record<string, string>;
  days: Record<string, string>;
};
export type TranslationKey = keyof IdLocale;
