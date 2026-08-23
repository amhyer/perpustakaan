"use client";

/**
 * Sidebar — Redesigned dengan grouping, search, dan personalization.
 *
 * Sprint G1 — Sidebar UX Redesign (Phase A-C).
 * Sprint G2 — Smart Search (Phase C) — Recent items integration.
 *
 * Improvements:
 * - 6 logical groups (instead of flat 24 items)
 * - Search/filter bar di atas (Sprint G2: now shows recent items)
 * - "Aksi Cepat" section (favorites + recent)
 * - Role-based filtering
 * - Badge counts untuk pending items (notifications, claims, dll)
 * - Collapsible groups (default: expanded)
 * - Smooth animations
 *
 * Grouping (pustakawan):
 * 1. 🏠 Beranda — Dashboard utama
 * 2. 📚 Koleksi — Katalog, Eksemplar, Stock opname, dll
 * 3. 👥 Keanggotaan — Members, Visitors, Rooms
 * 4. 🔄 Sirkulasi — Loans, Circulation, Fines, Reservations
 * 5. 💬 Komunikasi — Announcements, Notifications, WhatsApp log
 * 6. 📊 Laporan — Reports, Analytics, Blockchain
 * 7. ⚙️ Sistem — Settings, API keys, Integrations, RFID
 * 8. 🛡️ Audit — Audit log, Sessions, Errors
 */

import { useState, useMemo, useEffect } from "react";
import {
  Home,
  BookOpen,
  Users,
  ScanLine,
  Megaphone,
  BarChart3,
  Settings,
  Shield,
  Search,
  ChevronDown,
  Bell,
  CreditCard,
  History,
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  Banknote,
  BookMarked,
  Building2,
  UserCheck,
  Package,
  BookPlus,
  ScrollText,
  ArrowRightLeft,
  FileBarChart,
  FileText,
  Printer,
  Tag,
  Key,
  Radio,
  Link2,
  BookHeart,
  Library,
  BookmarkCheck,
  User,
  Star,
  Clock,
  X,
  Download,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";
import { cn } from "@/lib/utils";
import { useAppStore, type ViewKey, resolveDefaultDashboard } from "@/store/use-app-store";
import { ROLE_LABELS } from "@/lib/constants";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ElementType;
  badge?: number | "soon";
  favorite?: boolean;
  keywords?: string[]; // untuk search
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
  badge?: number;
  roles?: ("LIBRARIAN" | "PUSTAKAWAN_JUNIOR" | "TEACHER" | "STUDENT")[];
}

