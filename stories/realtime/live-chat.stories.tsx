/**
 * Storybook stories untuk LiveChatView.
 *
 * Menampilkan state WebSocket chat:
 * - Connected (online users, messages)
 * - Connecting
 * - Disconnected (offline indicator)
 * - With typing indicator
 */

import type { Meta, StoryObj } from "@storybook/react";
import { LiveChatView } from "../../src/components/app/realtime/live-chat-view";

const meta: Meta<typeof LiveChatView> = {
  title: "Realtime/LiveChatView",
  component: LiveChatView,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Real-time chat view menggunakan WebSocket. Features: bidirectional messaging, typing indicators, online presence, auto-reconnect.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "600px", maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LiveChatView>;

export const Default: Story = {
  args: {
    title: "Chat Real-time Perpustakaan",
    channel: "global",
  },
};

export const DirectMessage: Story = {
  args: {
    title: "Tanya Pustakawan",
    targetUserId: "librarian-1",
    channel: "user:librarian-1",
  },
};

export const ClassChat: Story = {
  args: {
    title: "Chat Kelas XII-A",
    channel: "room:class-12a",
  },
};

export const Connecting: Story = {
  args: {
    title: "Menyambungkan...",
    channel: "global",
  },
  parameters: {
    docs: {
      description: {
        story: "State saat WebSocket sedang menyambungkan. Akan auto-retry dengan exponential backoff.",
      },
    },
  },
};
