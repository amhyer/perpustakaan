/**
 * Storybook stories untuk list widgets: TopBooksList, TopMembersList, RecentLoansTable.
 */

import type { Meta, StoryObj } from "@storybook/react";
import {
  TopBooksList,
  TopMembersList,
  RecentLoansTable,
  type PopularBook,
  type TopMember,
  type DashboardLoan,
} from "../../src/components/app/dashboard/widgets";

const mockBooks: PopularBook[] = [
  {
    id: "b1",
    title: "Laskar Pelangi",
    author: "Andrea Hirata",
    coverColor: "#1e3a5f",
    coverImage: null,
    loanCount: 42,
  },
  {
    id: "b2",
    title: "Bumi Manusia",
    author: "Pramoedya Ananta Toer",
    coverColor: "#2d5a3d",
    coverImage: null,
    loanCount: 38,
  },
  {
    id: "b3",
    title: "Ayat-Ayat Cinta",
    author: "Habiburrahman El Shirazy",
    coverColor: "#c99544",
    coverImage: null,
    loanCount: 35,
  },
];

const mockMembers: TopMember[] = [
  {
    id: "m1",
    fullName: "Andi Setiawan",
    memberNumber: "STD-2024-001",
    category: "STUDENT",
    classGrade: "XII-IPA-1",
    loanCount: 24,
  },
  {
    id: "m2",
    fullName: "Budi Raharjo, S.Pd.",
    memberNumber: "TCH-2024-005",
    category: "TEACHER",
    classGrade: "Matematika",
    loanCount: 18,
  },
  {
    id: "m3",
    fullName: "Citra Dewi",
    memberNumber: "STD-2024-042",
    category: "STUDENT",
    classGrade: "XI-IPS-2",
    loanCount: 16,
  },
];

const mockLoans: DashboardLoan[] = [
  {
    id: "l1",
    memberId: "m1",
    bookItemId: "bi1",
    bookId: "b1",
    loanDate: "2026-08-22T08:00:00Z",
    dueDate: "2026-08-29T08:00:00Z",
    returnDate: null,
    status: "LOANED",
    fineAmount: 0,
    finePaid: 0,
    renewedCount: 0,
    member: {
      id: "m1",
      memberNumber: "STD-2024-001",
      fullName: "Andi Setiawan",
      category: "STUDENT",
      classGrade: "XII-IPA-1",
    },
    bookItem: {
      book: {
        id: "b1",
        title: "Laskar Pelangi",
        author: "Andrea Hirata",
        coverColor: "#1e3a5f",
        coverImage: null,
      },
    },
  },
  {
    id: "l2",
    memberId: "m2",
    bookItemId: "bi2",
    bookId: "b2",
    loanDate: "2026-08-20T10:30:00Z",
    dueDate: "2026-09-03T10:30:00Z",
    returnDate: null,
    status: "LOANED",
    fineAmount: 0,
    finePaid: 0,
    renewedCount: 1,
    member: {
      id: "m2",
      memberNumber: "TCH-2024-005",
      fullName: "Budi Raharjo, S.Pd.",
      category: "TEACHER",
      classGrade: null,
    },
    bookItem: {
      book: {
        id: "b2",
        title: "Bumi Manusia",
        author: "Pramoedya Ananta Toer",
        coverColor: "#2d5a3d",
        coverImage: null,
      },
    },
  },
];

// ===== TopBooksList =====
const topBooksMeta: Meta<typeof TopBooksList> = {
  title: "Widgets/TopBooksList",
  component: TopBooksList,
  tags: ["autodocs"],
};

export const TopBooksDefault: StoryObj<typeof TopBooksList> = {
  args: {
    books: mockBooks,
    userRole: "LIBRARIAN",
  },
};

export const TopBooksEmpty: StoryObj<typeof TopBooksList> = {
  args: {
    books: [],
    userRole: "LIBRARIAN",
  },
};

export const TopBooksTeacherView: StoryObj<typeof TopBooksList> = {
  args: {
    books: mockBooks,
    userRole: "TEACHER",
  },
};

// ===== TopMembersList =====
const topMembersMeta: Meta<typeof TopMembersList> = {
  title: "Widgets/TopMembersList",
  component: TopMembersList,
  tags: ["autodocs"],
};

export const TopMembersDefault: StoryObj<typeof TopMembersList> = {
  args: {
    members: mockMembers,
    userRole: "LIBRARIAN",
  },
};

export const TopMembersEmpty: StoryObj<typeof TopMembersList> = {
  args: {
    members: [],
    userRole: "LIBRARIAN",
  },
};

// ===== RecentLoansTable =====
const recentLoansMeta: Meta<typeof RecentLoansTable> = {
  title: "Widgets/RecentLoansTable",
  component: RecentLoansTable,
  tags: ["autodocs"],
};

export const RecentLoansDefault: StoryObj<typeof RecentLoansTable> = {
  args: {
    loans: mockLoans,
    userRole: "LIBRARIAN",
    description: "5 transaksi peminjaman terakhir",
  },
};

export const RecentLoansEmpty: StoryObj<typeof RecentLoansTable> = {
  args: {
    loans: [],
    userRole: "LIBRARIAN",
  },
};

export { topBooksMeta, topMembersMeta, recentLoansMeta };
