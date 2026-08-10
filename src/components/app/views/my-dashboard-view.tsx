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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { BookCover } from "@/components/app/shared/book-cover";
import { BookCard, type BookWithDetails } from "@/components/app/shared/book-card";
import { Spinner } from "@/components/app/shared/loading";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
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

type BookLite = BookWithDetails;

function greetingByTime(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export function MyDashboardView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const [renewingId, setRenewingId] = useState<string | null>(null);

  const loansUrl = user?.member ? `/api/loans?mine=1` : null;
  const { data: loans, loading: loansLoading, error: loansError, refetch: refetchLoans } = useFetch<Loan[]>(loansUrl);
  const { data: announcements, loading: annLoading } = useFetch<Announcement[]>(`/api/announcements`);
  const { data: wishlist } = useFetch<WishlistItem[]>(`/api/wishlist?mine=1`);
  const { data: recommended, loading: recLoading } = useFetch<BookLite[]>(`/api/books?limit=5`);

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
    };
  }, [loans, wishlist, user?.member?.category]);

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

  if (!user || !user.member) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Beranda"
          description="Selamat datang di Perpustakaan Jendela Ilmu"
          icon={BookOpen}
        />
        <EmptyState
          icon={BookOpen}
          title="Akun Anda belum terdaftar sebagai anggota"
          description="Silakan hubungi pustakawan untuk mengaktifkan keanggotaan Anda."
        />
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

      {/* Two-column layout */}
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
            <Card className="p-6">
              <EmptyState
                icon={BookOpen}
                title="Belum ada buku dipinjam"
                description="Jelajahi katalog dan temukan bacaan menarik hari ini."
                action={{ label: "Jelajahi Katalog", onClick: () => setView("catalog") }}
              />
            </Card>
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
                        <BookCover title={book.title} author={book.author} color={book.coverColor} size="sm" />
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
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Belum ada pengumuman.
            </Card>
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

      {/* Recommended books */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Mungkin Kamu Suka
          </h2>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("catalog")}>
            Lihat Katalog
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {recLoading ? (
          <Spinner />
        ) : recommended && recommended.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-3 -mx-1 px-1">
            {recommended.map((book) => (
              <div key={book.id} className="w-36 sm:w-40 shrink-0">
                <BookCard book={book} />
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Belum ada rekomendasi buku.
          </Card>
        )}
      </div>
    </div>
  );
}
