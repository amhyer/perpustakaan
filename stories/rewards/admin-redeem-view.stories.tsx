/**
 * Storybook stories untuk AdminRedeemView.
 *
 * Menampilkan halaman scanner/deliver untuk pustakawan.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";

const meta: Meta<any> = {
  title: "Rewards/AdminRedeemView",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Halaman scanner QR / input kode ambil untuk pustakawan. Lookup detail, konfirmasi deliver.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<any>;

// Mock the fetch & URL
const setupMock = (redemption: any | null) => {
  // @ts-ignore
  global.fetch = (url: string, opts?: any) => {
    if (url.includes("/api/redemptions/lookup")) {
      if (redemption) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ redemption }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Kode tidak ditemukan" }),
      } as Response);
    }
    if (url.includes("/api/redemptions/admin") && url.includes("/deliver")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);
    }
    return Promise.reject("not mocked");
  };
};

const AdminRedeemMock = ({ redemption }: { redemption: any | null }) => {
  setupMock(redemption);
  const Component = require("../src/components/app/rewards/admin-redeem-view").AdminRedeemView;
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Component />
    </div>
  );
};

export const Empty: Story = {
  render: () => <AdminRedeemMock redemption={null} />,
};

const mockRedemption = {
  id: "r1",
  rewardName: "Bookmark Custom Perpustakaan",
  rewardCategory: "STATIONERY",
  pointsSpent: 50,
  status: "APPROVED" as const,
  pickupCode: "RWD-A8F2K",
  memberNote: "Warna biru dongker",
  createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  approvedAt: new Date(Date.now() - 3600000).toISOString(),
  deliveredAt: null,
  member: {
    id: "m1",
    fullName: "Andini Putri Maharani",
    memberNumber: "SIS-2024-001",
    category: "STUDENT",
    classGrade: "IX-A",
    user: { email: "andini@jendelailmu.sch.id" },
  },
  reward: {
    id: "rw1",
    name: "Bookmark Custom Perpustakaan",
    category: "STATIONERY",
    pointCost: 50,
  },
  approvedBy: { id: "u1", name: "Dewi Lestari" },
};

export const ApprovedReady: Story = {
  render: () => <AdminRedeemMock redemption={mockRedemption} />,
};

const mockDelivered = {
  ...mockRedemption,
  status: "DELIVERED" as const,
  deliveredAt: new Date().toISOString(),
  deliveredById: "u1",
  deliveryNotes: "Diberikan langsung",
};

export const AlreadyDelivered: Story = {
  render: () => <AdminRedeemMock redemption={mockDelivered} />,
};

const mockPending = {
  ...mockRedemption,
  status: "PENDING" as const,
  approvedAt: null,
  approvedBy: null,
};

export const PendingNotApproved: Story = {
  render: () => <AdminRedeemMock redemption={mockPending} />,
};