const NAV_GROUPS: NavGroup[] = [
  // ===== Beranda =====
  {
    id: "home",
    label: "Beranda",
    icon: Home,
    defaultOpen: true,
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        favorite: true,
        keywords: ["beranda", "home", "utama", "ringkasan"],
      },
      {
        key: "executive-dashboard",
        label: "Dashboard Eksekutif",
        icon: Sparkles,
        keywords: ["eksekutif", "executive", "kepsek", "kepala sekolah"],
      },
    ],
  },

  // ===== Koleksi (Katalog & Inventaris) =====
  {
    id: "koleksi",
    label: "Koleksi Buku",
    icon: BookOpen,
    defaultOpen: true,
    items: [
      {
        key: "catalog",
        label: "Katalog",
        icon: BookOpen,
        favorite: true,
        keywords: ["katalog", "catalog", "buku", "cari", "search"],
      },
      {
        key: "barcode-labels",
        label: "Cetak Label",
        icon: Tag,
        keywords: ["barcode", "label", "cetak", "print"],
      },
      {
        key: "batch-cards",
        label: "Cetak Kartu Massal",
        icon: Printer,
        keywords: ["cetak kartu", "kartu anggota"],
      },
      {
        key: "stocktaking",
        label: "Stock Opname",
        icon: ClipboardList,
        keywords: ["stock opname", "inventaris", "audit buku"],
      },
      {
        key: "book-transfer",
        label: "Pemindahan Rak",
        icon: ArrowRightLeft,
        keywords: ["pindah", "transfer", "rak"],
      },
    ],
  },

  // ===== Keanggotaan =====
  {
    id: "keanggotaan",
    label: "Keanggotaan",
    icon: Users,
    defaultOpen: false,
    items: [
      {
        key: "members",
        label: "Anggota",
        icon: Users,
        favorite: true,
        keywords: ["anggota", "member", "siswa", "guru", "member"],
      },
      {
        key: "visitors",
        label: "Buku Tamu",
        icon: UserCheck,
        keywords: ["tamu", "visitor", "kunjungan"],
      },
      {
        key: "rooms",
        label: "Booking Ruangan",
        icon: Building2,
        keywords: ["ruangan", "room", "booking", "reservasi ruang"],
      },
      {
        key: "proposals",
        label: "Usulan Buku",
        icon: BookPlus,
        badge: 0, // dynamic
        keywords: ["usulan", "proposal", "request buku"],
      },
    ],
  },

  // ===== Sirkulasi (Peminjaman) =====
  {
    id: "sirkulasi",
    label: "Sirkulasi",
    icon: ScanLine,
    defaultOpen: true,
    items: [
      {
        key: "circulation",
        label: "Sirkulasi",
        icon: ScanLine,
        favorite: true,
        keywords: ["sirkulasi", "pinjam", "kembali", "circulation"],
      },
      {
        key: "loans",
        label: "Peminjaman",
        icon: ClipboardList,
        keywords: ["peminjaman", "loan", "aktif"],
      },
      {
        key: "reservations",
        label: "Reservasi Buku",
        icon: BookMarked,
        keywords: ["reservasi", "booking buku"],
      },
      {
        key: "reservations-queue",
        label: "Antrian Reservasi",
        icon: Users,
        keywords: ["antrian", "queue", "reservasi"],
      },
      {
        key: "fines",
        label: "Denda",
        icon: Banknote,
        keywords: ["denda", "fine", "denda keterlambatan"],
      },
    ],
  },

  // ===== Hadiah (Reward System) =====
  {
    id: "hadiah",
    label: "Hadiah & Poin",
    icon: Sparkles,
    defaultOpen: false,
    items: [
      {
        key: "rewards-catalog",
        label: "Katalog Hadiah",
        icon: Sparkles,
        keywords: ["hadiah", "reward", "katalog", "tukar poin"],
      },
      {
        key: "rewards-management",
        label: "Manajemen Hadiah",
        icon: Package,
        keywords: ["manajemen hadiah", "kelola reward", "approval"],
      },
    ],
  },

  // ===== Komunikasi =====
  {
    id: "komunikasi",
    label: "Komunikasi",
    icon: Megaphone,
    defaultOpen: false,
    items: [
      {
        key: "announcements",
        label: "Pengumuman",
        icon: Megaphone,
        keywords: ["pengumuman", "announcement", "info"],
      },
      {
        key: "notification-log",
        label: "Log Notifikasi",
        icon: Bell,
        badge: 0,
        keywords: ["notifikasi", "notification", "log"],
      },
    ],
  },

  // ===== IoT & Integrasi =====
  {
    id: "iot",
    label: "IoT & Integrasi",
    icon: Radio,
    defaultOpen: false,
    roles: ["LIBRARIAN", "PUSTAKAWAN_JUNIOR"],
    items: [
      {
        key: "rfid-dashboard",
        label: "RFID Dashboard",
        icon: Radio,
        badge: "soon",
        keywords: ["rfid", "iot", "hardware", "reader"],
      },
      {
        key: "rfid-simulator",
        label: "RFID Simulator",
        icon: Radio,
        badge: "soon",
        keywords: ["rfid", "simulator", "test"],
      },
      {
        key: "api-keys",
        label: "API Keys",
        icon: Key,
        keywords: ["api", "integration", "kunci"],
      },
    ],
  },

  // ===== Laporan & Analytics =====
  {
    id: "laporan",
    label: "Laporan & Analytics",
    icon: BarChart3,
    defaultOpen: false,
    items: [
      {
        key: "reports",
        label: "Laporan",
        icon: FileBarChart,
        keywords: ["laporan", "report", "statistik"],
      },
      {
        key: "report-builder",
        label: "Report Builder",
        icon: FileText,
        keywords: ["report builder", "custom report"],
      },
      {
        key: "blockchain-explorer",
        label: "Blockchain Audit",
        icon: Link2,
        badge: "soon",
        keywords: ["blockchain", "audit", "immutable"],
      },
    ],
  },

  // ===== Sistem & Audit =====
  {
    id: "sistem",
    label: "Sistem",
    icon: Settings,
    defaultOpen: false,
    roles: ["LIBRARIAN"], // Hanya pustakawan penuh
    items: [
      {
        key: "assets",
        label: "Aset",
        icon: Package,
        keywords: ["aset", "asset", "inventaris non-buku"],
      },
      {
        key: "settings",
        label: "Pengaturan",
        icon: Settings,
        keywords: ["pengaturan", "setting", "konfigurasi"],
      },
      {
        key: "audit-log",
        label: "Jejak Audit",
        icon: ScrollText,
        keywords: ["audit", "log", "riwayat aktivitas"],
      },
      {
        key: "data-export",
        label: "Export Data",
        icon: Download,
        keywords: ["export", "csv", "download", "unduh"],
      },
    ],
  },
];

