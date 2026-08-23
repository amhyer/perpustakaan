/**
 * Storybook stories untuk StreakCalendar.
 *
 * Menampilkan visualisasi streak 30 hari terakhir.
 */

import type { Meta, StoryObj } from "@storybook/react";

// StreakCalendar butuh /api/points/me — untuk story, kita buat wrapper
// yang inject data secara langsung.

const meta: Meta<any> = {
  title: "Rewards/StreakCalendar",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Heatmap streak membaca 30 hari terakhir. Merah = hari membaca, abu-abu = tidak. Lingkaran biru = hari ini.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<any>;

// Mock the fetch
const mockFetch = (history: { date: string; points: number }[], streak: number) => {
  // @ts-ignore
  global.fetch = (url: string) => {
    if (url.includes("/api/points/me")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ currentStreak: streak, streakHistory: history }),
      } as Response);
    }
    return Promise.reject("not mocked");
  };
};

const generateMockHistory = (
  streakDays: number,
  totalDays: number
): { date: string; points: number }[] => {
  const history = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const date = d.toISOString().split("T")[0];
    // Last `streakDays` days are active
    const isActive = i < streakDays;
    history.push({ date, points: isActive ? 10 : 0 });
  }
  return history;
};

// Mock component that injects data directly
const StreakCalendarMock = ({ history, streak }: any) => {
  mockFetch(history, streak);
  // Dynamic import to avoid issues
  const Component = require("../src/components/app/rewards/streak-calendar").StreakCalendar;
  return <Component />;
};

export const ZeroStreak: Story = {
  render: () => <StreakCalendarMock history={generateMockHistory(0, 30)} streak={0} />,
};

export const Streak3Days: Story = {
  render: () => <StreakCalendarMock history={generateMockHistory(3, 30)} streak={3} />,
};

export const Streak7Days: Story = {
  render: () => <StreakCalendarMock history={generateMockHistory(7, 30)} streak={7} />,
};

export const Streak14Days: Story = {
  render: () => <StreakCalendarMock history={generateMockHistory(14, 30)} streak={14} />,
};

export const Streak30Days: Story = {
  render: () => <StreakCalendarMock history={generateMockHistory(30, 30)} streak={30} />,
};

export const RandomPattern: Story = {
  render: () => {
    const history = generateMockHistory(0, 30).map((h) => ({
      ...h,
      points: Math.random() > 0.4 ? Math.floor(Math.random() * 30) + 5 : 0,
    }));
    return <StreakCalendarMock history={history} streak={5} />;
  },
};
