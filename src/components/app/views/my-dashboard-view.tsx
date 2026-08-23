"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  Wallet,
  BookHeart,
  RotateCw,
  Loader2,
  ArrowRight,
  Megaphone,
  Pin,
  Sparkles,
  CreditCard,
  AlertTriangle,
  BookPlus,
  Library,
  CheckCircle2,
  XCircle,
  Hourglass,
  CalendarClock,
  Users,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { Progress } from "@/components/ui/feedback/progress";

import { RoleEmptyState } from "@/components/app/shared/role-empty-state";
import { RoleBadge } from "@/components/app/shared/role-badge";
import { StatCard } from "@/components/app/shared/stat-card";
import { BookCover } from "@/components/app/shared/book-cover";
import { BookCard, type BookWithDetails } from "@/components/app/shared/book-card";
import { GamificationSection } from "@/components/app/shared/gamification-section";
import {
  ReadingLevelWidget,
  StreakCalendarWidget,
  ClassLeaderboardWidget,
} from "@/components/app/dashboard/widgets";
import { Spinner } from "@/components/app/shared/loading";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore, type ViewKey } from "@/store/use-app-store";
import {
  LOAN_RULES,
  ROLE_LABELS,
  ROLE_COLORS,
  LIBRARY_NAME,
  LIBRARY_TAGLINE,
  formatRupiah,
  formatDate,
  formatDateShort,
  daysBetween,
  calculateFine,
} from "@/lib/constants";

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

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  author?: { name: string | null } | null;
}

interface WishlistItem {
  id: string;
  book: { id: string; title: string; author: string };
}

interface Reservation {
  id: string;
  bookId: string;
  status: string;
  expiresAt: string | null;
  reservedAt: string;
  queueOrder: number;
  book: {
    id: string;
    title: string;
    author: string;
    coverColor: string;
    coverImage: string | null;
  };
}

interface Proposal {
  id: string;
  status: string;
  title?: string;
  bookTitle?: string;
  reason?: string;
  createdAt?: string;
  /** Author name (pustakawan jika ada) */
  authorName?: string;
  /** Tanggal diajukan (alias dari createdAt) */
  submittedAt?: string;
}

type BookLite = BookWithDetails;

