"use client";

import { create } from "zustand";
import type { CurrentUser } from "@/lib/api-client";

export type ViewKey =
  // Librarian
  | "dashboard"
  | "executive-dashboard"
  | "rooms"
  | "visitors"
  | "assets"
  | "api-keys"
  | "my-sessions"
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
  | "report-builder"
  | "settings"
  | "batch-cards"
  | "barcode-labels"
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
  | "search-results"
  // E-book reader
  | "ebook-reader";

/**
 * Resolve default dashboard berdasar role + preferensi user.
 *
 * Dipakai oleh:
 * - setUser() — saat user login atau refresh preferensi
 * - Sidebar goToHome() — saat user klik logo
 *
 * Logika:
 * 1. Jika defaultDashboard = 'default' (atau tidak ada) → auto-route
 *    (LIBRARIAN → dashboard, TEACHER/STUDENT → my-dashboard)
 * 2. Jika explicit (mis. 'executive-dashboard') → pakai itu, tapi validasi role
 * 3. Fallback ke my-dashboard jika role tidak boleh akses
 *
 * Export sebagai helper untuk dipakai di tempat lain (sidebar, dll)
 * yang butuh logika sama tanpa harus setup store.
 */
export function resolveDefaultDashboard(
  user: CurrentUser | null
): ViewKey {
  if (!user) return "dashboard";

  const isLibrarian =
    user.role === "LIBRARIAN" || user.role === "PUSTAKAWAN_JUNIOR";

  // Default auto-route
  if (!user.defaultDashboard || user.defaultDashboard === "default") {
    return isLibrarian ? "dashboard" : "my-dashboard";
  }

  const preferred = user.defaultDashboard as ViewKey;

  // Validasi role: TEACHER/STUDENT hanya boleh 'my-dashboard'.
  // Dashboard eksekutif/customizable/standard khusus untuk pustakawan.
  if (!isLibrarian && preferred !== "my-dashboard") {
    return "my-dashboard";
  }

  return preferred;
}

interface ViewState {
  key: ViewKey;
  params: Record<string, string>;
  /** Variant untuk MyDashboardView: "student" | "teacher". Disimpan di store
   *  agar tidak hilang saat navigasi via setView("my-dashboard") tanpa args. */
  dashboardVariant: "student" | "teacher";
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
        // Sprint 4 — Fix #9: hormati preferensi defaultDashboard user
        key: resolveDefaultDashboard(u),
        params: {},
        // Tentukan variant berdasarkan role — hindari default student saat guru navigasi
        dashboardVariant: u?.role === "TEACHER" ? "teacher" : "student",
      },
    }),

  view: { key: "dashboard", params: {}, dashboardVariant: "student" },
  setView: (key, params = {}) => {
    set((state) => ({
      view: {
        key,
        params,
        // Pertahankan variant yang sudah ada di store, kecuali params override
        dashboardVariant:
          (params.variant as "student" | "teacher" | undefined) ??
          state.view.dashboardVariant,
      },
    }));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
