/**
 * i18n configuration & message catalog.
 *
 * Supported locales: id (Indonesian, default) & en (English).
 * Untuk aktivasi penuh dengan next-intl middleware, lihat:
 * https://next-intl-docs.vercel.app/docs/getting-started/app-router
 *
 * Untuk sekarang, ini sebagai resource catalog yang bisa dipakai manual.
 */

export const locales = ["id", "en", "ar", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "id";

export const localeNames: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
  ar: "العربية",
  zh: "中文",
};

export const localeFlags: Record<Locale, string> = {
  id: "🇮🇩",
  en: "🇬🇧",
  ar: "🇸🇦",
  zh: "🇨🇳",
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
  ar: {
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.add": "إضافة",
    "common.search": "بحث",
    "common.loading": "جاري التحميل...",
    "common.error": "حدث خطأ",
    "nav.dashboard": "لوحة التحكم",
    "nav.catalog": "الفهرس",
    "nav.members": "الأعضاء",
    "nav.loans": "القروض",
    "nav.rooms": "الغرف",
    "nav.visitors": "الزوار",
    "nav.assets": "الأصول",
    "nav.settings": "الإعدادات",
    "auth.login": "تسجيل الدخول",
    "auth.logout": "تسجيل الخروج",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "book.title": "العنوان",
    "book.author": "المؤلف",
    "book.available": "متاح",
    "book.borrowed": "مستعار",
    "loan.borrow": "استعارة",
    "loan.return": "إرجاع",
    "loan.dueDate": "تاريخ الاستحقاق",
    "loan.renew": "تجديد",
    "member.name": "الاسم",
    "member.number": "رقم العضوية",
    "member.status": "الحالة",
    "common.welcome": "مرحباً",
    "common.goodbye": "مع السلامة",
    "common.thankYou": "شكراً لك",
  },
  zh: {
    "common.save": "保存",
    "common.cancel": "取消",
    "common.delete": "删除",
    "common.edit": "编辑",
    "common.add": "添加",
    "common.search": "搜索",
    "common.loading": "加载中...",
    "common.error": "发生错误",
    "nav.dashboard": "仪表板",
    "nav.catalog": "目录",
    "nav.members": "成员",
    "nav.loans": "借阅",
    "nav.rooms": "房间",
    "nav.visitors": "访客",
    "nav.assets": "资产",
    "nav.settings": "设置",
    "auth.login": "登录",
    "auth.logout": "退出",
    "auth.email": "邮箱",
    "auth.password": "密码",
    "book.title": "标题",
    "book.author": "作者",
    "book.available": "可借",
    "book.borrowed": "已借出",
    "loan.borrow": "借书",
    "loan.return": "还书",
    "loan.dueDate": "到期日",
    "loan.renew": "续借",
    "member.name": "姓名",
    "member.number": "会员号",
    "member.status": "状态",
    "common.welcome": "欢迎",
    "common.goodbye": "再见",
    "common.thankYou": "谢谢",
  },
};

/**
 * Get translated message.
 * Falls back to Indonesian (default) jika key tidak ditemukan.
 */
export function t(key: MessageKey, locale: Locale = defaultLocale): string {
  return messages[locale]?.[key] ?? messages[defaultLocale][key] ?? key;
}
