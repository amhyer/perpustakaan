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
  | "data-export"
  // Reward System
  | "rewards-catalog"
  | "my-redemptions"
  | "rewards-management"
  // IoT RFID
  | "rfid-dashboard"
  | "rfid-simulator"
  // Blockchain Audit
  | "blockchain-explorer"
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
  | "ebook-reader"
  // New features
  | "reading-assignments"
  | "marketplace"
  | "curriculum-recommendations"
  | "card-queue"
  | "executive-stats-widget"
  | "whatsapp-overdue"
  | "attendance"
  // Book of the Week
  | "book-of-the-week"
  // Reading Challenge
  | "reading-challenges"
  // Inter-Library Loan
  | "inter-library";

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

export interface RecentItem {
  key: ViewKey;
  params: Record<string, string>;
  visitedAt: number; // timestamp
  /** Display label (cached for fast list) */
  label?: string;
  /** Group label for section header */
  group?: string;
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

  // Sprint G2 — Recent items (auto-tracked)
  recentItems: RecentItem[];
  /** Add current view to recent items */
  trackRecent: (item: Omit<RecentItem, "visitedAt">) => void;
  /** Clear all recent items */
  clearRecent: () => void;

  // Sprint G2 — Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
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
    set((state) => {
      // Auto-track this view as recent (Sprint G2)
      // Skip tracking untuk view "default" atau special keys
      const skipTracking = ["kiosk"];
      if (typeof window !== "undefined" && !skipTracking.includes(key)) {
        // Defer to allow state update
        queueMicrotask(() => {
          state.trackRecent({ key, params });
        });
      }
      return {
        view: {
          key,
          params,
          // Pertahankan variant yang sudah ada di store, kecuali params override
          dashboardVariant:
            (params.variant as "student" | "teacher" | undefined) ??
            state.view.dashboardVariant,
        },
      };
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),

  // Sprint G2 — Recent items (load from localStorage on init, save on update)
  recentItems: (() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("ji-recent-items");
      if (stored) {
        const parsed = JSON.parse(stored) as RecentItem[];
        // Only keep items from last 7 days
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return parsed.filter((item) => item.visitedAt > weekAgo);
      }
    } catch {
      // ignore
    }
    return [];
  })(),
  trackRecent: (item) => {
    set((state) => {
      const MAX_RECENT = 8;
      const now = Date.now();
      // Remove duplicate (same key+params)
      const filtered = state.recentItems.filter(
        (r) => !(r.key === item.key && JSON.stringify(r.params) === JSON.stringify(item.params))
      );
      // Add new at front, cap to MAX_RECENT
      const next = [{ ...item, visitedAt: now }, ...filtered].slice(0, MAX_RECENT);
      // Persist to localStorage
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("ji-recent-items", JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      return { recentItems: next };
    });
  },
  clearRecent: () => {
    set({ recentItems: [] });
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ji-recent-items");
      }
    } catch {
      // ignore
    }
  },

  // Sprint G2 — Command palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
}));
