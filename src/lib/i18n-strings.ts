/**
 * i18n Strings — Centralized translation library.
 *
 * Sprint S - Tier 3 #12: Internationalization (lanjutan).
 *
 * Supports:
 * - Indonesian (id) - default
 * - English (en)
 * - Arabic (ar) - RTL support
 * - Chinese (zh)
 *
 * Use:
 *   import { t } from "@/lib/i18n-strings";
 *   const text = t("welcome", "id");
 *
 * Or with locale:
 *   t("book.borrow", locale)
 */

import type { Locale } from "@/i18n/config";

// ===== Types =====

export type TranslationKey = keyof typeof TRANSLATIONS["id"];

export type TranslationVars = Record<string, string | number>;

// ===== Translations =====

const TRANSLATIONS = {
  // ===== Indonesian =====
  id: {
    // Common
    "common.welcome": "Selamat Datang",
    "common.search": "Cari",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.delete": "Hapus",
    "common.edit": "Edit",
    "common.add": "Tambah",
    "common.confirm": "Konfirmasi",
    "common.back": "Kembali",
    "common.next": "Selanjutnya",
    "common.previous": "Sebelumnya",
    "common.loading": "Memuat...",
    "common.error": "Terjadi kesalahan",
    "common.success": "Berhasil",
    "common.yes": "Ya",
    "common.no": "Tidak",
    "common.all": "Semua",
    "common.none": "Tidak ada",
    "common.total": "Total",
    "common.unknown": "Tidak diketahui",

    // Auth
    "auth.login": "Masuk",
    "auth.logout": "Keluar",
    "auth.email": "Email",
    "auth.password": "Kata Sandi",
    "auth.wrongPassword": "Email atau kata sandi salah",
    "auth.mustLogin": "Anda harus masuk terlebih dahulu",
    "auth.twoFactor": "Autentikasi 2 Faktor",
    "auth.enterCode": "Masukkan kode 6 digit",

    // Library
    "library.books": "Buku",
    "library.members": "Anggota",
    "library.loans": "Peminjaman",
    "library.returns": "Pengembalian",
    "library.fines": "Denda",
    "library.dashboard": "Dasbor",
    "library.settings": "Pengaturan",
    "library.profile": "Profil",
    "library.notifications": "Notifikasi",
    "library.leaderboard": "Peringkat",
    "library.certificates": "Sertifikat",
    "library.donations": "Donasi",
    "library.clubs": "Komunitas Buku",

    // Book actions
    "book.borrow": "Pinjam Buku",
    "book.return": "Kembalikan Buku",
    "book.reserve": "Reservasi",
    "book.renew": "Perpanjang",
    "book.review": "Beri Ulasan",
    "book.wishlist": "Wishlist",
    "book.available": "Tersedia",
    "book.unavailable": "Tidak Tersedia",
    "book.dueDate": "Jatuh Tempo",
    "book.overdue": "Terlambat",
    "book.borrowSuccess": "Berhasil meminjam buku",
    "book.returnSuccess": "Buku berhasil dikembalikan",
    "book.dueIn": "Jatuh tempo dalam {days} hari",
    "book.daysOverdue": "Terlambat {days} hari",

    // Member
    "member.student": "Siswa",
    "member.teacher": "Guru",
    "member.librarian": "Pustakawan",
    "member.streak": "Streak",
    "member.points": "Poin",
    "member.booksRead": "Buku Dibaca",
    "member.level": "Level",
    "member.joinDate": "Tanggal Bergabung",
    "member.classGrade": "Kelas",

    // Levels
    "level.pemula": "Pemula",
    "level.pembaca": "Pembaca",
    "level.kutu-buku": "Kutu Buku",
    "level.kolektor": "Kolektor",
    "level.penjelajah": "Penjelajah",
    "level.maestro": "Maestro",
    "level.legenda": "Legenda",

    // Gamification
    "game.achievement": "Pencapaian",
    "game.challenge": "Tantangan",
    "game.challengeComplete": "Tantangan Selesai!",
    "game.levelUp": "Naik Level!",
    "game.badge": "Lencana",
    "game.streakMaintained": "Streak dipertahankan!",
    "game.streakAtRisk": "Streak Anda akan putus!",
    "game.weeklyGoal": "Target Mingguan",
    "game.monthlyGoal": "Target Bulanan",
    "game.yearlyGoal": "Target Tahunan",

    // Notifications
    "notif.bookAvailable": "Buku Tersedia!",
    "notif.dueTomorrow": "Jatuh tempo besok",
    "notif.wishlistAvailable": "Wishlist Tersedia!",
    "notif.levelUp": "Selamat Naik Level!",
    "notif.badgeEarned": "Pencapaian Baru!",
    "notif.streakReminder": "Pertahankan streak Anda!",

    // Errors
    "error.network": "Tidak ada koneksi internet",
    "error.unauthorized": "Tidak punya akses",
    "error.notFound": "Tidak ditemukan",
    "error.serverError": "Kesalahan server",
    "error.tryAgain": "Silakan coba lagi",

    // Time
    "time.today": "Hari ini",
    "time.yesterday": "Kemarin",
    "time.thisWeek": "Minggu ini",
    "time.thisMonth": "Bulan ini",
    "time.thisYear": "Tahun ini",
    "time.never": "Tidak pernah",
  },

  // ===== English =====
  en: {
    "common.welcome": "Welcome",
    "common.search": "Search",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.success": "Success",
    "common.yes": "Yes",
    "common.no": "No",
    "common.all": "All",
    "common.none": "None",
    "common.total": "Total",
    "common.unknown": "Unknown",

    "auth.login": "Sign In",
    "auth.logout": "Sign Out",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.wrongPassword": "Wrong email or password",
    "auth.mustLogin": "You must be logged in",
    "auth.twoFactor": "Two-Factor Authentication",
    "auth.enterCode": "Enter 6-digit code",

    "library.books": "Books",
    "library.members": "Members",
    "library.loans": "Loans",
    "library.returns": "Returns",
    "library.fines": "Fines",
    "library.dashboard": "Dashboard",
    "library.settings": "Settings",
    "library.profile": "Profile",
    "library.notifications": "Notifications",
    "library.leaderboard": "Leaderboard",
    "library.certificates": "Certificates",
    "library.donations": "Donations",
    "library.clubs": "Book Clubs",

    "book.borrow": "Borrow Book",
    "book.return": "Return Book",
    "book.reserve": "Reserve",
    "book.renew": "Renew",
    "book.review": "Write Review",
    "book.wishlist": "Wishlist",
    "book.available": "Available",
    "book.unavailable": "Unavailable",
    "book.dueDate": "Due Date",
    "book.overdue": "Overdue",
    "book.borrowSuccess": "Book borrowed successfully",
    "book.returnSuccess": "Book returned successfully",
    "book.dueIn": "Due in {days} days",
    "book.daysOverdue": "{days} days overdue",

    "member.student": "Student",
    "member.teacher": "Teacher",
    "member.librarian": "Librarian",
    "member.streak": "Streak",
    "member.points": "Points",
    "member.booksRead": "Books Read",
    "member.level": "Level",
    "member.joinDate": "Join Date",
    "member.classGrade": "Class",

    "level.pemula": "Beginner",
    "level.pembaca": "Reader",
    "level.kutu-buku": "Bookworm",
    "level.kolektor": "Collector",
    "level.penjelajah": "Explorer",
    "level.maestro": "Maestro",
    "level.legenda": "Legend",

    "game.achievement": "Achievement",
    "game.challenge": "Challenge",
    "game.challengeComplete": "Challenge Complete!",
    "game.levelUp": "Level Up!",
    "game.badge": "Badge",
    "game.streakMaintained": "Streak maintained!",
    "game.streakAtRisk": "Your streak is at risk!",
    "game.weeklyGoal": "Weekly Goal",
    "game.monthlyGoal": "Monthly Goal",
    "game.yearlyGoal": "Yearly Goal",

    "notif.bookAvailable": "Book Available!",
    "notif.dueTomorrow": "Due Tomorrow",
    "notif.wishlistAvailable": "Wishlist Available!",
    "notif.levelUp": "Level Up!",
    "notif.badgeEarned": "New Achievement!",
    "notif.streakReminder": "Keep your streak going!",

    "error.network": "No internet connection",
    "error.unauthorized": "Unauthorized",
    "error.notFound": "Not found",
    "error.serverError": "Server error",
    "error.tryAgain": "Please try again",

    "time.today": "Today",
    "time.yesterday": "Yesterday",
    "time.thisWeek": "This Week",
    "time.thisMonth": "This Month",
    "time.thisYear": "This Year",
    "time.never": "Never",
  },

  // ===== Arabic (RTL) =====
  ar: {
    "common.welcome": "مرحباً",
    "common.search": "بحث",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.add": "إضافة",
    "common.confirm": "تأكيد",
    "common.back": "رجوع",
    "common.next": "التالي",
    "common.previous": "السابق",
    "common.loading": "جاري التحميل...",
    "common.error": "حدث خطأ",
    "common.success": "نجح",
    "common.yes": "نعم",
    "common.no": "لا",
    "common.all": "الكل",
    "common.none": "لا شيء",
    "common.total": "المجموع",
    "common.unknown": "غير معروف",

    "auth.login": "تسجيل الدخول",
    "auth.logout": "تسجيل الخروج",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.wrongPassword": "بريد إلكتروني أو كلمة مرور خاطئة",
    "auth.mustLogin": "يجب تسجيل الدخول أولاً",
    "auth.twoFactor": "المصادقة الثنائية",
    "auth.enterCode": "أدخل رمز 6 أرقام",

    "library.books": "الكتب",
    "library.members": "الأعضاء",
    "library.loans": "الاستعارة",
    "library.returns": "الإرجاع",
    "library.fines": "الغرامات",
    "library.dashboard": "لوحة التحكم",
    "library.settings": "الإعدادات",
    "library.profile": "الملف الشخصي",
    "library.notifications": "الإشعارات",
    "library.leaderboard": "لوحة المتصدرين",
    "library.certificates": "الشهادات",
    "library.donations": "التبرعات",
    "library.clubs": "نوادي الكتب",

    "book.borrow": "استعارة كتاب",
    "book.return": "إرجاع كتاب",
    "book.reserve": "حجز",
    "book.renew": "تجديد",
    "book.review": "كتابة مراجعة",
    "book.wishlist": "قائمة الأمنيات",
    "book.available": "متاح",
    "book.unavailable": "غير متاح",
    "book.dueDate": "تاريخ الاستحقاق",
    "book.overdue": "متأخر",
    "book.borrowSuccess": "تم استعارة الكتاب بنجاح",
    "book.returnSuccess": "تم إرجاع الكتاب بنجاح",
    "book.dueIn": "يستحق خلال {days} يوم",
    "book.daysOverdue": "متأخر {days} يوم",

    "member.student": "طالب",
    "member.teacher": "معلم",
    "member.librarian": "أمين مكتبة",
    "member.streak": "سلسلة",
    "member.points": "نقاط",
    "member.booksRead": "الكتب المقروءة",
    "member.level": "المستوى",
    "member.joinDate": "تاريخ الانضمام",
    "member.classGrade": "الفصل",

    "level.pemula": "مبتدئ",
    "level.pembaca": "قارئ",
    "level.kutu-buku": "دودة كتب",
    "level.kolektor": "جامع",
    "level.penjelajah": "مستكشف",
    "level.maestro": "مايسترو",
    "level.legenda": "أسطورة",

    "game.achievement": "إنجاز",
    "game.challenge": "تحدي",
    "game.challengeComplete": "اكتمل التحدي!",
    "game.levelUp": "ارتقاء المستوى!",
    "game.badge": "شارة",
    "game.streakMaintained": "تم الحفاظ على السلسلة!",
    "game.streakAtRisk": "سلسلتك في خطر!",
    "game.weeklyGoal": "هدف أسبوعي",
    "game.monthlyGoal": "هدف شهري",
    "game.yearlyGoal": "هدف سنوي",

    "notif.bookAvailable": "الكتاب متاح!",
    "notif.dueTomorrow": "يستحق غداً",
    "notif.wishlistAvailable": "قائمة الأمنيات متاحة!",
    "notif.levelUp": "ارتقاء المستوى!",
    "notif.badgeEarned": "إنجاز جديد!",
    "notif.streakReminder": "حافظ على سلسلتك!",

    "error.network": "لا يوجد اتصال بالإنترنت",
    "error.unauthorized": "غير مصرح",
    "error.notFound": "غير موجود",
    "error.serverError": "خطأ في الخادم",
    "error.tryAgain": "حاول مرة أخرى",

    "time.today": "اليوم",
    "time.yesterday": "أمس",
    "time.thisWeek": "هذا الأسبوع",
    "time.thisMonth": "هذا الشهر",
    "time.thisYear": "هذا العام",
    "time.never": "أبداً",
  },

  // ===== Chinese (Simplified) =====
  zh: {
    "common.welcome": "欢迎",
    "common.search": "搜索",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.delete": "删除",
    "common.edit": "编辑",
    "common.add": "添加",
    "common.confirm": "确认",
    "common.back": "返回",
    "common.next": "下一个",
    "common.previous": "上一个",
    "common.loading": "加载中...",
    "common.error": "发生错误",
    "common.success": "成功",
    "common.yes": "是",
    "common.no": "否",
    "common.all": "全部",
    "common.none": "无",
    "common.total": "总计",
    "common.unknown": "未知",

    "auth.login": "登录",
    "auth.logout": "登出",
    "auth.email": "邮箱",
    "auth.password": "密码",
    "auth.wrongPassword": "邮箱或密码错误",
    "auth.mustLogin": "请先登录",
    "auth.twoFactor": "双因素认证",
    "auth.enterCode": "输入6位代码",

    "library.books": "图书",
    "library.members": "成员",
    "library.loans": "借阅",
    "library.returns": "归还",
    "library.fines": "罚款",
    "library.dashboard": "仪表板",
    "library.settings": "设置",
    "library.profile": "个人资料",
    "library.notifications": "通知",
    "library.leaderboard": "排行榜",
    "library.certificates": "证书",
    "library.donations": "捐赠",
    "library.clubs": "读书会",

    "book.borrow": "借书",
    "book.return": "还书",
    "book.reserve": "预约",
    "book.renew": "续借",
    "book.review": "写评论",
    "book.wishlist": "心愿单",
    "book.available": "可借",
    "book.unavailable": "不可借",
    "book.dueDate": "到期日",
    "book.overdue": "逾期",
    "book.borrowSuccess": "借书成功",
    "book.returnSuccess": "还书成功",
    "book.dueIn": "{days}天后到期",
    "book.daysOverdue": "逾期{days}天",

    "member.student": "学生",
    "member.teacher": "教师",
    "member.librarian": "图书管理员",
    "member.streak": "连续",
    "member.points": "积分",
    "member.booksRead": "已读书",
    "member.level": "等级",
    "member.joinDate": "加入日期",
    "member.classGrade": "班级",

    "level.pemula": "初学者",
    "level.pembaca": "读者",
    "level.kutu-buku": "书虫",
    "level.kolektor": "收藏家",
    "level.penjelajah": "探索者",
    "level.maestro": "大师",
    "level.legenda": "传奇",

    "game.achievement": "成就",
    "game.challenge": "挑战",
    "game.challengeComplete": "挑战完成！",
    "game.levelUp": "升级！",
    "game.badge": "徽章",
    "game.streakMaintained": "连续保持！",
    "game.streakAtRisk": "你的连续有风险！",
    "game.weeklyGoal": "周目标",
    "game.monthlyGoal": "月目标",
    "game.yearlyGoal": "年目标",

    "notif.bookAvailable": "图书可借！",
    "notif.dueTomorrow": "明天到期",
    "notif.wishlistAvailable": "心愿单可借！",
    "notif.levelUp": "升级！",
    "notif.badgeEarned": "新成就！",
    "notif.streakReminder": "保持你的连续！",

    "error.network": "无网络连接",
    "error.unauthorized": "未授权",
    "error.notFound": "未找到",
    "error.serverError": "服务器错误",
    "error.tryAgain": "请重试",

    "time.today": "今天",
    "time.yesterday": "昨天",
    "time.thisWeek": "本周",
    "time.thisMonth": "本月",
    "time.thisYear": "今年",
    "time.never": "从不",
  },
} as const;

