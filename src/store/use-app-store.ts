"use client";

import { create } from "zustand";
import type { CurrentUser } from "@/lib/api-client";

export type ViewKey =
  // Librarian
  | "dashboard"
  | "executive-dashboard"
  | "catalog"
  | "book-detail"
  | "book-form"
  | "members"
  | "member-detail"
  | "circulation"
  | "loans"
  | "reservations"
  | "reservations-queue"
  | "proposals"
  | "announcements"
  | "reports"
  | "settings"
  | "batch-cards"
  | "stocktaking"
  | "fines"
  | "notification-log"
  | "audit-log"
  | "book-transfer"
  | "kiosk"
  // Member (teacher/student)
  | "my-dashboard"
  | "my-loans"
  | "my-card"
  | "my-profile"
  | "reading-history"
  | "wishlist"
  | "notifications"
  | "search-results";

interface ViewState {
  key: ViewKey;
  params: Record<string, string>;
}

interface AppStore {
  user: CurrentUser | null;
  setUser: (u: CurrentUser | null) => void;

  view: ViewState;
  setView: (key: ViewKey, params?: Record<string, string>) => void;

  // mobile sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // refresh trigger for data refetch
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  setUser: (u) =>
    set({
      user: u,
      view: {
        key:
          u?.role === "LIBRARIAN" || u?.role === "PUSTAKAWAN_JUNIOR"
            ? "dashboard"
            : "my-dashboard",
        params: {},
      },
    }),

  view: { key: "dashboard", params: {} },
  setView: (key, params = {}) => {
    set({ view: { key, params } });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
