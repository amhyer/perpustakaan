"use client";

import {
  Bell,
  BookHeart,
  BookMarked,
  BookOpen,
  ClipboardList,
  CreditCard,
  Home,
  LayoutDashboard,
  Library,
  Megaphone,
  Printer,
  ScanLine,
  Settings,
  Users,
  FileBarChart,
  BookPlus,
  BookmarkCheck,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { cn } from "@/lib/utils";
import { useAppStore, type ViewKey } from "@/store/use-app-store";
import { ROLE_LABELS } from "@/lib/constants";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ElementType;
}

const LIBRARIAN_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "catalog", label: "Katalog Buku", icon: BookOpen },
  { key: "members", label: "Anggota", icon: Users },
  { key: "circulation", label: "Sirkulasi", icon: ScanLine },
  { key: "loans", label: "Peminjaman", icon: ClipboardList },
  { key: "reservations", label: "Reservasi", icon: BookMarked },
  { key: "proposals", label: "Usulan Buku", icon: BookPlus },
  { key: "announcements", label: "Pengumuman", icon: Megaphone },
  { key: "reports", label: "Laporan", icon: FileBarChart },
  { key: "batch-cards", label: "Cetak Kartu Massal", icon: Printer },
  { key: "settings", label: "Pengaturan", icon: Settings },
];

const MEMBER_NAV: NavItem[] = [
  { key: "my-dashboard", label: "Beranda", icon: Home },
  { key: "catalog", label: "Katalog Buku", icon: BookOpen },
  { key: "my-loans", label: "Pinjamanku", icon: ClipboardList },
  { key: "wishlist", label: "Wishlist", icon: BookHeart },
  { key: "my-card", label: "Kartu Anggota", icon: CreditCard },
  { key: "announcements", label: "Pengumuman", icon: Megaphone },
  { key: "notifications", label: "Notifikasi", icon: Bell },
];

export function Sidebar() {
  const { user, view, setView, sidebarOpen, setSidebarOpen } = useAppStore();
  const isLibrarianRole = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";
  // PUSTAKAWAN_JUNIOR tidak bisa akses Pengaturan — filter dari nav
  const fullNav = isLibrarianRole
    ? LIBRARIAN_NAV.filter((item) => user?.role === "PUSTAKAWAN_JUNIOR" ? item.key !== "settings" : true)
    : MEMBER_NAV;
  const nav = fullNav;
  const activeKey = view.key;

  return (
    <>
      {/* Overlay mobile */}
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
        {/* Header */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <button onClick={() => setView(isLibrarianRole ? "dashboard" : "my-dashboard")}>
            <Logo variant="light" />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="mx-4 mt-4 rounded-xl bg-sidebar-accent/50 border border-sidebar-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-[11px] text-sidebar-foreground/70 flex items-center gap-1">
                  {user.role === "LIBRARIAN" || user.role === "PUSTAKAWAN_JUNIOR" ? (
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          {nav.map((item) => {
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
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  )}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="text-[11px] text-sidebar-foreground/60 text-center">
            v1.0 · Dibuat untuk literasi
          </div>
        </div>
      </aside>
    </>
  );
}
