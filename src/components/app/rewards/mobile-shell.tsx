"use client";

/**
 * MobileShell — Bottom navigation shell untuk mobile app / PWA.
 *
 * Cocok untuk:
 * - Mobile web (PWA installed di HP)
 * - React Native (component reusable dengan minor adjustment)
 * - Progressive Web App
 *
 * Fitur:
 * - Bottom tab navigation (Home, Catalog, Rewards, Profile)
 * - Top bar dengan search + notifications
 * - Pull-to-refresh ready
 * - Safe area untuk iPhone notch
 * - Touch-optimized (44px minimum touch target)
 */

import { useState, useEffect } from "react";
import { Home, BookOpen, Gift, User, Search, Bell, Menu } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: React.ReactNode;
  unreadNotifications?: number;
  userName?: string;
  onMenuClick?: () => void;
}

const TABS = [
  { key: "/", label: "Beranda", icon: Home },
  { key: "/?view=catalog", label: "Katalog", icon: BookOpen },
  { key: "/?view=rewards-catalog", label: "Hadiah", icon: Gift },
  { key: "/?view=my-profile", label: "Profil", icon: User },
];

export function MobileShell({
  children,
  unreadNotifications = 0,
  userName,
  onMenuClick,
}: MobileShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Detect active tab
  const getActiveTab = () => {
    if (pathname === "/" || pathname === "") return "/";
    return "";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?view=catalog&q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
    }
  };

  if (!isMobile) {
    return <>{children}</>; // Desktop: no shell
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 safe-area-top">
        <div className="flex items-center gap-2 px-3 py-2">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 rounded-md hover:bg-slate-100"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari buku..."
                className="flex-1 px-3 py-1.5 bg-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-xs text-slate-600"
              >
                Batal
              </button>
            </form>
          ) : (
            <>
              <div className="flex-1">
                <h1 className="text-base font-bold">Jendela Ilmu</h1>
                {userName && (
                  <div className="text-xs text-slate-500">Halo, {userName}</div>
                )}
              </div>
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-md hover:bg-slate-100"
                aria-label="Cari"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => router.push("/?view=notifications")}
                className="p-2 rounded-md hover:bg-slate-100 relative"
                aria-label="Notifikasi"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-bottom">
        <div className="grid grid-cols-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = getActiveTab() === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => router.push(tab.key)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors",
                  isActive
                    ? "text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-10 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/**
 * PullToRefresh — Simple pull-to-refresh untuk mobile.
 * Returns ref to attach ke scrollable container.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && startY > 0) {
        currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startY);
        if (distance > 0 && distance < 200) {
          setPullDistance(distance);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 80) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }
      setPullDistance(0);
      startY = 0;
      currentY = 0;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, pullDistance]);

  return { isRefreshing, pullDistance };
}
