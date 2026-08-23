/**
 * Storybook stories untuk RoleBadge.
 *
 * Menampilkan semua variant role + state interaktif.
 * Install Storybook dulu: bunx storybook@latest init --type nextjs
 */

import type { Meta, StoryObj } from "@storybook/react";
import { RoleBadge } from "../src/components/app/shared/role-badge";
import type { CurrentUser } from "../src/lib/api-client";

const makeUser = (role: CurrentUser["role"]): CurrentUser => ({
  id: "u1",
  email: "test@example.com",
  name: "Test User",
  role,
  member: null,
  defaultDashboard: "default",
});

const meta: Meta<typeof RoleBadge> = {
  title: "Shared/RoleBadge",
  component: RoleBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Badge indikator 'Tipe Akun' yang ditampilkan di header dashboard. Membedakan role user dengan warna dan icon yang berbeda. Ada role='status' dan aria-label untuk screen reader.",
      },
    },
  },
  argTypes: {
    showIcon: {
      control: "boolean",
      description: "Tampilkan icon di samping label",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RoleBadge>;

export const Librarian: Story = {
  args: {
    user: makeUser("LIBRARIAN"),
  },
};

export const JuniorLibrarian: Story = {
  args: {
    user: makeUser("PUSTAKAWAN_JUNIOR"),
  },
};

export const Teacher: Story = {
  args: {
    user: makeUser("TEACHER"),
  },
};

export const Student: Story = {
  args: {
    user: makeUser("STUDENT"),
  },
};

export const NoUser: Story = {
  args: {
    user: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Component return null jika user null — tidak render apa-apa. Dipakai untuk conditional render di tempat yang butuh user (mis. header dashboard).",
      },
    },
  },
};

export const WithoutIcon: Story = {
  args: {
    user: makeUser("LIBRARIAN"),
    showIcon: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Beberapa tempat (mis. welcome banner dengan background dark) butuh badge tanpa icon agar tidak visual crowded. Pakai `showIcon={false}`.",
      },
    },
  },
};

export const WithCustomClass: Story = {
  args: {
    user: makeUser("LIBRARIAN"),
    className: "bg-white/20 text-white border-white/30",
  },
  parameters: {
    docs: {
      description: {
        story:
          "ClassName override untuk context dark (welcome banner). Background semi-transparent + text putih agar kontras dengan gradient background.",
      },
    },
  },
};

/** Display semua role side-by-side untuk perbandingan visual. */
export const AllRoles: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <RoleBadge user={makeUser("LIBRARIAN")} />
      <RoleBadge user={makeUser("PUSTAKAWAN_JUNIOR")} />
      <RoleBadge user={makeUser("TEACHER")} />
      <RoleBadge user={makeUser("STUDENT")} />
    </div>
  ),
};
