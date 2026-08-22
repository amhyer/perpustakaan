/**
 * English locale — placeholder for future implementation.
 *
 * Saat ini hanya 'id' (Indonesian) yang dipakai di seluruh app. Locale ini
 * ada sebagai placeholder untuk menunjukkan struktur dan pattern.
 *
 * Untuk enable English:
 * 1. Set NEXT_PUBLIC_LOCALE=en di .env
 * 2. Atau pakai user preference dari UserPreference
 *
 * Catatan: banyak string di-hardcode di komponen (role-badge.tsx,
 * role-empty-state.tsx, dll). Refactor bertahap diperlukan untuk
 * mencapai full i18n. Foundation ini adalah langkah pertama.
 */

import type { IdLocale } from "./id";

export const en: IdLocale = {
  common: {
    appName: "Jendela Ilmu Library",
    tagline: "Opening Windows of Knowledge for All",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    loading: "Loading...",
    error: "An error occurred",
    retry: "Try Again",
    close: "Close",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    back: "Back",
    next: "Next",
    previous: "Previous",
    search: "Search",
    filter: "Filter",
    all: "All",
    none: "None",
    total: "Total",
  },
  roles: {
    LIBRARIAN: "Librarian",
    PUSTAKAWAN_JUNIOR: "Junior Librarian",
    TEACHER: "Teacher",
    STUDENT: "Student",
  },
  dashboard: {
    welcome: "Welcome, {name}!",
    typeAccount: "Account type: {role}",
    quickActions: "Quick Actions",
    todayActivity: "Today's Activity",
    needsAction: "Needs Action",
    noActionNeeded: "All good!",
    popularBooks: "Popular Books",
    topMembers: "Most Active Members",
    recentLoans: "Recent Loans",
    overdueAlert: "Overdue Alert",
    setAsHome: "Set as Home",
    homeActive: "Home Active",
    defaultDashboard: "My Default Home",
    autoRouteHint: "System auto-selects dashboard based on role",
  },
  books: {
    totalBooks: "Total Books",
    available: "Available Items",
    borrowed: "currently borrowed",
    overdue: "Overdue",
    noLoans: "No loans yet",
    bookDetail: "Book Detail",
  },
  members: {
    totalMembers: "Total Members",
    active: "Active",
    student: "Student",
    teacher: "Teacher",
    addMember: "Add Member",
  },
  loans: {
    active: "Active Loans",
    dueSoon: "Due This Week",
    fine: "Fine",
    borrow: "Borrow",
    return: "Return",
    renew: "Renew",
    days: "days",
    bookReturned: "Book successfully returned",
  },
  errors: {
    notFound: "Not found",
    unauthorized: "Unauthorized",
    networkError: "Failed to connect to server",
    tryAgain: "Please try again",
  },
  months: {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  },
  days: {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  },
};
