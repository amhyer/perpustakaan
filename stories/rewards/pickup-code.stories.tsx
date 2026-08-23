/**
 * Storybook stories untuk PickupCode.
 *
 * Menampilkan kode ambil dengan QR code (compact & full variant).
 */

import type { Meta, StoryObj } from "@storybook/react";
import { PickupCode } from "../src/components/app/rewards/pickup-code";

const meta: Meta<typeof PickupCode> = {
  title: "Rewards/PickupCode",
  component: PickupCode,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Kode ambil hadiah dengan QR code. QR berisi URL yang bisa di-scan untuk lookup.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PickupCode>;

export const Compact: Story = {
  args: {
    code: "RWD-A8F2K",
    variant: "compact",
  },
};

export const Full: Story = {
  args: {
    code: "RWD-A8F2K",
    variant: "full",
  },
};

export const DifferentCodes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-slate-500 mb-1">Compact</div>
        <PickupCode code="RWD-ABC123" variant="compact" />
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-1">Full (dengan QR)</div>
        <PickupCode code="RWD-ABC123" variant="full" />
      </div>
    </div>
  ),
};