// ===== Member (Siswa/Guru) Navigation =====
const MEMBER_NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Beranda",
    icon: Home,
    defaultOpen: true,
    items: [
      {
        key: "my-dashboard",
        label: "Beranda Saya",
        icon: Home,
        favorite: true,
        keywords: ["beranda", "home", "dashboard"],
      },
    ],
  },
  {
    id: "koleksi",
    label: "Koleksi",
    icon: BookOpen,
    defaultOpen: true,
    items: [
      {
        key: "catalog",
        label: "Cari Buku",
        icon: BookOpen,
        favorite: true,
        keywords: ["katalog", "cari", "search buku"],
      },
      {
        key: "reading-history",
        label: "Riwayat Baca",
        icon: History,
        keywords: ["riwayat", "history", "bacaan"],
      },
      {
        key: "wishlist",
        label: "Wishlist",
        icon: BookHeart,
        keywords: ["wishlist", "favorit", "bookmark"],
      },
    ],
  },
  {
    id: "pinjaman",
    label: "Peminjaman",
    icon: ClipboardList,
    defaultOpen: true,
    items: [
      {
        key: "my-loans",
        label: "Pinjamanku",
        icon: ClipboardList,
        favorite: true,
        keywords: ["pinjaman", "loan", "dipinjam"],
      },
      {
        key: "my-card",
        label: "Kartu Anggota",
        icon: CreditCard,
        keywords: ["kartu", "card", "anggota"],
      },
    ],
  },
  {
    id: "hadiah",
    label: "Hadiah",
    icon: Sparkles,
    defaultOpen: false,
    items: [
      {
        key: "rewards-catalog",
        label: "Katalog Hadiah",
        icon: Sparkles,
        keywords: ["hadiah", "reward", "tukar poin"],
      },
      {
        key: "my-redemptions",
        label: "Klaim Saya",
        icon: Package,
        keywords: ["klaim", "redemption", "hadiah saya"],
      },
    ],
  },
  {
    id: "komunikasi",
    label: "Komunikasi",
    icon: Megaphone,
    defaultOpen: false,
    items: [
      {
        key: "announcements",
        label: "Pengumuman",
        icon: Megaphone,
        keywords: ["pengumuman", "info"],
      },
      {
        key: "notifications",
        label: "Notifikasi",
        icon: Bell,
        badge: 0,
        keywords: ["notifikasi"],
      },
    ],
  },
  {
    id: "ruangan",
    label: "Layanan",
    icon: Building2,
    defaultOpen: false,
    items: [
      {
        key: "rooms",
        label: "Booking Ruangan",
        icon: Building2,
        keywords: ["ruangan", "booking"],
      },
      {
        key: "proposals",
        label: "Ajukan Buku",
        icon: BookPlus,
        keywords: ["usulan", "ajukan buku"],
      },
    ],
  },
  {
    id: "akun",
    label: "Akun",
    icon: User,
    defaultOpen: false,
    items: [
      {
        key: "my-profile",
        label: "Profil Saya",
        icon: User,
        favorite: true,
        keywords: ["profil", "profile", "akun"],
      },
      {
        key: "my-sessions",
        label: "Sesi Aktif",
        icon: Shield,
        keywords: ["sesi", "session", "login"],
      },
    ],
  },
];

