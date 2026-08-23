/**
 * Storybook stories untuk SetAsHomeButton.
 *
 * Menampilkan state default (tombol "Set as Home") dan state aktif
 * (tombol disabled dengan checkmark "Beranda Aktif").
 */

import type { Meta, StoryObj } from "@storybook/react";
import { SetAsHomeButton } from "../src/components/app/shared/set-as-home-button";
import { useAppStore } from "../src/store/use-app-store";
import type { CurrentUser } from "../src/lib/api-client";

// Helper: set user di store
function withUser(user: CurrentUser | null) {
  if (user) useAppStore.getState().setUser(user);
  else useAppStore.getState().setUser(null);
}

const librarian: CurrentUser = {
  id: "u1",
  email: "test@example.com",
  name: "Budi Santoso",
  role: "LIBRARIAN",
  member: null,
  defaultDashboard: "default",
};

const meta: Meta<typeof SetAsHomeButton> = {
  title: "Shared/SetAsHomeButton",
  component: SetAsHomeButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Tombol inline untuk menjadikan dashboard saat ini sebagai default. Tersembunyi otomatis saat dashboard ini sudah jadi default. API call ke /api/users/me/preferences.",
      },
    },
  },
  decorators: [
    (Story) => {
      withUser(librarian);
      return <Story />;
    },
  ],
  argTypes: {
    viewKey: {
      control: "select",
      options: ["dashboard", "customizable-dashboard", "executive-dashboard", "my-dashboard"],
      description: "View key yang akan di-set sebagai default",
    },
    label: {
      control: "text",
      description: "Label untuk toast confirmation",
    },
    variant: {
      control: "select",
      options: ["default", "outline", "ghost"],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof SetAsHomeButton>;

export const Default: Story = {
  args: {
    viewKey: "customizable-dashboard",
    label: "Dashboard Kustom",
    variant: "outline",
    size: "sm",
  },
};

export const Active: Story = {
  args: {
    viewKey: "customizable-dashboard",
    label: "Dashboard Kustom",
  },
  decorators: [
    (Story) => {
      // Set user dengan defaultDashboard sama dengan viewKey → active state
      withUser({ ...librarian, defaultDashboard: "customizable-dashboard" });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Saat dashboard ini sudah menjadi default user, tombol berubah jadi disabled dengan icon checkmark + label 'Beranda Aktif'. aria-label menjelaskan status.",
      },
    },
  },
};

export const OnDarkBackground: Story = {
  args: {
    viewKey: "dashboard",
    label: "Dashboard Standar",
    variant: "ghost",
    size: "sm",
  },
  decorators: [
    (Story) => {
      withUser(librarian);
      return (
        <div
          style={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a3d 60%, #3b5b8c 100%)",
            padding: "1rem",
            borderRadius: "8px",
          }}
        >
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Untuk welcome banner dengan gradient background. Pakai variant='ghost' + custom className semi-transparent.",
      },
    },
  },
};

export const AllStates: Story = {
  render: () => {
    withUser(librarian);
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Default state:</p>
          <SetAsHomeButton viewKey="customizable-dashboard" label="Dashboard Kustom" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Active state (user.defaultDashboard = customizable-dashboard):</p>
          <SetAsHomeButton viewKey="customizable-dashboard" label="Dashboard Kustom" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">No user:</p>
          <SetAsHomeButton viewKey="my-dashboard" />
        </div>
      </div>
    );
  },
  decorators: [
    (Story) => {
      // Mix: dengan user (default) + dengan user (active) + tanpa user
      return <Story />;
    },
  ],
};
