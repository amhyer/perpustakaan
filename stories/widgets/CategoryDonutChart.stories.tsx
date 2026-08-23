/**
 * Storybook stories untuk CategoryDonutChart.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { CategoryDonutChart, type CategoryStat } from "../../src/components/app/dashboard/widgets";

const mockCategory: CategoryStat[] = [
  { name: "Fiksi", count: 45 },
  { name: "Non-Fiksi", count: 32 },
  { name: "Pelajaran", count: 28 },
  { name: "Referensi", count: 15 },
  { name: "Komik", count: 10 },
];

const meta: Meta<typeof CategoryDonutChart> = {
  title: "Widgets/CategoryDonutChart",
  component: CategoryDonutChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Donut chart distribusi peminjaman per kategori. Lazy-loaded. Screen reader dapat ringkasan data via sr-only + role='img' aria-label.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CategoryDonutChart>;

export const Default: Story = {
  args: {
    data: mockCategory,
  },
};

export const TwoCategories: Story = {
  args: {
    data: [
      { name: "Fiksi", count: 80 },
      { name: "Non-Fiksi", count: 20 },
    ],
  },
};

export const ManyCategories: Story = {
  args: {
    data: [
      { name: "Fiksi", count: 120 },
      { name: "Non-Fiksi", count: 95 },
      { name: "Pelajaran", count: 78 },
      { name: "Referensi", count: 45 },
      { name: "Komik", count: 38 },
      { name: "Majalah", count: 22 },
      { name: "Lainnya", count: 12 },
    ],
  },
};

export const Empty: Story = {
  args: {
    data: [],
  },
};
