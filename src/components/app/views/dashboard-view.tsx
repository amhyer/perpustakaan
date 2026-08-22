"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  ArrowRightLeft,
  UserPlus,
  Zap,
  ScanLine,
  CreditCard,
  ClipboardCheck,
  Megaphone,
  CalendarClock,
  Clock,
  AlertTriangle,
  ShieldAlert,
  BellRing,
  ChevronRight,
  type LucideIcon,
  BookOpen,
  PackageCheck,
  ClipboardList,
  Users,
  GraduationCap,
  BookMarked,
  Wallet,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { Spinner } from "@/components/app/shared/loading";
import { EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { RoleBadge } from "@/components/app/shared/role-badge";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore, type ViewKey } from "@/store/use-app-store";
import {
  formatRupiah,
  formatDate,
  formatDateShort,
  daysBetween,
  LIBRARY_TAGLINE,
} from "@/lib/constants";
import {
  TrendAreaChart,
  CategoryDonutChart,
  TopBooksList,
  TopMembersList,
  RecentLoansTable,
  type StatsResponse,
} from "@/components/app/dashboard/widgets";

// ===== Quick action (P0-2) =====
interface QuickActionDef {
  label: string;
  description: string;
  view: ViewKey;
  icon: LucideIcon;
  color: string;
}

function QuickAction({ label, description, view, icon: Icon, color }: QuickActionDef) {
  const setView = useAppStore((s) => s.setView);
  return (
    <button
      onClick={() => setView(view)}
      className="rounded-xl border bg-card p-3 text-left hover:shadow-md hover:border-primary/40 hover:bg-accent/40 transition-all group"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-sm font-semibold leading-tight">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{description}</p>
    </button>
  );
}

// ===== Highlight chip =====
function HighlightChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-white/70 font-medium">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

// ===== Action item (untuk section "Perlu Tindakan") =====
interface ActionItem {
  label: string;
  view: ViewKey;
  icon: LucideIcon;
  color: string;
  value: number;
}

// ===== Main view =====
export function DashboardView() {
  const user = useAppStore((s) => s.user);

  if (user?.role !== "LIBRARIAN" && user?.role !== "PUSTAKAWAN_JUNIOR") {
    return (
      <div className="p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Akses Ditolak"
          description="Halaman ini hanya tersedia untuk pustakawan."
        />
      </div>
    );
  }

  return <DashboardViewContent />;
}

