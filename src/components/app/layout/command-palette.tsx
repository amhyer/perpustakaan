"use client";

/**
 * Command Palette (Cmd+K) — Power user navigation.
 *
 * Sprint G2 - Power User Features.
 * Sprint L-Phase 3 - Search history integration.
 *
 * Features:
 * - Open with Cmd+K (Mac) or Ctrl+K (Windows)
 * - Fuzzy search across ALL menu items, recent items, and actions
 * - Search history tracking (per-user, persistent)
 * - Search suggestions as you type
 * - Clear individual searches or full history
 * - Keyboard navigation (↑↓ to move, Enter to select, Esc to close)
 * - Grouped results (Recent, Recent Searches, All Menus)
 * - Highlighted matching text
 * - Action shortcuts (e.g. "logout", "switch theme")
 * - Visual icons + role badges
 *
 * Architecture:
 * - Uses existing Dialog primitive
 * - Powered by useAppStore (state)
 * - Reuses NavItem metadata from sidebar
 * - Tracks recent items via store.trackRecent
 * - Tracks search history via search-history library
 *
 * Untuk navigasi cepat tanpa pakai mouse — perfect untuk power user.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Command,
  Search,
  Clock,
  Star,
  ArrowRight,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  LogOut,
  Settings as SettingsIcon,
  Home,
  RefreshCw,
  Sparkles,
  X,
  History,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/overlay/dialog";
import { Badge } from "@/components/ui/data-display/badge";
import { cn } from "@/lib/utils";
import { useAppStore, type ViewKey, type RecentItem } from "@/store/use-app-store";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import {
  getSearchHistory,
  trackSearch,
  clearSearchHistory,
  deleteSearchEntry,
  getSearchSuggestions,
  type SearchEntry,
} from "@/lib/search-history";

// ===== Types =====

interface CommandItem {
  /** Unique key for this item */
  id: string;
  /** Display label */
  label: string;
  /** Group name for section header */
  group: string;
  /** Lucide icon component */
  icon: React.ElementType;
  /** Action to perform */
  action: () => void;
  /** Optional keywords for search */
  keywords?: string[];
  /** Optional badge */
  badge?: string | number;
  /** Optional shortcut display */
  shortcut?: string;
  /** Whether this is a recent item */
  isRecent?: boolean;
  /** Whether this is a favorite */
  isFavorite?: boolean;
}

// ===== Fuzzy match =====

/**
 * Simple fuzzy match: case-insensitive substring match with bonus for
 * - exact match
 * - starts with
 * - word boundary match
 * Returns score (higher = better) or 0 if no match.
 */
function fuzzyScore(text: string, query: string): number {
  if (!query) return 1; // empty query matches all
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 50;
  if (t.includes(q)) return 25;
  // word boundary match
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return 30;
  }
  return 0;
}

// ===== Main Component =====

