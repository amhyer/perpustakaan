/**
 * Storybook stories untuk RewardCard.
 *
 * Menampilkan semua state kartu: bisa klaim, poin kurang, stok habis, featured.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { RewardCard, type RewardItem } from "../src/components/app/rewards/reward-card";

const meta: Meta<typeof RewardCard> = {
  title: "Rewards/RewardCard",
  component: RewardCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Kartu hadiah untuk katalog. Handles 4 state: bisa diklaim, poin kurang, stok habis, featured.",
      },
    },
  },
  argTypes: {
    onClaim: { action: "claim clicked" },
  },
};

export default meta;
type Story = StoryObj<typeof RewardCard>;

const baseReward: RewardItem = {
  id: "r1",
  name: "Bookmark Custom Perpustakaan",
  description: "Bookmark berkualitas dengan desain eksklusif perpustakaan kami.",
  imageUrl: null,
  category: "STATIONERY",
  pointCost: 50,
  minRole: "STUDENT",
  stock: 100,
  stockClaimed: 5,
  requiresApproval: false,
  maxPerMember: null,
  cooldownDays: null,
  isFeatured: false,
  remainingStock: 95,
  isOutOfStock: false,
  canAfford: true,
};

export const CanClaim: Story = {
  args: {
    reward: baseReward,
    onClaim: fn(),
  },
};

export const LockedNoPoints: Story = {
  args: {
    reward: {
      ...baseReward,
      pointCost: 1000,
      canAfford: false,
    },
    onClaim: fn(),
  },
};

export const OutOfStock: Story = {
  args: {
    reward: {
      ...baseReward,
      stock: 10,
      stockClaimed: 10,
      remainingStock: 0,
      isOutOfStock: true,
      canAfford: false,
    },
    onClaim: fn(),
  },
};

export const Featured: Story = {
  args: {
    reward: {
      ...baseReward,
      isFeatured: true,
      name: "Sertifikat Pembaca Teladan",
      pointCost: 700,
    },
    onClaim: fn(),
  },
};

export const RequiresApproval: Story = {
  args: {
    reward: {
      ...baseReward,
      name: "Voucher Gramedia Rp 50.000",
      pointCost: 600,
      requiresApproval: true,
    },
    onClaim: fn(),
  },
};

export const UnlimitedStock: Story = {
  args: {
    reward: {
      ...baseReward,
      name: "Sertifikat Digital",
      pointCost: 300,
      stock: null,
      stockClaimed: 0,
      remainingStock: null,
    },
    onClaim: fn(),
  },
};

export const LowStock: Story = {
  args: {
    reward: {
      ...baseReward,
      name: "Mystery Box Perpustakaan",
      pointCost: 1000,
      stock: 5,
      stockClaimed: 3,
      remainingStock: 2,
    },
    onClaim: fn(),
  },
};

export const AllStatesGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <RewardCard reward={{ ...baseReward, name: "Bisa Diklaim", canAfford: true }} onClaim={fn()} />
      <RewardCard reward={{ ...baseReward, name: "Poin Kurang", pointCost: 1000, canAfford: false }} onClaim={fn()} />
      <RewardCard
        reward={{
          ...baseReward,
          name: "Stok Habis",
          stock: 5,
          stockClaimed: 5,
          remainingStock: 0,
          isOutOfStock: true,
          canAfford: false,
        }}
        onClaim={fn()}
      />
      <RewardCard
        reward={{ ...baseReward, name: "Featured", isFeatured: true, pointCost: 700 }}
        onClaim={fn()}
      />
    </div>
  ),
};
