/**
 * Storybook stories untuk executive dashboard widgets.
 */

import type { Meta, StoryObj } from "@storybook/react";
import {
  ExecutiveKpiCard,
  ExecutiveTopList,
  ExecutiveAlertCard,
  ExecutiveTrendChart,
} from "../../src/components/app/dashboard/widgets";
import { BookOpen, Users, Library, Activity, TrendingUp } from "lucide-react";

const mockMonthlyTrend = [
  { month: "Sep", loans: 220, members: 12, visitors: 180 },
  { month: "Okt", loans: 245, members: 8, visitors: 195 },
  { month: "Nov", loans: 280, members: 15, visitors: 210 },
  { month: "Des", loans: 195, members: 5, visitors: 140 },
  { month: "Jan", loans: 310, members: 18, visitors: 250 },
  { month: "Feb", loans: 290, members: 14, visitors: 235 },
  { month: "Mar", loans: 340, members: 22, visitors: 280 },
  { month: "Apr", loans: 360, members: 19, visitors: 295 },
  { month: "Mei", loans: 320, members: 16, visitors: 260 },
  { month: "Jun", loans: 285, members: 11, visitors: 220 },
  { month: "Jul", loans: 305, members: 14, visitors: 240 },
  { month: "Agu", loans: 324, members: 13, visitors: 255 },
];

// ===== ExecutiveKpiCard =====
const kpiMeta: Meta<typeof ExecutiveKpiCard> = {
  title: "Widgets/ExecutiveKpiCard",
  component: ExecutiveKpiCard,
  tags: ["autodocs"],
};

export const KpiTotalItems: StoryObj<typeof ExecutiveKpiCard> = {
  args: {
    icon: BookOpen,
    iconColor: "bg-primary/10 text-primary",
    value: 12450,
    label: "Total Eksemplar",
    footnote: "1.245 judul • +85 tahun ini",
  },
};

export const KpiActiveMembers: StoryObj<typeof ExecutiveKpiCard> = {
  args: {
    icon: Users,
    iconColor: "bg-emerald-100 text-emerald-700",
    value: 458,
    label: "Anggota Aktif",
    footnote: "412 siswa • 46 guru",
  },
};

export const KpiLoansWithGrowth: StoryObj<typeof ExecutiveKpiCard> = {
  args: {
    icon: Library,
    iconColor: "bg-amber-100 text-amber-700",
    value: 324,
    label: "Peminjaman Bulan Ini",
    footnote: "3.890 total tahun ini",
    growth: 12,
  },
};

export const KpiNegativeGrowth: StoryObj<typeof ExecutiveKpiCard> = {
  args: {
    icon: Activity,
    iconColor: "bg-violet-100 text-violet-700",
    value: 255,
    label: "Kunjungan Bulan Ini",
    footnote: "2.950 tahun ini",
    growth: -5,
  },
};

// ===== ExecutiveTopList =====
const topListMeta: Meta<typeof ExecutiveTopList> = {
  title: "Widgets/ExecutiveTopList",
  component: ExecutiveTopList,
  tags: ["autodocs"],
};

export const TopBooksExecutive: StoryObj<typeof ExecutiveTopList> = {
  args: {
    title: "Buku Terpopuler",
    icon: "crown",
    iconColor: "text-amber-600",
    items: [
      { id: "b1", primary: "Laskar Pelangi", secondary: "Andrea Hirata", count: 42 },
      { id: "b2", primary: "Bumi Manusia", secondary: "Pramoedya A.T.", count: 38 },
      { id: "b3", primary: "Ayat-Ayat Cinta", secondary: "Habiburrahman E.S.", count: 35 },
      { id: "b4", primary: "Negeri 5 Menara", secondary: "Ahmad Fuadi", count: 31 },
    ],
    countSuffix: "x pinjam",
  },
};

export const TopMembersExecutive: StoryObj<typeof ExecutiveTopList> = {
  args: {
    title: "Peminjam Paling Aktif",
    icon: "award",
    iconColor: "text-emerald-600",
    items: [
      { id: "m1", primary: "Andi Setiawan", secondary: "STD-2024-001", count: 24 },
      { id: "m2", primary: "Budi Raharjo, S.Pd.", secondary: "TCH-2024-005", count: 18 },
      { id: "m3", primary: "Citra Dewi", secondary: "STD-2024-042", count: 16 },
    ],
    countSuffix: "x",
  },
};

export const TopListEmpty: StoryObj<typeof ExecutiveTopList> = {
  args: {
    title: "Buku Terpopuler",
    icon: "crown",
    iconColor: "text-amber-600",
    items: [],
  },
};

// ===== ExecutiveAlertCard =====
const alertMeta: Meta<typeof ExecutiveAlertCard> = {
  title: "Widgets/ExecutiveAlertCard",
  component: ExecutiveAlertCard,
  tags: ["autodocs"],
};

export const AlertWithOverdue: StoryObj<typeof ExecutiveAlertCard> = {
  args: {
    totalOverdue: 12,
    totalFineOutstanding: 45000,
  },
};

export const AlertEmpty: StoryObj<typeof ExecutiveAlertCard> = {
  args: {
    totalOverdue: 0,
    totalFineOutstanding: 0,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Component return null saat tidak ada alert. Tidak render apa-apa.",
      },
    },
  },
};

// ===== ExecutiveTrendChart =====
const trendMeta: Meta<typeof ExecutiveTrendChart> = {
  title: "Widgets/ExecutiveTrendChart",
  component: ExecutiveTrendChart,
  tags: ["autodocs"],
};

export const TrendDefault: StoryObj<typeof ExecutiveTrendChart> = {
  args: {
    data: mockMonthlyTrend,
  },
};

export { kpiMeta, topListMeta, alertMeta, trendMeta };