// ===== Translation Function =====

/**
 * Translate a key to the current locale.
 * Falls back to Indonesian if key not found in target locale.
 */
export function t(
  key: string,
  locale: Locale = "id",
  vars?: TranslationVars
): string {
  // Try requested locale
  const translations = (TRANSLATIONS as any)[locale];
  if (translations && translations[key] !== undefined) {
    return interpolate(translations[key], vars);
  }

  // Fallback to Indonesian
  if (locale !== "id" && TRANSLATIONS.id[key] !== undefined) {
    return interpolate(TRANSLATIONS.id[key], vars);
  }

  // Return key as fallback
  return key;
}

/**
 * Interpolate variables in translation string.
 * Supports {name} syntax.
 */
function interpolate(text: string, vars?: TranslationVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}

/**
 * Get all available locales.
 */
export function getAvailableLocales(): Locale[] {
  return ["id", "en", "ar", "zh"];
}

/**
 * Check if locale is RTL.
 */
export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}

/**
 * Get native name of locale.
 */
export function getLocaleName(locale: Locale): string {
  const names: Record<Locale, string> = {
    id: "Bahasa Indonesia",
    en: "English",
    ar: "العربية",
    zh: "中文",
  };
  return names[locale];
}

/**
 * Format number according to locale.
 */
export function formatNumber(num: number, locale: Locale = "id"): string {
  try {
    return new Intl.NumberFormat(locale).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format date according to locale.
 */
export function formatDate(date: Date, locale: Locale = "id"): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString("en-US");
  }
}

/**
 * Format relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(date: Date, locale: Locale = "id"): string {
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;

  const translations: Record<Locale, Record<string, string>> = {
    id: { seconds: "detik", minutes: "menit", hours: "jam", days: "hari", ago: "yang lalu" },
    en: { seconds: "seconds", minutes: "minutes", hours: "hours", days: "days", ago: "ago" },
    ar: { seconds: "ثواني", minutes: "دقائق", hours: "ساعات", days: "أيام", ago: "مضت" },
    zh: { seconds: "秒", minutes: "分钟", hours: "小时", days: "天", ago: "前" },
  };

  const t = translations[locale];

  if (diff < 60) return `${Math.floor(diff)} ${t.seconds} ${t.ago}`;
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t.minutes} ${t.ago}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t.hours} ${t.ago}`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ${t.days} ${t.ago}`;

  return formatDate(date, locale);
}
