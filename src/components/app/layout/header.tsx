"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, Search, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/navigation/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/data-display/avatar";
import { Badge } from "@/components/ui/data-display/badge";
import { useAppStore } from "@/store/use-app-store";
import { api } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, setView, setSidebarOpen, view, setUser } = useAppStore();
  const [notifCount, setNotifCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    api
      .get<{ unread: number }>(`/api/notifications?count=1`)
      .then((r) => setNotifCount(r.unread))
      .catch(() => {});
  }, [user, view.key]);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore
    }
    setUser(null);
    toast.success("Anda telah keluar. Sampai jumpa!");
    router.refresh();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setView("catalog", searchQuery ? { q: searchQuery } : {});
  };

  const titles: Record<string, string> = {
    dashboard: "Dashboard Pustakawan",
    catalog: "Katalog Buku (OPAC)",
    "book-detail": "Detail Buku",
    "book-form": "Kelola Buku",
    members: "Manajemen Anggota",
    "member-detail": "Detail Anggota",
    circulation: "Sirkulasi",
    loans: "Data Peminjaman",
    reservations: "Reservasi Buku",
    proposals: "Usulan Buku",
    announcements: "Pengumuman",
    reports: "Laporan & Statistik",
    settings: "Pengaturan",
    "my-dashboard": "Beranda",
    "my-loans": "Pinjamanku",
    "my-card": "Kartu Anggota Digital",
    wishlist: "Wishlist Favorit",
    notifications: "Notifikasi",
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="font-bold text-base sm:text-lg text-foreground hidden sm:block">
        {titles[view.key] ?? "Jendela Ilmu"}
      </h1>

      <form onSubmit={handleSearch} className="ml-auto hidden md:flex items-center max-w-xs lg:max-w-sm flex-1">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari buku, pengarang..."
            className="pl-9 h-10 bg-muted/50 border-transparent focus-visible:bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      <div className="ml-auto md:ml-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setView(user?.role === "LIBRARIAN" ? "notifications" : "notifications")}
          aria-label="Notifikasi"
        >
          <Bell className="h-5 w-5" />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full hover:bg-muted p-1 pr-2 transition-colors">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {user?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold leading-tight">{user?.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {user ? ROLE_LABELS[user.role] : ""}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.member && (
              <DropdownMenuItem onClick={() => setView("my-card")}>
                <UserIcon className="h-4 w-4 mr-2" /> Kartu Anggota
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setView("notifications")}>
              <Bell className="h-4 w-4 mr-2" /> Notifikasi
              {notifCount > 0 && (
                <Badge variant="secondary" className="ml-auto">{notifCount}</Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
