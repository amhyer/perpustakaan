/**
 * Storybook stories untuk RoleEmptyState.
 *
 * Menampilkan 16 context × multi-role — semua empty state yang berbeda per role.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { RoleEmptyState, type EmptyStateContext, type UserRole } from "../src/components/app/shared/role-empty-state";

const meta: Meta<typeof RoleEmptyState> = {
  title: "Shared/RoleEmptyState",
  component: RoleEmptyState,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Role-specific empty state generator. Konten berbeda per role agar user langsung tahu harus mulai dari mana. 16 context × 4 role = banyak varian.",
      },
    },
  },
  argTypes: {
    context: {
      control: "select",
      options: [
        "no-active-loans",
        "no-recommendations",
        "no-wishlist",
        "no-proposals",
        "no-announcements",
        "no-overdue",
        "no-classmates",
      ] as EmptyStateContext[],
    },
    userRole: {
      control: "select",
      options: ["LIBRARIAN", "PUSTAKAWAN_JUNIOR", "TEACHER", "STUDENT"] as UserRole[],
    },
  },
};

export default meta;
type Story = StoryObj<typeof RoleEmptyState>;

export const StudentNoLoans: Story = {
  args: {
    context: "no-active-loans",
    userRole: "STUDENT",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Siswa dengan 0 pinjaman. Tone: encouraging, dengan CTA 'Cari Buku' untuk navigasi ke katalog.",
      },
    },
  },
};

export const TeacherNoProposals: Story = {
  args: {
    context: "no-proposals",
    userRole: "TEACHER",
  },
};

export const LibrarianNoMembers: Story = {
  args: {
    context: "no-members",
    userRole: "LIBRARIAN",
  },
};

export const LibrarianNoOverdue: Story = {
  args: {
    context: "no-overdue",
    userRole: "LIBRARIAN",
  },
};

export const Compact: Story = {
  args: {
    context: "no-active-loans",
    userRole: "STUDENT",
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Compact mode untuk inline use di dalam Card/list — tidak ada Card wrapper sendiri. Dipakai di TopBooksList, TopMembersList, dll.",
      },
    },
  },
};

/** Compare semua role untuk context yang sama. */
export const CompareRoles: Story = {
  args: {
    context: "no-active-loans",
    userRole: "STUDENT",
  },
  render: (args) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <h4 className="text-sm font-medium mb-2 text-emerald-600">LIBRARIAN</h4>
        <RoleEmptyState {...args} userRole="LIBRARIAN" />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-amber-600">TEACHER</h4>
        <RoleEmptyState {...args} userRole="TEACHER" />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-sky-600">STUDENT</h4>
        <RoleEmptyState {...args} userRole="STUDENT" />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-zinc-500">PUSTAKAWAN_JUNIOR</h4>
        <RoleEmptyState {...args} userRole="PUSTAKAWAN_JUNIOR" />
      </div>
    </div>
  ),
};
