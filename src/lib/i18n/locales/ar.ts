/**
 * Arabic locale — دعم اللغة العربية
 *
 * Untuk international school (Madrasah, sekolah Islam international).
 * Bahasa: Bahasa Arab (MSA - Modern Standard Arabic).
 *
 * Enable: NEXT_PUBLIC_LOCALE=ar
 */

import type { IdLocale } from "./id";

export const ar: IdLocale = {
  common: {
    appName: "مكتبة نافذة العلم",
    tagline: "فتح نوافذ المعرفة للجميع",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    loading: "جاري التحميل...",
    error: "حدث خطأ",
    retry: "حاول مرة أخرى",
    close: "إغلاق",
    confirm: "تأكيد",
    yes: "نعم",
    no: "لا",
    back: "رجوع",
    next: "التالي",
    previous: "السابق",
    search: "بحث",
    filter: "تصفية",
    all: "الكل",
    none: "لا شيء",
    total: "المجموع",
  },
  roles: {
    LIBRARIAN: "أمين المكتبة",
    PUSTAKAWAN_JUNIOR: "أمين مكتبة مبتدئ",
    TEACHER: "معلم",
    STUDENT: "طالب",
  },
  dashboard: {
    welcome: "مرحباً، {name}!",
    typeAccount: "نوع الحساب: {role}",
    quickActions: "إجراءات سريعة",
    todayActivity: "نشاط اليوم",
    needsAction: "يحتاج إجراء",
    noActionNeeded: "كل شيء على ما يرام!",
    popularBooks: "الكتب الشائعة",
    topMembers: "الأعضاء الأكثر نشاطاً",
    recentLoans: "الاستعارات الأخيرة",
    overdueAlert: "تنبيه متأخر",
    setAsHome: "تعيين كصفحة رئيسية",
    homeActive: "الرئيسية نشطة",
    defaultDashboard: "صفحتي الرئيسية الافتراضية",
    autoRouteHint: "النظام يختار لوحة التحكم تلقائياً حسب الدور",
  },
  books: {
    totalBooks: "إجمالي الكتب",
    available: "العناصر المتاحة",
    borrowed: "مستعارة حالياً",
    overdue: "متأخرة",
    noLoans: "لا توجد استعارات بعد",
    bookDetail: "تفاصيل الكتاب",
  },
  members: {
    totalMembers: "إجمالي الأعضاء",
    active: "نشط",
    student: "طالب",
    teacher: "معلم",
    addMember: "إضافة عضو",
  },
  loans: {
    active: "الاستعارات النشطة",
    dueSoon: "مستحقة هذا الأسبوع",
    fine: "غرامة",
    borrow: "استعارة",
    return: "إرجاع",
    renew: "تجديد",
    days: "أيام",
    bookReturned: "تم إرجاع الكتاب بنجاح",
  },
  errors: {
    notFound: "غير موجود",
    unauthorized: "غير مصرح",
    networkError: "فشل الاتصال بالخادم",
    tryAgain: "يرجى المحاولة مرة أخرى",
  },
  months: {
    1: "يناير",
    2: "فبراير",
    3: "مارس",
    4: "أبريل",
    5: "مايو",
    6: "يونيو",
    7: "يوليو",
    8: "أغسطس",
    9: "سبتمبر",
    10: "أكتوبر",
    11: "نوفمبر",
    12: "ديسمبر",
  },
  days: {
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",
    sunday: "الأحد",
  },
};
