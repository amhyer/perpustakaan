"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  PackageCheck,
  ClipboardList,
  AlertTriangle,
  Users,
  GraduationCap,
  BookMarked,
  Wallet,
  Plus,
  ArrowRightLeft,
  UserPlus,
  TrendingUp,
  Trophy,
  ChevronRight,
  Clock,
  CalendarClock,
  CalendarDays,
  ShieldAlert,
  Zap,
  ScanLine,
  CreditCard,
  ClipboardCheck,
  Megaphone,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-display/table";
import { Spinner } from "@/components/app/shared/loading";
import { EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { BookCover } from "@/components/app/shared/book-cover";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore, type ViewKey } from "@/store/use-app-store";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  formatRupiah,
  formatDate,
  formatDateShort,
  daysBetween,
  LIBRARY_TAGLINE,
} from "@/lib/constants";

// ===== Types =====
interface Overview {
  totalBooks: number;
  totalItems: number;
  availableItems: number;
  borrowedItems: number;
  totalMembers: number;
  activeMembers: number;
  studentMembers: number;
  teacherMembers: number;
  activeLoans: number;
  overdueLoans: number;
  pendingReservations: number;
  pendingProposals: number;
  expiredReservations: number;
  overdueFineTotal: number;
  loansToday: number;
  returnsToday: number;
  newMembersToday: number;
  recentLoansToday: { bookItem?: { book?: { title: string; author: string } }; member?: { fullName: string } }[];
  recentReturnsToday: { bookItem?: { book?: { title: string; author: string } }; member?: { fullName: string } }[];
  recentNewMembersToday: { fullName: string; category: string }[];
}

interface TrendItem {
  date: string;
  label: string;
  count: number;
}

interface PopularBook {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverImage: string | null;
  loanCount: number;
}

interface TopMember {
  id: string;
  fullName: string;
  memberNumber: string;
  category: string;
  classGrade: string | null;
  loanCount: number;
}

interface CategoryStat {
  name: string;
  count: number;
}

interface Loan {
  id: string;
  memberId: string;
  bookItemId: string;
  bookId: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  status: string;
  fineAmount: number;
  finePaid: number;
  renewedCount: number;
  member: {
    id: string;
    memberNumber: string;
    fullName: string;
    category: string;
    classGrade: string | null;
  };
  bookItem: {
    book: {
      id: string;
      title: string;
      author: string;
      coverColor: string;
      coverImage: string | null;
    };
  };
}

interface StatsResponse {
  overview: Overview;
  trend: TrendItem[];
  popularBooks: PopularBook[];
  topMembers: TopMember[];
  categoryStats: CategoryStat[];
  recentLoans: Loan[];
  overdueList: Loan[];
}

// ===== Chart palette =====
const CHART_COLORS = ["#3b5b8c", "#4a7c59", "#c99544", "#5a8fa6", "#8b5a9e"];
const PIE_COLORS = ["#3b5b8c", "#4a7c59", "#c99544", "#5a8fa6", "#8b5a9e", "#a64a4a", "#6b7280"];

// ===== Custom tooltip for area chart =====
function TrendTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5">
        Peminjaman: <span className="font-semibold text-primary">{payload[0].value}</span>
      </p>
    </div>
  );
}

function CategoryTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; count: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground">{p.name}</p>
      <p className="text-muted-foreground mt-0.5">
        Total: <span className="font-semibold text-primary">{p.payload.count}</span> peminjaman
      </p>
    </div>
  );
}