function greetingByTime(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export function MyDashboardView({ variant = "student" }: { variant?: "student" | "teacher" }) {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loansUrl = user?.member ? `/api/loans?mine=1` : null;
  const { data: loans, loading: loansLoading, error: loansError, refetch: refetchLoans } = useFetch<Loan[]>(loansUrl);
  const { data: announcements, loading: annLoading } = useFetch<Announcement[]>(`/api/announcements`);
  const { data: wishlist } = useFetch<WishlistItem[]>(`/api/wishlist?mine=1`);
  const { data: recData, loading: recLoading } = useFetch<{
    recommended: BookLite[];
    hasHistory: boolean;
    label: string;
  }>(`/api/books/recommendations`);
  const recommended = recData?.recommended ?? [];
  const recLabel = recData?.label ?? "Mungkin Kamu Suka";
  const { data: settings } = useFetch<Record<string, string>>(`/api/settings`);
  const { data: myProposals, loading: proposalsLoading } = useFetch<Proposal[]>(
    variant === "teacher" ? `/api/proposals?mine=1` : null
  );
  const reservationsUrl = user?.member ? `/api/reservations?mine=1` : null;
  const { data: myReservations, refetch: refetchReservations } = useFetch<Reservation[]>(reservationsUrl);
  const showGamification = settings?.show_gamification !== "false"; // default ON

  const stats = useMemo(() => {
    const list = loans ?? [];
    const active = list.filter((l) => l.status === "LOANED" || l.status === "OVERDUE");
    const now = new Date();
    const dueSoon = active.filter((l) => {
      const days = daysBetween(new Date(l.dueDate), now);
      return days >= 0 && days <= 7;
    }).length;
    const totalFine = active.reduce((sum, l) => {
      const rule = LOAN_RULES[user?.member?.category ?? "STUDENT"] ?? LOAN_RULES.STUDENT;
      const fine = calculateFine(new Date(l.dueDate), null, rule.finePerDay);
      return sum + fine;
    }, 0);
    return {
      active: active.length,
      dueSoon,
      fine: totalFine,
      wishlistCount: wishlist?.length ?? 0,
      proposalTotal: myProposals?.length ?? 0,
      proposalPending: myProposals?.filter((p) => p.status === "PENDING").length ?? 0,
      proposalApproved: myProposals?.filter((p) => p.status === "APPROVED").length ?? 0,
      proposalRejected: myProposals?.filter((p) => p.status === "REJECTED").length ?? 0,
    };
  }, [loans, wishlist, user?.member?.category, myProposals]);

  const activeLoans = useMemo(() => {
    const list = loans ?? [];
    return list
      .filter((l) => l.status === "LOANED" || l.status === "OVERDUE")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [loans]);

  const topAnnouncements = useMemo(() => {
    const list = announcements ?? [];
    return [...list]
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      })
      .slice(0, 3);
  }, [announcements]);

  const activeReservations = useMemo(() => {
    return (myReservations ?? [])
      .filter((r) => r.status === "PENDING" || r.status === "READY")
      .sort((a, b) => (a.status === "READY" ? -1 : b.status === "READY" ? 1 : a.queueOrder - b.queueOrder));
  }, [myReservations]);

  if (!user || !user.member) {
    return (
      <div className="space-y-6">
        <div className="p-6">
          <RoleEmptyState
            context="no-active-loans"
            userRole="STUDENT"
            title="Akun Anda belum terdaftar sebagai anggota"
            description="Silakan hubungi pustakawan untuk mengaktifkan keanggotaan Anda."
            compact
          />
        </div>
      </div>
    );
  }

  const rule = LOAN_RULES[user.member.category] ?? LOAN_RULES.STUDENT;
  const firstName = user.member.fullName.split(" ")[0];
  const quotaPct = rule.maxBooks > 0 ? Math.min(100, (stats.active / rule.maxBooks) * 100) : 0;

  async function handleRenew(loan: Loan) {
    setRenewingId(loan.id);
    try {
      const updated = await api.put<Loan>(`/api/loans/${loan.id}/renew`, {});
      toast.success(`"${updated.bookItem.book.title}" berhasil diperpanjang hingga ${formatDate(updated.dueDate)}.`);
      refetchLoans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperpanjang peminjaman");
    } finally {
      setRenewingId(null);
    }
  }

  async function handleCancelReservation(reservation: Reservation) {
    setCancellingId(reservation.id);
    try {
      await api.put("/api/reservations", { id: reservation.id, action: "cancel" });
      toast.success(`Reservasi "${reservation.book.title}" dibatalkan.`);
      refetchReservations();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membatalkan reservasi");
    } finally {
      setCancellingId(null);
    }
  }

  function dueCountdown(dueDate: string): { text: string; tone: "ok" | "warn" | "danger" } {
    const now = new Date();
    const diff = daysBetween(new Date(dueDate), now);
    if (diff < 0) {
      const overdueDays = Math.abs(diff);
      return { text: `Terlambat ${overdueDays} hari`, tone: "danger" };
    }
    if (diff === 0) return { text: "Jatuh tempo hari ini", tone: "warn" };
    if (diff <= 3) return { text: `Jatuh tempo dalam ${diff} hari`, tone: "warn" };
    return { text: `Jatuh tempo dalam ${diff} hari`, tone: "ok" };
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card className="relative overflow-hidden border-0 p-6 sm:p-8 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${ROLE_COLORS[user.member.category] ?? ""} border-0`}>
                {ROLE_LABELS[user.member.category] ?? user.member.category}
              </Badge>
              <RoleBadge user={user} showIcon={false} className="bg-white/20 text-white border-white/30" />
              <span className="text-xs font-mono bg-white/15 px-2 py-0.5 rounded-md text-white/90">
                {user.member.memberNumber}
              </span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                {greetingByTime()}, {firstName}!
              </h1>
              <p className="text-sm text-primary-foreground/80 mt-1.5 max-w-md">
                {LIBRARY_TAGLINE}. Kelola peminjaman & jelajahi koleksi {LIBRARY_NAME} di sini.
              </p>
            </div>
          </div>

          {/* Quota card */}
          <div className="lg:w-80 shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm p-4 border border-white/20">
            <div className="flex items-center justify-between text-xs text-primary-foreground/90 mb-2">
              <span className="font-medium">Kuota Peminjaman</span>
              <span className="font-mono">
                {stats.active} / {rule.maxBooks} buku
              </span>
            </div>
            <Progress
              value={quotaPct}
              className="h-2.5 bg-white/20 [&>[data-slot=progress-indicator]]:bg-white"
            />
            <p className="text-[11px] text-primary-foreground/80 mt-2">
              {stats.active === 0
                ? "Anda belum meminjam buku apapun."
                : quotaPct >= 100
                ? "Kuota penuh. Kembalikan buku untuk meminjam lagi."
                : `Masih bisa meminjam ${Math.max(0, rule.maxBooks - stats.active)} buku lagi.`}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Sedang Dipinjam"
          value={loansLoading ? "..." : stats.active}
          icon={BookOpen}
          color="bg-sky-100 text-sky-700"
          subtitle={`Maks. ${rule.maxBooks} buku`}
        />
        <StatCard
          label="Jatuh Tempo Minggu Ini"
          value={loansLoading ? "..." : stats.dueSoon}
          icon={Clock}
          color="bg-amber-100 text-amber-700"
          subtitle="Segera kembalikan"
        />
        <StatCard
          label="Denda"
          value={loansLoading ? "..." : formatRupiah(stats.fine)}
          icon={Wallet}
          color={stats.fine > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
          subtitle={stats.fine > 0 ? "Segera lunasi" : "Tidak ada denda"}
        />
        <StatCard
          label="Wishlist"
          value={stats.wishlistCount}
          icon={BookHeart}
          color="bg-violet-100 text-violet-700"
          subtitle="Buku favorit"
        />
      </div>

      {/* ===== ROLE-SPECIFIC SECTIONS (Fix #6) ===== */}
      {variant === "teacher" ? (
        <TeacherSections
          proposals={myProposals}
          proposalsLoading={proposalsLoading}
          stats={stats}
          setView={setView}
        />
      ) : (
        <StudentSections
          recommended={recommended}
          recLoading={recLoading}
          setView={setView}
        />
      )}

      {/* ===== Two-column: Active loans + Announcements ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active loans */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Buku Sedang Dipinjam
            </h2>
            {activeLoans.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("my-loans")}>
                Lihat Semua
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {loansLoading ? (
            <Card className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-24 w-16 rounded bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </Card>
          ) : loansError ? (
            <Card className="p-6 text-center text-sm text-destructive">
              Gagal memuat peminjaman: {loansError}
            </Card>
          ) : activeLoans.length === 0 ? (
            <RoleEmptyState
              context="no-active-loans"
              userRole={variant}
              compact
            />
          ) : (
            <div className="space-y-3">
              {activeLoans.map((loan) => {
                const book = loan.bookItem.book;
                const countdown = dueCountdown(loan.dueDate);
                const isOverdue = countdown.tone === "danger";
                const ruleForUser = LOAN_RULES[user.member!.category] ?? LOAN_RULES.STUDENT;
                const fine = calculateFine(new Date(loan.dueDate), null, ruleForUser.finePerDay);
                const canRenew = loan.renewedCount < ruleForUser.maxRenewals;

                return (
                  <Card
                    key={loan.id}
                    className={`p-4 ${isOverdue ? "border-red-200 bg-red-50/50 dark:bg-red-950/10" : ""}`}
                  >
                    <div className="flex gap-4">
                      <button
                        onClick={() => setView("book-detail", { id: book.id })}
                        className="shrink-0 w-16 sm:w-20"
                        aria-label={`Lihat detail ${book.title}`}
                      >
                        <BookCover title={book.title} author={book.author} color={book.coverColor} coverImage={book.coverImage} size="sm" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <button
                              onClick={() => setView("book-detail", { id: book.id })}
                              className="text-left font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-2"
                            >
                              {book.title}
                            </button>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{book.author}</p>
                          </div>
                          {loan.renewedCount > 0 && (
                            <Badge variant="outline" className="shrink-0 text-[10px] py-0">
                              <RotateCw className="h-3 w-3 mr-1" />
                              {loan.renewedCount}x
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          <span className="text-muted-foreground">
                            Jatuh tempo: <span className="font-medium text-foreground">{formatDateShort(loan.dueDate)}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              isOverdue
                                ? "border-red-200 bg-red-100 text-red-700"
                                : countdown.tone === "warn"
                                ? "border-amber-200 bg-amber-100 text-amber-700"
                                : "border-emerald-200 bg-emerald-100 text-emerald-700"
                            }
                          >
                            {isOverdue ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                            {countdown.text}
                          </Badge>
                        </div>

                        {isOverdue && fine > 0 && (
                          <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                            Denda: {formatRupiah(fine)}
                          </p>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isOverdue ? "destructive" : "outline"}
                            className="h-8"
                            disabled={renewingId === loan.id || !canRenew}
                            onClick={() => handleRenew(loan)}
                          >
                            {renewingId === loan.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCw className="h-3.5 w-3.5" />
                            )}
                            Perpanjang
                          </Button>
                          {!canRenew && (
                            <span className="text-[11px] text-muted-foreground">Batas perpanjangan tercapai</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Announcements + mini card */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Pengumuman Terbaru
            </h2>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("announcements")}>
              Lihat Semua
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {annLoading ? (
            <Card className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                </div>
              ))}
            </Card>
          ) : topAnnouncements.length === 0 ? (
            <RoleEmptyState
              context="no-announcements"
              userRole={variant}
              compact
            />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
              {topAnnouncements.map((ann) => (
                <Card
                  key={ann.id}
                  className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    ann.isPinned ? "border-primary/40 bg-primary/5" : ""
                  }`}
                  onClick={() => setView("announcements")}
                >
                  <div className="flex items-start gap-2">
                    {ann.isPinned && (
                      <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{ann.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {ann.content}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {formatDateShort(ann.publishedAt)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Mini member card preview */}
          <Card
            className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => setView("my-card")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Kartu Anggota Saya</p>
                <p className="text-sm font-semibold truncate">{user.member.fullName}</p>
                <p className="text-xs text-muted-foreground font-mono">{user.member.memberNumber}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </div>
      </div>

      {/* Reservasi Saya */}
      {activeReservations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Reservasi Saya
            </h2>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("my-loans")}>
              Lihat Semua
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeReservations.map((r) => (
              <Card
                key={r.id}
                className={`p-4 ${r.status === "READY" ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}
              >
                <div className="flex gap-3">
                  <button
                    onClick={() => setView("book-detail", { id: r.book.id })}
                    className="shrink-0"
                    aria-label={`Lihat detail ${r.book.title}`}
                  >
                    <BookCover title={r.book.title} author={r.book.author} color={r.book.coverColor} coverImage={r.book.coverImage} size="sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setView("book-detail", { id: r.book.id })}
                      className="text-left font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-2"
                    >
                      {r.book.title}
                    </button>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.book.author}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {r.status === "READY" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Siap Diambil
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          <Hourglass className="h-3 w-3 mr-1" />
                          Mengantre #{r.queueOrder}
                        </Badge>
                      )}
                    </div>
                    {r.status === "READY" && r.expiresAt && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Ambil sebelum {formatDateShort(r.expiresAt)}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        disabled={cancellingId === r.id}
                        onClick={() => handleCancelReservation(r)}
                      >
                        {cancellingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Batalkan
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sprint M — Reading Level, Streak Calendar, Class Leaderboard */}
      {showGamification && user.member && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ReadingLevelWidget />
          <StreakCalendarWidget />
          <ClassLeaderboardWidget />
        </div>
      )}

      {/* Gamifikasi (Tahap 8A) — conditional render berdasarkan toggle settings */}
      {showGamification && user.member && (
        <GamificationSection memberId={user.member.id} />
      )}
    </div>
  );
}

// ============================================================
// Teacher-specific sections (Fix #6)
// ============================================================
function TeacherSections({
  proposals,
  proposalsLoading,
  stats,
  setView,
}: {
  proposals: Proposal[] | null | undefined;
  proposalsLoading: boolean;
  stats: { proposalTotal: number; proposalPending: number; proposalApproved: number; proposalRejected: number };
  setView: (view: ViewKey, params?: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Section 1: Proposals (penugasan guru) */}
      <Card className="p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <BookPlus className="h-4 w-4 text-primary" />
            Usulan Buku Saya
          </h2>
          <Badge variant="outline" className="shrink-0">
            {proposalsLoading ? "..." : stats.proposalTotal} usulan
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Ajukan buku yang Anda butuhkan untuk pembelajaran; tinjau status usulan di sini.
        </p>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge className="border-amber-200 bg-amber-100 text-amber-700">
            <Hourglass className="h-3 w-3 mr-1" />
            {proposalsLoading ? "..." : stats.proposalPending} menunggu
          </Badge>
          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {proposalsLoading ? "..." : stats.proposalApproved} disetujui
          </Badge>
          <Badge className="border-red-200 bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            {proposalsLoading ? "..." : stats.proposalRejected} ditolak
          </Badge>
        </div>

        {/* Recent proposals list */}
        {proposals && proposals.length > 0 ? (
          <div className="space-y-2 mb-4">
            {proposals.slice(0, 3).map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.title || p.bookTitle || "Usulan Buku"}</p>
                  {p.reason && (
                    <p className="text-muted-foreground line-clamp-1">{p.reason}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    p.status === "PENDING"
                      ? "border-amber-200 text-amber-700"
                      : p.status === "APPROVED"
                      ? "border-emerald-200 text-emerald-700"
                      : "border-red-200 text-red-700"
                  }
                >
                  {p.status === "PENDING" ? "Menunggu" : p.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                </Badge>
              </div>
            ))}
          </div>
        ) : !proposalsLoading ? (
          <div className="mb-4">
            <RoleEmptyState
              context="no-proposals"
              userRole="TEACHER"
              compact
              className="border-dashed"
            />
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setView("proposals")}>
            <BookPlus className="h-3.5 w-3.5" />
            Ajukan Usulan
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setView("proposals")}>
            Riwayat
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>

      {/* Section 2: Digital collection (katalog digital) */}
      <Card
        className="p-5 hover:shadow-md transition-shadow cursor-pointer group flex flex-col"
        onClick={() => setView("catalog")}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Library className="h-4 w-4 text-primary" />
            Koleksi Digital & Referensi Mengajar
          </h2>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 flex-1">
          Jelajahi katalog perpustakaan termasuk buku digital dari sumber resmi (SIBI)
          untuk menunjang kegiatan belajar mengajar Anda.
        </p>
        <Button size="sm" variant="outline" className="h-8 gap-1 mt-3 self-start" onClick={() => setView("catalog")}>
          Buka Katalog
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Card>
    </div>
  );
}

// ============================================================
// Student-specific sections (Fix #6)
// ============================================================
function StudentSections({
  recommended,
  recLoading,
  setView,
}: {
  recommended: BookLite[];
  recLoading: boolean;
  setView: (view: ViewKey, params?: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Section 1: Rekomendasi (untuk siswa) */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Rekomendasi Untukmu
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setView("catalog")}
          >
            Lihat Katalog
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        {recLoading ? (
          <Spinner />
        ) : recommended && recommended.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-3 -mx-1 px-1">
            {recommended.slice(0, 6).map((book) => (
              <div key={book.id} className="w-32 sm:w-36 shrink-0">
                <BookCard book={book} />
              </div>
            ))}
          </div>
        ) : (
          <RoleEmptyState
            context="no-recommendations"
            userRole="STUDENT"
            compact
            className="border-dashed"
          />
        )}
      </Card>

      {/* Section 2: Tantangan Membaca (placeholder untuk gamification) */}
      <Card className="p-5 bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/20 dark:to-pink-950/20 border-violet-200/50">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-600" />
              Tantangan Baca Mingguan
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Raih badge dengan meminjam dan menyelesaikan bacaan. Cek progres kamu di
              bagian <span className="font-medium text-foreground">Gamifikasi</span> di bawah.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setView("catalog")}>
                <TrendingUp className="h-3.5 w-3.5" />
                Mulai Baca
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: Teman Sekelas (placeholder) */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-sky-600" />
            Teman Sekelas yang Aktif
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setView("members")}
          >
            Lihat
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Leaderboard teman sekelas akan tersedia setelah ada cukup data peminjaman.
        </p>
        <RoleEmptyState
          context="no-classmates"
          userRole="STUDENT"
          compact
          className="border-dashed mt-3"
        />
      </Card>
    </div>
  );
}
