/**
 * i18n configuration & message catalog.
 *
 * Supported locales: id (Indonesian, default) & en (English).
 * Untuk aktivasi penuh dengan next-intl middleware, lihat:
 * https://next-intl-docs.vercel.app/docs/getting-started/app-router
 *
 * Untuk sekarang, ini sebagai resource catalog yang bisa dipakai manual.
 */

export const locales = ["id", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "id";

export const localeNames: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

export const localeFlags: Record<Locale, string> = {
  id: "🇮🇩",
  en: "🇬🇧",
};

// ============================================================
// Message Catalog
// ============================================================
type MessageKey =
  | "common.save" | "common.cancel" | "common.delete" | "common.edit"
  | "common.add" | "common.search" | "common.loading" | "common.error"
  | "nav.dashboard" | "nav.catalog" | "nav.members" | "nav.loans"
  | "nav.rooms" | "nav.visitors" | "nav.assets" | "nav.settings"
  | "auth.login" | "auth.logout" | "auth.email" | "auth.password"
  | "book.title" | "book.author" | "book.available" | "book.borrowed"
  | "loan.borrow" | "loan.return" | "loan.dueDate" | "loan.renew"
  | "member.name" | "member.number" | "member.status"
  | "common.welcome" | "common.goodbye" | "common.thankYou";

type Messages = Record<Locale, Record<MessageKey, string>>;

export const messages: Messages = {
  id: {
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.delete": "Hapus",
    "common.edit": "Edit",
    "common.add": "Tambah",
    "common.search": "Cari",
    "common.loading": "Memuat...",
    "common.error": "Terjadi kesalahan",
    "nav.dashboard": "Dashboard",
    "nav.catalog": "Katalog",
    "nav.members": "Anggota",
    "nav.loans": "Peminjaman",
    "nav.rooms": "Ruangan",
    "nav.visitors": "Buku Tamu",
    "nav.assets": "Aset",
    "nav.settings": "Pengaturan",
    "auth.login": "Masuk",
    "auth.logout": "Keluar",
    "auth.email": "Email",
    "auth.password": "Password",
    "book.title": "Judul",
    "book.author": "Pengarang",
    "book.available": "Tersedia",
    "book.borrowed": "Dipinjam",
    "loan.borrow": "Pinjam",
    "loan.return": "Kembalikan",
    "loan.dueDate": "Jatuh Tempo",
    "loan.renew": "Perpanjang",
    "member.name": "Nama",
    "member.number": "Nomor Anggota",
    "member.status": "Status",
    "common.welcome": "Selamat Datang",
    "common.goodbye": "Sampai Jumpa",
    "common.thankYou": "Terima Kasih",
  },
  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "nav.dashboard": "Dashboard",
    "nav.catalog": "Catalog",
    "nav.members": "Members",
    "nav.loans": "Loans",
    "nav.rooms": "Rooms",
    "nav.visitors": "Visitors",
    "nav.assets": "Assets",
    "nav.settings": "Settings",
    "auth.login": "Sign In",
    "auth.logout": "Sign Out",
    "auth.email": "Email",
    "auth.password": "Password",
    "book.title": "Title",
    "book.author": "Author",
    "book.available": "Available",
    "book.borrowed": "Borrowed",
    "loan.borrow": "Borrow",
    "loan.return": "Return",
    "loan.dueDate": "Due Date",
    "loan.renew": "Renew",
    "member.name": "Name",
    "member.number": "Member Number",
    "member.status": "Status",
    "common.welcome": "Welcome",
    "common.goodbye": "Goodbye",
    "common.thankYou": "Thank You",
  },
};

/**
 * Get translated message.
 * Falls back to Indonesian (default) jika key tidak ditemukan.
 */
export function t(key: MessageKey, locale: Locale = defaultLocale): string {
  return messages[locale]?.[key] ?? messages[defaultLocale][key] ?? key;
}