function DashboardViewContent() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const { data, loading, error, refetch } = useFetch<StatsResponse>("/api/stats");

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState<number | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!autoRefresh) {
      setRefreshCountdown(null);
      return;
    }
    setRefreshCountdown(autoRefresh);
    const countdownInterval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev === null || prev <= 1) {
          refetch();
          return autoRefresh;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, [autoRefresh, refetch]);

  const today = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const o = data?.overview;
  const greetingName = user?.member?.fullName ?? user?.name ?? "Pustakawan";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
        <Spinner />
      </div>
    );
  }

  if (error || !data || !o) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Gagal memuat dashboard"
        description={error ?? "Data statistik tidak tersedia."}
      />
    );
  }

  const actionItems: ActionItem[] = [
    {
      label: "Usulan Buku Menunggu",
      view: "proposals",
      icon: ClipboardList,
      color: "bg-amber-100 text-amber-700",
      value: o.pendingProposals,
    },
    {
      label: "Reservasi Menunggu",
      view: "reservations",
      icon: CalendarClock,
      color: "bg-sky-100 text-sky-700",
      value: o.pendingReservations,
    },
    {
      label: "Peminjaman Terlambat",
      view: "loans",
      icon: AlertTriangle,
      color: "bg-red-100 text-red-700",
      value: o.overdueLoans,
    },
    {
      label: "Reservasi Kedaluwarsa",
      view: "reservations",
      icon: Clock,
      color: "bg-rose-100 text-rose-700",
      value: o.expiredReservations,
    },
  ];
  const actionTotal = actionItems.reduce((s, i) => s + (i.value ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* ===== Welcome banner ===== */}
      <Card className="relative overflow-hidden border-0 text-white shadow-lg">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1e3a5f 0%, #2d5a3d 60%, #3b5b8c 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-white/80">{today}</p>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() =>
                      setAutoRefresh(
                        autoRefresh === 30 ? 60 : autoRefresh === 60 ? 300 : autoRefresh === 300 ? null : 30
                      )
                    }
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      autoRefresh
                        ? "bg-white/20 border-white/30 text-white"
                        : "bg-white/10 border-white/20 text-white/60 hover:text-white"
                    }`}
                  >
                    {autoRefresh ? (
                      <>
                        Auto {autoRefresh < 60 ? `${autoRefresh}s` : `${autoRefresh / 60}m`}{" "}
                        {refreshCountdown !== null && `(${refreshCountdown}s)`}
                      </>
                    ) : (
                      "Auto-refresh"
                    )}
                  </button>
                </div>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                Selamat datang, {greetingName} 👋
              </h1>
              <div className="mt-2">
                <RoleBadge user={user} className="bg-white/20 text-white border-white/30" />
              </div>
              <p className="mt-2 text-sm sm:text-base text-white/85 max-w-xl">
                {LIBRARY_TAGLINE}. Berikut ringkasan aktivitas perpustakaan hari ini.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                onClick={() => setView("book-form")}
                className="bg-white text-primary hover:bg-white/90"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Tambah Buku
              </Button>
              <Button
                onClick={() => setView("circulation")}
                variant="secondary"
                size="sm"
                className="bg-white/15 text-white hover:bg-white/25 border border-white/20"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Sirkulasi
              </Button>
              <Button
                onClick={() => setView("members")}
                variant="secondary"
                size="sm"
                className="bg-white/15 text-white hover:bg-white/25 border border-white/20"
              >
                <UserPlus className="h-4 w-4" />
                Tambah Anggota
              </Button>
            </div>
          </div>

          {/* Mini highlights */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HighlightChip label="Buku" value={o.totalBooks} />
            <HighlightChip label="Eksemplar" value={o.totalItems} />
            <HighlightChip label="Anggota" value={o.totalMembers} />
            <HighlightChip label="Peminjaman Aktif" value={o.activeLoans} />
          </div>
        </div>
      </Card>

      {/* ===== Aksi Cepat (P0-2) ===== */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickAction
            label="Sirkulasi"
            description="Pinjam / kembalikan buku"
            view="circulation"
            icon={ArrowRightLeft}
            color="bg-sky-100 text-sky-700"
          />
          <QuickAction
            label="Tambah Buku"
            description="Tambah manual atau scan ISBN"
            view="book-form"
            icon={ScanLine}
            color="bg-primary/10 text-primary"
          />
          <QuickAction
            label="Cetak Kartu Massal"
            description="Buat kartu anggota sekaligus"
            view="batch-cards"
            icon={CreditCard}
            color="bg-violet-100 text-violet-700"
          />
          <QuickAction
            label="Stock Opname"
            description="Rekap & verifikasi koleksi"
            view="stocktaking"
            icon={ClipboardCheck}
            color="bg-emerald-100 text-emerald-700"
          />
          <QuickAction
            label="Reservasi"
            description="Kelola antrian reservasi"
            view="reservations"
            icon={CalendarClock}
            color="bg-amber-100 text-amber-700"
          />
          <QuickAction
            label="Pengumuman"
            description="Terbitkan pengumuman baru"
            view="announcements"
            icon={Megaphone}
            color="bg-rose-100 text-rose-700"
          />
        </div>
      </div>

      {/* ===== Stats grid - row 1 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Buku"
          value={o.totalBooks}
          icon={BookOpen}
          color="bg-primary/10 text-primary"
          subtitle={`${o.totalItems} eksemplar`}
        />
        <StatCard
          label="Eksemplar Tersedia"
          value={o.availableItems}
          icon={PackageCheck}
          color="bg-emerald-100 text-emerald-700"
          subtitle={`${o.borrowedItems} sedang dipinjam`}
        />
        <StatCard
          label="Peminjaman Aktif"
          value={o.activeLoans}
          icon={ClipboardList}
          color="bg-sky-100 text-sky-700"
          subtitle="Sedang berlangsung"
        />
        <StatCard
          label="Terlambat"
          value={o.overdueLoans}
          icon={AlertTriangle}
          color="bg-red-100 text-red-700"
          subtitle={o.overdueLoans > 0 ? "Perlu tindakan" : "Aman"}
        />
      </div>

      {/* ===== Stats grid - row 2 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Anggota"
          value={o.totalMembers}
          icon={Users}
          color="bg-primary/10 text-primary"
          subtitle={`${o.activeMembers} aktif`}
        />
        <StatCard
          label="Siswa Aktif"
          value={o.studentMembers}
          icon={GraduationCap}
          color="bg-sky-100 text-sky-700"
          subtitle="Kategori siswa"
        />
        <StatCard
          label="Guru Aktif"
          value={o.teacherMembers}
          icon={BookMarked}
          color="bg-amber-100 text-amber-700"
          subtitle="Kategori guru"
        />
        <StatCard
          label="Denda Tertunggak"
          value={formatRupiah(o.overdueFineTotal)}
          icon={Wallet}
          color="bg-red-100 text-red-700"
          subtitle={`${o.overdueLoans} pinjaman`}
        />
      </div>

      {/* ===== Hari Ini (Tahap 33+35) ===== */}
      <TodayActivity
        loansToday={o.loansToday}
        returnsToday={o.returnsToday}
        newMembersToday={o.newMembersToday}
        recentLoans={o.recentLoansToday}
        recentReturns={o.recentReturnsToday}
        recentMembers={o.recentNewMembersToday}
      />

      {/* ===== Perlu Tindakan (P0-3) ===== */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <BellRing className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Perlu Tindakan</CardTitle>
              <CardDescription className="text-xs">
                Prioritas yang membutuhkan perhatian Anda hari ini
              </CardDescription>
            </div>
          </div>
          {actionTotal > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700 border-0">
              {actionTotal} item
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {actionTotal === 0 ? (
            <EmptyState
              icon={BellRing}
              title="Semua beres!"
              description="Tidak ada usulan, reservasi, atau peminjaman yang memerlukan tindakan."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {actionItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setView(item.view)}
                  className="flex items-center gap-3 rounded-xl border p-4 text-left hover:shadow-md hover:border-primary/40 hover:bg-accent/40 transition-all group"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">Buka halaman {item.view}</p>
                  </div>
                  <span className="text-lg font-bold shrink-0">{item.value}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Charts section — extracted widgets ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendAreaChart
          data={data.trend}
          className="lg:col-span-2"
        />
        <CategoryDonutChart data={data.categoryStats} />
      </div>

      {/* ===== Popular books & Top members — extracted widgets ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopBooksList
          books={data.popularBooks}
          onSelectBook={(id) => setView("book-detail", { id })}
          onViewAll={() => setView("catalog")}
        />
        <TopMembersList
          members={data.topMembers}
          onSelectMember={(id) => setView("member-detail", { id })}
          onViewAll={() => setView("members")}
        />
      </div>

      {/* ===== Recent loans table — extracted widget ===== */}
      <RecentLoansTable
        loans={data.recentLoans}
        description="5 transaksi peminjaman terakhir"
        onSelectMember={(id) => setView("member-detail", { id })}
        onSelectBook={(id) => setView("book-detail", { id })}
        onViewAll={() => setView("loans")}
      />

      {/* ===== Overdue alerts ===== */}
      {data.overdueList.length > 0 && (
        <OverdueAlerts
          loans={data.overdueList}
          onViewAll={() => setView("loans")}
        />
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Data diperbarui otomatis · {formatDate(new Date())}
      </p>
    </div>
  );
}

// ===== Today activity (inline, khusus DashboardView — tidak dipakai view lain) =====
function TodayActivity({
  loansToday,
  returnsToday,
  newMembersToday,
  recentLoans,
  recentReturns,
  recentMembers,
}: {
  loansToday: number;
  returnsToday: number;
  newMembersToday: number;
  recentLoans: { bookItem?: { book?: { title: string; author: string } }; member?: { fullName: string } }[];
  recentReturns: { bookItem?: { book?: { title: string; author: string } }; member?: { fullName: string } }[];
  recentMembers: { fullName: string; category: string }[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Aktivitas Hari Ini</CardTitle>
            <CardDescription className="text-xs">
              Ringkasan aktivitas perpustakaan hari ini
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-blue-600">{loansToday}</div>
            <div className="text-xs text-muted-foreground mt-1">Dipinjam</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-emerald-600">{returnsToday}</div>
            <div className="text-xs text-muted-foreground mt-1">Dikembalikan</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-purple-600">{newMembersToday}</div>
            <div className="text-xs text-muted-foreground mt-1">Anggota Baru</div>
          </div>
        </div>
        {(recentLoans.length > 0 || recentReturns.length > 0 || recentMembers.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentLoans.length > 0 && (
              <div>
                <div className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Dipinjam Hari Ini
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentLoans.map((loan, i) => (
                    <div key={i} className="text-xs p-1.5 rounded bg-blue-50 dark:bg-blue-950/30 truncate">
                      <span className="font-medium">{loan.bookItem?.book?.title || "-"}</span>
                      <span className="text-muted-foreground"> — {loan.member?.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recentReturns.length > 0 && (
              <div>
                <div className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1">
                  <PackageCheck className="h-3 w-3" /> Dikembalikan Hari Ini
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentReturns.map((loan, i) => (
                    <div key={i} className="text-xs p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/30 truncate">
                      <span className="font-medium">{loan.bookItem?.book?.title || "-"}</span>
                      <span className="text-muted-foreground"> — {loan.member?.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recentMembers.length > 0 && (
              <div>
                <div className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Anggota Baru
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentMembers.map((m, i) => (
                    <div key={i} className="text-xs p-1.5 rounded bg-purple-50 dark:bg-purple-950/30 truncate">
                      <span className="font-medium">{m.fullName}</span>
                      <span className="text-muted-foreground"> — {m.category === "STUDENT" ? "Siswa" : "Guru"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Overdue alerts (inline, khusus DashboardView) =====
function OverdueAlerts({
  loans,
  onViewAll,
}: {
  loans: StatsResponse["overdueList"];
  onViewAll: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base text-red-700 dark:text-red-400">
              Peringatan Keterlambatan
            </CardTitle>
            <CardDescription className="text-xs">
              {loans.length} buku melewati jatuh tempo
            </CardDescription>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-700 hover:bg-red-100"
          onClick={onViewAll}
        >
          Lihat Semua
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-red-100 dark:divide-red-900/30">
          {loans.slice(0, 8).map((loan) => {
            const daysLate = Math.max(0, daysBetween(new Date(), new Date(loan.dueDate)));
            const rule =
              loan.member.category === "TEACHER"
                ? 500
                : loan.member.category === "LIBRARIAN"
                ? 0
                : 1000;
            const fine = daysLate * rule;
            return (
              <li key={loan.id} className="py-2.5 px-1 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1">{loan.bookItem.book.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {loan.member.fullName} · Jatuh tempo {formatDateShort(loan.dueDate)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge className="bg-red-100 text-red-700 border-0" variant="secondary">
                    {daysLate} hari
                  </Badge>
                  {fine > 0 && (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-0.5">
                      {formatRupiah(fine)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