export function CommandPalette() {
  const {
    user,
    view,
    setView,
    commandPaletteOpen,
    setCommandPaletteOpen,
    toggleCommandPalette,
    recentItems,
    trackRecent,
    clearRecent,
    triggerRefresh,
  } = useAppStore();

  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchHistory, setSearchHistory] = useState<SearchEntry[]>([]);
  const [historyTick, setHistoryTick] = useState(0); // Force refresh
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";
  const userId = user?.id || "guest";

  // Load search history when palette opens or user changes
  useEffect(() => {
    if (commandPaletteOpen) {
      setSearchHistory(getSearchHistory(userId));
    }
  }, [commandPaletteOpen, userId, historyTick]);

  // Reset state when palette opens
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIdx(0);
      // Focus input shortly after open
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useKeyboardShortcut("k", () => toggleCommandPalette(), {
    meta: true,
    preventDefault: true,
  });

  // Esc to close
  useKeyboardShortcut("Escape", () => setCommandPaletteOpen(false), {
    preventDefault: true,
  });

  // Build menu items list (mirror of sidebar)
  const menuItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Beranda
    items.push({
      id: "dashboard",
      label: "Dashboard",
      group: "Beranda",
      icon: Home,
      action: () => setView("dashboard"),
      keywords: ["beranda", "home", "ringkasan"],
    });
    if (isLibrarian) {
      items.push({
        id: "executive-dashboard",
        label: "Dashboard Eksekutif",
        group: "Beranda",
        icon: Sparkles,
        action: () => setView("executive-dashboard"),
        keywords: ["executive", "kepsek"],
      });
    }

    // Koleksi
    items.push(
      { id: "catalog", label: "Katalog", group: "Koleksi", icon: Search, action: () => setView("catalog"), keywords: ["buku", "cari"] },
      { id: "barcode-labels", label: "Cetak Label", group: "Koleksi", icon: Sparkles, action: () => setView("barcode-labels") },
      { id: "stocktaking", label: "Stock Opname", group: "Koleksi", icon: RefreshCw, action: () => setView("stocktaking") },
      { id: "book-transfer", label: "Pemindahan Rak", group: "Koleksi", icon: ArrowRight, action: () => setView("book-transfer") }
    );
    if (isLibrarian) {
      items.push({ id: "batch-cards", label: "Cetak Kartu Massal", group: "Koleksi", icon: Sparkles, action: () => setView("batch-cards") });
    }

    // Keanggotaan
    if (isLibrarian) {
      items.push(
        { id: "members", label: "Anggota", group: "Keanggotaan", icon: Sparkles, action: () => setView("members"), keywords: ["siswa", "guru", "member"] },
        { id: "visitors", label: "Buku Tamu", group: "Keanggotaan", icon: Sparkles, action: () => setView("visitors") },
        { id: "rooms", label: "Booking Ruangan", group: "Keanggotaan", icon: Sparkles, action: () => setView("rooms") },
        { id: "proposals", label: "Usulan Buku", group: "Keanggotaan", icon: Sparkles, action: () => setView("proposals") }
      );
    } else {
      items.push(
        { id: "rooms", label: "Booking Ruangan", group: "Layanan", icon: Sparkles, action: () => setView("rooms") },
        { id: "proposals", label: "Ajukan Buku", group: "Layanan", icon: Sparkles, action: () => setView("proposals") }
      );
    }

    // Sirkulasi
    items.push(
      { id: "circulation", label: "Sirkulasi", group: "Sirkulasi", icon: RefreshCw, action: () => setView("circulation"), keywords: ["pinjam", "kembali"] },
      { id: "loans", label: "Peminjaman", group: "Sirkulasi", icon: Sparkles, action: () => setView("loans") },
      { id: "reservations", label: "Reservasi", group: "Sirkulasi", icon: Sparkles, action: () => setView("reservations") },
      { id: "fines", label: "Denda", group: "Sirkulasi", icon: Sparkles, action: () => setView("fines") }
    );

    // Hadiah
    if (isLibrarian) {
      items.push(
        { id: "rewards-catalog", label: "Katalog Hadiah", group: "Hadiah", icon: Sparkles, action: () => setView("rewards-catalog") },
        { id: "rewards-management", label: "Manajemen Hadiah", group: "Hadiah", icon: Sparkles, action: () => setView("rewards-management") }
      );
    } else {
      items.push(
        { id: "rewards-catalog", label: "Katalog Hadiah", group: "Hadiah", icon: Sparkles, action: () => setView("rewards-catalog") },
        { id: "my-redemptions", label: "Klaim Saya", group: "Hadiah", icon: Sparkles, action: () => setView("my-redemptions") }
      );
    }

    // Member-specific
    if (!isLibrarian) {
      items.push(
        { id: "my-dashboard", label: "Beranda Saya", group: "Beranda", icon: Home, action: () => setView("my-dashboard") },
        { id: "my-loans", label: "Pinjamanku", group: "Peminjaman", icon: Sparkles, action: () => setView("my-loans") },
        { id: "my-card", label: "Kartu Anggota", group: "Peminjaman", icon: Sparkles, action: () => setView("my-card") },
        { id: "wishlist", label: "Wishlist", group: "Koleksi", icon: Sparkles, action: () => setView("wishlist") },
        { id: "reading-history", label: "Riwayat Baca", group: "Koleksi", icon: Sparkles, action: () => setView("reading-history") },
        { id: "my-profile", label: "Profil Saya", group: "Akun", icon: Sparkles, action: () => setView("my-profile") }
      );
    }

    // IoT & Integrasi
    if (isLibrarian) {
      items.push(
        { id: "rfid-dashboard", label: "RFID Dashboard", group: "IoT", icon: Sparkles, action: () => setView("rfid-dashboard"), badge: "Soon" },
        { id: "rfid-simulator", label: "RFID Simulator", group: "IoT", icon: Sparkles, action: () => setView("rfid-simulator"), badge: "Soon" },
        { id: "api-keys", label: "API Keys", group: "IoT", icon: Sparkles, action: () => setView("api-keys") }
      );
    }

    // Laporan
    items.push(
      { id: "reports", label: "Laporan", group: "Laporan", icon: Sparkles, action: () => setView("reports") }
    );
    if (isLibrarian) {
      items.push(
        { id: "report-builder", label: "Report Builder", group: "Laporan", icon: Sparkles, action: () => setView("report-builder") },
        { id: "blockchain-explorer", label: "Blockchain Audit", group: "Laporan", icon: Sparkles, action: () => setView("blockchain-explorer"), badge: "Soon" }
      );
    }

    // Sistem
    if (isLibrarian) {
      items.push(
        { id: "announcements", label: "Pengumuman", group: "Komunikasi", icon: Sparkles, action: () => setView("announcements") },
        { id: "notification-log", label: "Log Notifikasi", group: "Komunikasi", icon: Sparkles, action: () => setView("notification-log") },
        { id: "assets", label: "Aset", group: "Sistem", icon: Sparkles, action: () => setView("assets") },
        { id: "settings", label: "Pengaturan", group: "Sistem", icon: SettingsIcon, action: () => setView("settings") },
        { id: "audit-log", label: "Jejak Audit", group: "Sistem", icon: Sparkles, action: () => setView("audit-log") },
        { id: "data-export", label: "Export Data", group: "Sistem", icon: Sparkles, action: () => setView("data-export"), keywords: ["csv", "download", "unduh"] }
      );
    } else {
      items.push(
        { id: "announcements", label: "Pengumuman", group: "Komunikasi", icon: Sparkles, action: () => setView("announcements") },
        { id: "notifications", label: "Notifikasi", group: "Komunikasi", icon: Sparkles, action: () => setView("notifications") }
      );
    }

    // Quick actions
    items.push({
      id: "refresh",
      label: "Refresh Data",
      group: "Aksi Cepat",
      icon: RefreshCw,
      action: () => triggerRefresh(),
      keywords: ["reload", "muat ulang", "refresh"],
      shortcut: "R",
    });
    items.push({
      id: "settings",
      label: "Buka Pengaturan",
      group: "Aksi Cepat",
      icon: SettingsIcon,
      action: () => setView("settings"),
      keywords: ["setting", "preferences"],
      shortcut: "S",
    });
    items.push({
      id: "home",
      label: "Kembali ke Beranda",
      group: "Aksi Cepat",
      icon: Home,
      action: () => {
        if (isLibrarian) setView("dashboard");
        else setView("my-dashboard");
      },
      keywords: ["home", "beranda"],
      shortcut: "H",
    });

    return items;
  }, [isLibrarian, setView, triggerRefresh]);

  // Filter and rank results
  const filtered = useMemo(() => {
    let candidates = menuItems;

    // Add recent items to top if no query
    if (!query.trim()) {
      const recents: CommandItem[] = recentItems
        .filter((r) => {
          // Verify item still exists in menu (for deleted views)
          return menuItems.some((m) => m.id === r.key);
        })
        .slice(0, 5)
        .map((r) => {
          const menuItem = menuItems.find((m) => m.id === r.key);
          if (menuItem) {
            return { ...menuItem, isRecent: true };
          }
          return null;
        })
        .filter((x): x is CommandItem => x !== null);

      return {
        recents,
        all: menuItems,
        searchHistory: searchHistory.slice(0, 5),
      };
    }

    // With query: fuzzy match all items
    const scored = menuItems
      .map((item) => {
        let score = fuzzyScore(item.label, query);
        if (item.keywords) {
          for (const kw of item.keywords) {
            const kwScore = fuzzyScore(kw, query);
            if (kwScore > 0) score = Math.max(score, kwScore * 0.8);
          }
        }
        return { item, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);

    return { recents: [], all: scored, searchHistory: [] };
  }, [menuItems, query, recentItems, searchHistory]);

  // Combined list for keyboard nav
  const flatList = useMemo(() => {
    if (!query.trim() && filtered.recents.length > 0) {
      return [
        ...filtered.recents,
        // Add "All Menus" section header separator? For now, just show all below recents
        ...filtered.all,
      ];
    }
    return filtered.all;
  }, [filtered, query]);

  // Clamp selectedIdx
  useEffect(() => {
    if (selectedIdx >= flatList.length) {
      setSelectedIdx(Math.max(0, flatList.length - 1));
    }
  }, [flatList.length, selectedIdx]);

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`);
      if (item) {
        (item as HTMLElement).scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIdx]);

  const selectItem = useCallback(
    (item: CommandItem) => {
      // Track as recent
      trackRecent({
        key: item.id as ViewKey,
        params: {},
        label: item.label,
        group: item.group,
      });
      // Track search history (only if there was a query)
      if (query.trim().length >= 2) {
        trackSearch(userId, query);
        setHistoryTick((t) => t + 1);
      }
      // Execute action
      item.action();
      // Close palette
      setCommandPaletteOpen(false);
    },
    [trackRecent, setCommandPaletteOpen, query, userId]
  );

  // Search history actions
  const handleClearHistory = useCallback(() => {
    clearSearchHistory(userId);
    setHistoryTick((t) => t + 1);
  }, [userId]);

  const handleDeleteSearchEntry = useCallback(
    (entry: string) => {
      deleteSearchEntry(userId, entry);
      setHistoryTick((t) => t + 1);
    },
    [userId]
  );

  const handleReplaySearch = useCallback((entry: string) => {
    setQuery(entry);
    setSelectedIdx(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  // Search suggestions while typing
  const suggestions = useMemo(
    () => (query.length >= 2 ? getSearchSuggestions(userId, query, 3) : []),
    [query, userId, historyTick]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(flatList.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatList[selectedIdx];
      if (item) selectItem(item);
    }
  };

  // Group items by their group for rendering
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    flatList.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [flatList]);

  let runningIdx = -1;

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent
        className="overflow-hidden p-0 max-w-2xl"
        // Hide default close button — we have our own UX
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Cari dan navigasi ke menu manapun
        </DialogDescription>

        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari menu, aksi, atau halaman..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIdx(0);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto scrollbar-thin"
        >
          {flatList.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
              Tidak ada hasil untuk "{query}"
              <div className="text-xs mt-2">
                Coba kata kunci lain, atau klik menu di sidebar
              </div>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="mb-1">
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    {group === "Aksi Cepat" ? (
                      <Command className="h-3 w-3" />
                    ) : group === "Beranda" ? (
                      <Home className="h-3 w-3" />
                    ) : null}
                    {group}
                  </div>
                  {items.map((item) => {
                    runningIdx++;
                    const idx = runningIdx;
                    const isSelected = idx === selectedIdx;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        data-idx={idx}
                        onClick={() => selectItem(item)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <HighlightedText text={item.label} query={query} />
                            {item.isRecent && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                recent
                              </span>
                            )}
                          </div>
                          {item.keywords && item.keywords.length > 0 && !query.trim() && (
                            <div className="text-[10px] text-muted-foreground/70 truncate">
                              {item.keywords.slice(0, 3).join(" · ")}
                            </div>
                          )}
                        </div>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className="h-5 text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30"
                          >
                            {item.badge}
                          </Badge>
                        )}
                        {item.shortcut && (
                          <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                            {item.shortcut}
                          </kbd>
                        )}
                        {isSelected && (
                          <CornerDownLeft className="h-3 w-3 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Search history section (when no query) */}
              {!query.trim() && filtered.searchHistory.length > 0 && (
                <div className="mt-1 border-t pt-2">
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    Pencarian Terakhir
                  </div>
                  {filtered.searchHistory.map((entry, idx) => (
                    <div
                      key={`search-${entry.query}-${idx}`}
                      className="group flex items-center gap-2 px-4 py-1.5 hover:bg-muted/50"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => handleReplaySearch(entry.query)}
                        className="flex-1 text-left text-sm flex items-center gap-2 min-w-0"
                      >
                        <span className="truncate">{entry.query}</span>
                        {entry.count > 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <TrendingUp className="h-2.5 w-2.5" />
                            {entry.count}x
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSearchEntry(entry.query);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label={`Hapus ${entry.query}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleClearHistory}
                    className="w-full px-4 py-2 mt-1 text-xs text-muted-foreground hover:text-destructive text-left"
                  >
                    <History className="inline h-3 w-3 mr-1" />
                    Bersihkan semua pencarian
                  </button>
                </div>
              )}

              {/* Search suggestions (while typing) */}
              {query.trim() && suggestions.length > 0 && (
                <div className="mt-1 border-t pt-2">
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    Saran dari Riwayat
                  </div>
                  <div className="flex flex-wrap gap-1 px-4 pb-2">
                    {suggestions.map((s, idx) => (
                      <button
                        key={`sugg-${idx}`}
                        onClick={() => handleReplaySearch(s)}
                        className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/70 text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear recent button */}
              {!query.trim() && recentItems.length > 0 && (
                <div className="border-t mt-2 pt-2">
                  <button
                    onClick={() => {
                      clearRecent();
                    }}
                    className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground text-left"
                  >
                    <Clock className="inline h-3 w-3 mr-1" />
                    Bersihkan recent items
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t px-3 py-2 bg-muted/30 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded border bg-background">↑</kbd>
              <kbd className="px-1 rounded border bg-background">↓</kbd>
              navigasi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded border bg-background">↵</kbd>
              pilih
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded border bg-background">esc</kbd>
              tutup
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="h-2.5 w-2.5" />
            Jendela Ilmu Command
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Highlight matching text =====

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary font-semibold rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}