export function Sidebar() {
  const {
    user,
    view,
    setView,
    sidebarOpen,
    setSidebarOpen,
    recentItems,
  } = useAppStore();
  const isLibrarianRole = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Default: all groups with defaultOpen=true are open
    const initial: Record<string, boolean> = {};
    [...NAV_GROUPS, ...MEMBER_NAV_GROUPS].forEach((g) => {
      initial[g.id] = g.defaultOpen ?? false;
    });
    return initial;
  });

  // Persist open groups in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-open-groups");
      if (stored) {
        setOpenGroups(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const persistOpenGroups = (next: Record<string, boolean>) => {
    setOpenGroups(next);
    try {
      localStorage.setItem("sidebar-open-groups", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const toggleGroup = (id: string) => {
    const next: Record<string, boolean> = {};
    for (const key of Object.keys(openGroups)) {
      next[key] = false;
    }
    next[id] = !openGroups[id];
    persistOpenGroups(next);
  };

  function goToHome() {
    if (!user) return;
    setView(resolveDefaultDashboard(user));
  }

  // Choose nav groups based on role
  const allGroups = isLibrarianRole ? NAV_GROUPS : MEMBER_NAV_GROUPS;

  // Filter by role permissions
  const visibleGroups = useMemo(() => {
    return allGroups
      .filter((g) => {
        if (!g.roles) return true; // No role restriction
        if (!user) return false;
        return g.roles.includes(user.role as any);
      })
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          // Pustakawan Junior tidak bisa akses beberapa menu
          if (user?.role === "PUSTAKAWAN_JUNIOR") {
            const restricted = ["settings", "executive-dashboard", "api-keys"];
            return !restricted.includes(item.key);
          }
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [allGroups, user]);

  // Filter by search query
  const searchedGroups = useMemo(() => {
    if (!search.trim()) return visibleGroups;
    const q = search.toLowerCase();
    return visibleGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          if (item.label.toLowerCase().includes(q)) return true;
          if (item.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
          return false;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [visibleGroups, search]);

  // Favorites — collect all favorite items from visible groups
  const favoriteItems = useMemo(() => {
    return visibleGroups
      .flatMap((g) => g.items)
      .filter((item) => item.favorite);
  }, [visibleGroups]);

  // Recent items — find matching nav items from visible groups (Sprint G2 Phase C)
  const recentNavItems = useMemo(() => {
    if (!recentItems.length) return [];
    const allItems = visibleGroups.flatMap((g) =>
      g.items.map((item) => ({ ...item, groupLabel: g.label }))
    );
    const seen = new Set<string>();
    const result: Array<{ key: ViewKey; params: Record<string, string>; label: string; groupLabel: string; icon: React.ElementType; visitedAt: number }> = [];
    for (const r of recentItems) {
      // Match by key (and try to find exact match in visible items)
      const match = allItems.find((item) => item.key === r.key);
      const dedupKey = `${r.key}-${JSON.stringify(r.params)}`;
      if (match && !seen.has(dedupKey)) {
        seen.add(dedupKey);
        result.push({
          key: match.key,
          params: r.params,
          label: r.label || match.label,
          groupLabel: match.groupLabel,
          icon: match.icon,
          visitedAt: r.visitedAt,
        });
      }
      if (result.length >= 5) break; // max 5 recent in sidebar
    }
    return result;
  }, [recentItems, visibleGroups]);

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "baru";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}j`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}h`;
    return `${Math.floor(days / 7)}mgu`;
  };

  const activeKey = view.key;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 z-40 h-screen w-72 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header with Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <button onClick={goToHome} className="flex items-center w-full">
            <Logo variant="light" />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="mx-3 mt-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-[11px] text-sidebar-foreground/70 flex items-center gap-1">
                  {isLibrarianRole ? (
                    <Library className="h-3 w-3" />
                  ) : user.role === "TEACHER" ? (
                    <BookMarked className="h-3 w-3" />
                  ) : (
                    <BookmarkCheck className="h-3 w-3" />
                  )}
                  {ROLE_LABELS[user.role]}
                  {user.member?.classGrade ? ` · ${user.member.classGrade}` : ""}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/50 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu..."
              className="h-8 pl-9 pr-16 text-xs bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
              onFocus={() => {
                // Hint: pressing Cmd+K opens full command palette
              }}
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-sidebar-foreground/50 hover:text-sidebar-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center rounded border border-sidebar-border bg-sidebar-accent/30 px-1 font-mono text-[9px] text-sidebar-foreground/60">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
          {/* Favorites section (only if no search) */}
          {!search.trim() && favoriteItems.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 flex items-center gap-1.5">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60">
                  Favorit
                </span>
              </div>
              <div className="space-y-0.5">
                {favoriteItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeKey === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setView(item.key);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-all",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "" : "text-sidebar-foreground/60")} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="my-2 mx-3 border-t border-sidebar-border/50" />
            </div>
          )}

          {/* Recent items section (Sprint G2 Phase C) - shown when no search */}
          {!search.trim() && recentNavItems.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-sidebar-foreground/60" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60">
                  Terkini
                </span>
              </div>
              <div className="space-y-0.5">
                {recentNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeKey === item.key;
                  return (
                    <button
                      key={`recent-${item.key}-${item.visitedAt}`}
                      onClick={() => {
                        setView(item.key, item.params);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all group",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      title={`${item.groupLabel} · ${formatRelativeTime(item.visitedAt)} lalu`}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "" : "text-sidebar-foreground/60")} />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      <span className="text-[10px] text-sidebar-foreground/50 shrink-0">
                        {formatRelativeTime(item.visitedAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="my-2 mx-3 border-t border-sidebar-border/50" />
            </div>
          )}

          {/* Grouped nav */}
          {searchedGroups.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-sidebar-foreground/50">
              <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Tidak ada menu cocok
              <div className="text-[10px] mt-1">Coba kata kunci lain</div>
            </div>
          ) : (
            searchedGroups.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = openGroups[group.id] ?? group.defaultOpen ?? false;
              return (
                <div key={group.id} className="mb-1">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                  >
                    <span className="flex-1 text-left">{group.label}</span>
                    {group.badge !== undefined && group.badge > 0 && (
                      <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[9px]">
                        {group.badge}
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Group items */}
                  {isOpen && (
                    <div className="space-y-0.5 mt-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = activeKey === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              setView(item.key);
                              setSidebarOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all ml-1",
                              active
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                active ? "" : "text-sidebar-foreground/60"
                              )}
                            />
                            <span className="truncate flex-1 text-left">
                              {item.label}
                            </span>
                            {item.badge === "soon" && (
                              <Badge
                                variant="outline"
                                className="h-4 px-1 text-[8px] font-bold uppercase bg-amber-500/10 text-amber-300 border-amber-500/30"
                              >
                                Soon
                              </Badge>
                            )}
                            {typeof item.badge === "number" && item.badge > 0 && (
                              <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[9px]">
                                {item.badge}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-sidebar-border">
          <div className="text-[10px] text-sidebar-foreground/50 text-center flex items-center justify-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            v1.0 · Jendela Ilmu
          </div>
        </div>
      </aside>
    </>
  );
}
