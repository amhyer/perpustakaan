/**
 * Shared types untuk dashboard widgets.
 *
 * Dipakai oleh:
 * - DashboardView (grid tetap)
 * - CustomizableDashboardView (drag & drop)
 * - ExecutiveDashboardView (KPI + ringkasan)
 *
 * Tujuannya: 1 sumber tipe untuk semua dashboard agar perubahan
 * data shape hanya perlu dilakukan di 1 tempat.
 */

export interface Overview {
  totalBooks: number;
  totalItems: number;
  availableItems: number;
  borrowedItems: number;
  totalMembers: number;
  activeMembers: number;
  studentMembers: number;
  teacherMembers: number;
  activeLoans: number;
  overdueLoans: number;
  pendingReservations: number;
  pendingProposals: number;
  expiredReservations: number;
  overdueFineTotal: number;
  loansToday: number;
  returnsToday: number;
  newMembersToday: number;
  recentLoansToday: { bookItem?: { book?: { title: string; author: string } }; member?: { fullName: string } }[];
  recentReturnsToday: { bookItem?: { book?: { title: string; author: string } }; member?: { fullName: string } }[];
  recentNewMembersToday: { fullName: string; category: string }[];
}

export interface TrendItem {
  date: string;
  label: string;
  count: number;
}

export interface PopularBook {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverImage: string | null;
  loanCount: number;
}

export interface TopMember {
  id: string;
  fullName: string;
  memberNumber: string;
  category: string;
  classGrade: string | null;
  loanCount: number;
}

export interface CategoryStat {
  name: string;
  count: number;
}

export interface DashboardLoan {
  id: string;
  memberId: string;
  bookItemId: string;
  bookId: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  status: string;
  fineAmount: number;
  finePaid: number;
  renewedCount: number;
  member: {
    id: string;
    memberNumber: string;
    fullName: string;
    category: string;
    classGrade: string | null;
  };
  bookItem: {
    book: {
      id: string;
      title: string;
      author: string;
      coverColor: string;
      coverImage: string | null;
    };
  };
}

export interface StatsResponse {
  overview: Overview;
  trend: TrendItem[];
  popularBooks: PopularBook[];
  topMembers: TopMember[];
  categoryStats: CategoryStat[];
  recentLoans: DashboardLoan[];
  overdueList: DashboardLoan[];
}
