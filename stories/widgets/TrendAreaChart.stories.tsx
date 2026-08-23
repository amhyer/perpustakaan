/**
 * Storybook stories untuk TrendAreaChart.
 *
 * Install Storybook dulu:
 *   bunx storybook@latest init --type nextjs
 */

import type { Meta, StoryObj } from "@storybook/react";
import { TrendAreaChart, type TrendItem } from "../../src/components/app/dashboard/widgets";

const mockTrend: TrendItem[] = [
  { date: "2026-08-16", label: "Sen", count: 12 },
  { date: "2026-08-17", label: "Sel", count: 19 },
  { date: "2026-08-18", label: "Rab", count: 8 },
  { date: "2026-08-19", label: "Kam", count: 15 },
  { date: "2026-08-20", label: "Jum", count: 22 },
  { date: "2026-08-21", label: "Sab", count: 28 },
  { date: "2026-08-22", label: "Min", count: 14 },
];

const meta: Meta<typeof TrendAreaChart> = {
  title: "Widgets/TrendAreaChart",
  component: TrendAreaChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Area chart tren peminjaman. Lazy-loaded via LazyChart untuk hemat initial bundle. Punya sr-only summary untuk screen reader, role='img' dengan aria-label komprehensif.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TrendAreaChart>;

export const Default: Story = {
  args: {
    data: mockTrend,
    title: "Tren Peminjaman 7 Hari",
    description: "Jumlah peminjaman per hari selama 7 hari terakhir",
  },
};

export const EmptyData: Story = {
  args: {
    data: [],
    title: "Tren Peminjaman",
  },
};

export const HighVolume: Story = {
  args: {
    data: mockTrend.map((d) => ({ ...d, count: d.count * 5 })),
    title: "Tren Peminjaman (Volume Tinggi)",
  },
};

export const CompactHeight: Story = {
  args: {
    data: mockTrend,
    height: 180,
    title: "Tren (Compact)",
  },
};