// ===== Avatar initials =====
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

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
      setRefreshCountdown(prev => {
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

  const totalCategory = data.categoryStats.reduce((s, c) => s + c.count, 0) || 1;

  const actionItems: { label: string; view: ViewKey; icon: LucideIcon; color: string; value: number }[] = [
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
        {/* Decorative grid pattern */}
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
                    onClick={() => setAutoRefresh(autoRefresh === 30 ? 60 : autoRefresh === 60 ? 300 : autoRefresh === 300 ? null : 30)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${autoRefresh ? "bg-white/20 border-white/30 text-white" : "bg-white/10 border-white/20 text-white/60 hover:text-white"}`}
                  >
                    {autoRefresh ? (
                      <>Auto {autoRefresh < 60 ? `${autoRefresh}s` : `${autoRefresh / 60}m`} {refreshCountdown !== null && `(${refreshCountdown}s)`}</>
                    ) : (
                      "Auto-refresh"
                    )}
                  </button>
                </div>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                Selamat datang, {greetingName} 👋
              </h1>
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
      <Card className="p-4 sm:p-6">
        <CardHeader className="p-0 mb-4 flex-row items-center justify-between space-y-0">
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
        <CardContent className="p-0">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-blue-600">{o.loansToday}</div>
              <div className="text-xs text-muted-foreground mt-1">Dipinjam</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-emerald-600">{o.returnsToday}</div>
              <div className="text-xs text-muted-foreground mt-1">Dikembalikan</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-purple-600">{o.newMembersToday}</div>
              <div className="text-xs text-muted-foreground mt-1">Anggota Baru</div>
            </div>
          </div>
          {(o.recentLoansToday.length > 0 || o.recentReturnsToday.length > 0 || o.recentNewMembersToday.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {o.recentLoansToday.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> Dipinjam Hari Ini
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {o.recentLoansToday.map((loan, i) => (
                      <div key={i} className="text-xs p-1.5 rounded bg-blue-50 dark:bg-blue-950/30 truncate">
                        <span className="font-medium">{loan.bookItem?.book?.title || "-"}</span>
                        <span className="text-muted-foreground"> — {loan.member?.fullName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {o.recentReturnsToday.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1">
                    <PackageCheck className="h-3 w-3" /> Dikembalikan Hari Ini
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {o.recentReturnsToday.map((loan, i) => (
                      <div key={i} className="text-xs p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/30 truncate">
                        <span className="font-medium">{loan.bookItem?.book?.title || "-"}</span>
                        <span className="text-muted-foreground"> — {loan.member?.fullName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {o.recentNewMembersToday.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                    <UserPlus className="h-3 w-3" /> Anggota Baru
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {o.recentNewMembersToday.map((m, i) => (
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

      {/* ===== Perlu Tindakan (P0-3) ===== */}
      <Card className="p-4 sm:p-6">
        <CardHeader className="p-0 mb-4 flex-row items-center justify-between space-y-0">
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
        <CardContent className="p-0">
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
                  <span className="text-lg font-bold shrink-0">
                    {item.value}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Charts section ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <Card className="lg:col-span-2 p-4 sm:p-6">
          <CardHeader className="p-0 mb-4 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tren Peminjaman 7 Hari
              </CardTitle>
              <CardDescription className="text-xs">
                Jumlah peminjaman per hari selama 7 hari terakhir
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Peminjaman"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2.5}
                    fill="url(#trendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category donut */}
        <Card className="p-4 sm:p-6">
          <CardHeader className="p-0 mb-4 space-y-0">
            <CardTitle className="text-base">Peminjaman per Kategori</CardTitle>
            <CardDescription className="text-xs">
              Distribusi peminjaman berdasarkan kategori buku
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.categoryStats.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Belum ada data kategori
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {data.categoryStats.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoryTooltip />} />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      iconType="circle"
                      formatter={(value, _entry, idx) => {
                        const item = data.categoryStats[idx as number];
                        const count = item?.count ?? 0;
                        const pct = Math.round((count / totalCategory) * 100);
                        return (
                          <span className="text-[11px] text-muted-foreground">
                            {value} ({count} · {pct}%)
                          </span>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Popular books & Top members ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Popular books */}
        <Card className="p-4 sm:p-6">
          <CardHeader className="p-0 mb-4 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Buku Terpopuler</CardTitle>
                <CardDescription className="text-xs">Paling sering dipinjam</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("catalog")}>
              Lihat Semua
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.popularBooks.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Belum ada data"
                description="Belum ada peminjaman tercatat."
              />
            ) : (
              <ul className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-border">
                {data.popularBooks.map((book, i) => (
                  <li key={book.id}>
                    <button
                      onClick={() => setView("book-detail", { id: book.id })}
                      className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-accent/50 rounded-lg transition-colors text-left"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="w-10 shrink-0">
                        <BookCover
                          title={book.title}
                          author={book.author}
                          color={book.coverColor}
                          coverImage={book.coverImage}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-1">{book.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-0 shrink-0" variant="secondary">
                        {book.loanCount}× pinjam
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top members */}
        <Card className="p-4 sm:p-6">
          <CardHeader className="p-0 mb-4 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Anggota Paling Aktif</CardTitle>
                <CardDescription className="text-xs">Berdasarkan jumlah peminjaman</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("members")}>
              Lihat Semua
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.topMembers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Belum ada data"
                description="Belum ada anggota yang melakukan peminjaman."
              />
            ) : (
              <ul className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-border">
                {data.topMembers.map((m, i) => (
                  <li key={m.id}>
                    <button
                      onClick={() => setView("member-detail", { id: m.id })}
                      className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-accent/50 rounded-lg transition-colors text-left"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                        {initials(m.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-1">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.memberNumber}
                          {m.classGrade ? ` · ${m.classGrade}` : ""}
                        </p>
                      </div>
                      <Badge
                        className={`${ROLE_COLORS[m.category] ?? ""} shrink-0`}
                        variant="outline"
                      >
                        {ROLE_LABELS[m.category] ?? m.category}
                      </Badge>
                      <Badge className="bg-sky-50 text-sky-700 border-0 shrink-0" variant="secondary">
                        {m.loanCount}×
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Recent loans table ===== */}
      <Card className="p-4 sm:p-6">
        <CardHeader className="p-0 mb-4 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Peminjaman Terbaru</CardTitle>
              <CardDescription className="text-xs">5 transaksi peminjaman terakhir</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView("loans")}>
            Lihat Semua
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentLoans.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada peminjaman"
              description="Riwayat peminjaman akan muncul di sini."
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anggota</TableHead>
                    <TableHead>Buku</TableHead>
                    <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentLoans.slice(0, 5).map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <button
                          onClick={() => setView("member-detail", { id: loan.member.id })}
                          className="text-left hover:underline"
                        >
                          <span className="block text-sm font-medium line-clamp-1">
                            {loan.member.fullName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {loan.member.memberNumber}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setView("book-detail", { id: loan.bookItem.book.id })}
                          className="text-left hover:underline max-w-[240px]"
                        >
                          <span className="block text-sm font-medium line-clamp-1">
                            {loan.bookItem.book.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {loan.bookItem.book.author}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatDateShort(loan.loanDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={LOAN_STATUS_COLORS[loan.status] ?? ""}
                          variant="outline"
                        >
                          {LOAN_STATUS_LABELS[loan.status] ?? loan.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Overdue alerts ===== */}
      {data.overdueList.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 p-4 sm:p-6">
          <CardHeader className="p-0 mb-4 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-red-700 dark:text-red-400">
                  Peringatan Keterlambatan
                </CardTitle>
                <CardDescription className="text-xs">
                  {data.overdueList.length} buku melewati jatuh tempo
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-100"
              onClick={() => setView("loans")}
            >
              Lihat Semua
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-red-100 dark:divide-red-900/30">
              {data.overdueList.slice(0, 8).map((loan) => {
                const daysLate = Math.max(0, daysBetween(new Date(), new Date(loan.dueDate)));
                const rule =
                  loan.member.category === "TEACHER" ? 500 : loan.member.category === "LIBRARIAN" ? 0 : 1000;
                const fine = daysLate * rule;
                return (
                  <li
                    key={loan.id}
                    className="py-2.5 px-1 flex items-center gap-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-1">
                        {loan.bookItem.book.title}
                      </p>
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
      )}

      {/* small print hint at bottom of dashboard */}
      <p className="text-[11px] text-muted-foreground text-center">
        Data diperbarui otomatis · {formatDate(new Date())}
      </p>
    </div>
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
