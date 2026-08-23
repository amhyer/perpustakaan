/**
 * Storybook stories untuk LiveLeaderboard.
 *
 * Demo visualisasi real-time leaderboard dengan animasi.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";

const meta: Meta<any> = {
  title: "Rewards/LiveLeaderboard",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Real-time leaderboard dengan SSE subscription. Auto-update saat ada perubahan poin.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<any>;

const mockFetch = (entries: any[]) => {
  // @ts-ignore
  global.fetch = (url: string) => {
    if (url.includes("/api/rewards/analytics")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            leaderboard: entries,
            kpis: { totalCirculation: 1500 },
          }),
      } as Response);
    }
    return Promise.reject("not mocked");
  };
};

const mockLeaderboard = [
  { rank: 1, member: { id: "u1", fullName: "Andini Putri", memberNumber: "SIS-001", classGrade: "IX-A" }, balance: 680 },
  { rank: 2, member: { id: "u2", fullName: "Rafi Pratama", memberNumber: "SIS-002", classGrade: "VIII-B" }, balance: 520 },
  { rank: 3, member: { id: "u3", fullName: "Nayla Zahra", memberNumber: "SIS-003", classGrade: "VII-C" }, balance: 480 },
  { rank: 4, member: { id: "u4", fullName: "Dimas Anggara", memberNumber: "SIS-004", classGrade: "IX-A" }, balance: 410 },
  { rank: 5, member: { id: "u5", fullName: "Budi Santoso", memberNumber: "GUR-001", classGrade: "Matematika" }, balance: 340 },
];

const mockSSE = () => {
  // @ts-ignore
  global.EventSource = class {
    addEventListener() {}
    close() {}
  };
};

const LiveLeaderboardMock = ({ entries, currentUserId }: { entries: any[]; currentUserId?: string }) => {
  mockFetch(entries);
  mockSSE();
  const Component = require("../src/components/app/rewards/live-leaderboard").LiveLeaderboard;
  return <Component currentUserId={currentUserId} topN={10} />;
};

export const Default: Story = {
  render: () => <LiveLeaderboardMock entries={mockLeaderboard} />,
};

export const CurrentUserInTop: Story = {
  render: () => <LiveLeaderboardMock entries={mockLeaderboard} currentUserId="u3" />,
};

export const CurrentUserNotInTop: Story = {
  render: () => {
    const extended = [
      ...mockLeaderboard,
      { rank: 6, member: { id: "u6", fullName: "Sinta Dewi", memberNumber: "SIS-005", classGrade: "VII-A" }, balance: 220 },
      { rank: 7, member: { id: "u7", fullName: "Rio Hermawan", memberNumber: "SIS-006", classGrade: "VIII-A" }, balance: 180 },
    ];
    return <LiveLeaderboardMock entries={extended} currentUserId="u7" />;
  },
};

export const Empty: Story = {
  render: () => <LiveLeaderboardMock entries={[]} />,
};
