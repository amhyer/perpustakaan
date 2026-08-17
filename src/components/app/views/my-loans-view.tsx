"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  AlertTriangle,
  History,
  RotateCw,
  Loader2,
  BookMarked,
  Info,
  CalendarClock,
  CalendarCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { Button } from "@/components/ui/form/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/disclosure/tabs";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { BookCover } from "@/components/app/shared/book-cover";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import {
  LOAN_RULES,
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
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

type FilterKey = "active" | "overdue" | "returned";

export function MyLoansView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const [filter, setFilter] = useState<FilterKey>("active");
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const loansUrl = user?.member ? `/api/loans?mine=1` : null;
  const { data: loans, loading, error, refetch } = useFetch<Loan[]>(loansUrl);

  const stats = useMemo(() => {
    const list = loans ?? [];
    const active = list.filter((l) => l.status === "LOANED" || l.status === "OVERDUE");
    const overdue = list.filter((l) => l.status === "OVERDUE");
    return {
      active: active.length,
      overdue: overdue.length,
      total: list.length,
    };
  }, [loans]);

  const filtered = useMemo(() => {
    const list = loans ?? [];
    switch (filter) {
      case "active":
        return list
          .filter((l) => l.status === "LOANED")
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      case "overdue":
        return list
          .filter((l) => l.status === "OVERDUE")
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      case "returned":
        return list
          .filter((l) => l.status === "RETURNED")
          .sort((a, b) => new Date(b.returnDate ?? b.loanDate).getTime() - new Date(a.returnDate ?? a.loanDate).getTime());
      default:
        return list;
    }
  }, [loans, filter]);

  if (!user || !user.member) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pinjamanku"
          description="Riwayat & status peminjaman Anda"
          icon={BookMarked}
        />
        <EmptyState
          icon={BookMarked}
          title="Akun Anda belum terdaftar sebagai anggota"
          description="Silakan hubungi pustakawan untuk mengaktifkan keanggotaan Anda."
        />
      </div>
    );
  }

  const rule = LOAN_RULES[user.member.category] ?? LOAN_RULES.STUDENT;

  async function handleRenew(loan: Loan) {
    setRenewingId(loan.id);
    try {
      const updated = await api.put<Loan>(`/api/loans/${loan.id}/renew`, {});
      toast.success(`"${updated.bookItem.book.title}" berhasil diperpanjang hingga ${formatDate(updated.dueDate)}.`);
      refetch();
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

  const emptyByFilter: Record<FilterKey, { title: string; description: string }> = {
    active: {
      title: "Tidak ada buku yang sedang dipinjam",
      description: "Saat ini Anda tidak memiliki buku aktif. Jelajahi katalog untuk meminjam buku baru.",
    },
    overdue: {
      title: "Tidak ada buku terlambat",
      description: "Bagus! Anda tidak memiliki peminjaman yang terlambat.",
    },
    returned: {
      title: "Belum ada riwayat pengembalian",
      description: "Buku yang pernah Anda kembalikan akan muncul di sini.",
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pinjamanku"
        description="Riwayat & status peminjaman Anda"
        icon={BookMarked}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Sedang Dipinjam"
          value={loading ? "..." : stats.active}
          icon={BookOpen}
          color="bg-sky-100 text-sky-700"
          subtitle={`Maks. ${rule.maxBooks} buku`}
        />
        <StatCard
          label="Terlambat"
          value={loading ? "..." : stats.overdue}
          icon={AlertTriangle}
          color={stats.overdue > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
          subtitle={stats.overdue > 0 ? "Segera kembalikan" : "Aman"}
        />
        <StatCard
          label="Total Riwayat"
          value={loading ? "..." : stats.total}
          icon={History}
          color="bg-primary/10 text-primary"
          subtitle="Sepanjang waktu"
        />
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="active" className="text-xs gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Aktif
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Terlambat
          </TabsTrigger>
          <TabsTrigger value="returned" className="text-xs gap-1.5">
            <History className="h-3.5 w-3.5" />
            Riwayat
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loans list */}
      {error ? (
        <Card className="p-6 text-center text-sm text-destructive">
          Gagal memuat data: {error}
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <div className="h-24 w-16 rounded bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={BookMarked}
            title={emptyByFilter[filter].title}
            description={emptyByFilter[filter].description}
            action={
              filter === "active" || filter === "returned"
                ? { label: "Jelajahi Katalog", onClick: () => setView("catalog") }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((loan) => {
            const book = loan.bookItem.book;
            const isActive = loan.status === "LOANED";
            const isOverdue = loan.status === "OVERDUE";
            const isReturned = loan.status === "RETURNED";
            const countdown = dueCountdown(loan.dueDate);
            const canRenew =
              (isActive || isOverdue) && loan.renewedCount < rule.maxRenewals;
            const currentFine = calculateFine(
              new Date(loan.dueDate),
              isReturned ? new Date(loan.returnDate ?? loan.dueDate) : null,
              rule.finePerDay
            );

            return (
              <Card
                key={loan.id}
                className={`p-4 ${
                  isOverdue
                    ? "border-red-300 bg-red-50/60 dark:bg-red-950/15"
                    : isReturned
                    ? "opacity-90"
                    : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Cover */}
                  <button
                    onClick={() => setView("book-detail", { id: book.id })}
                    className="shrink-0 w-16 sm:w-20 mx-auto sm:mx-0"
                    aria-label={`Lihat detail ${book.title}`}
                  >
                    <BookCover title={book.title} author={book.author} color={book.coverColor} coverImage={book.coverImage} size="sm" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <button
                          onClick={() => setView("book-detail", { id: book.id })}
                          className="text-left font-semibold text-sm sm:text-base leading-tight hover:text-primary transition-colors line-clamp-2"
                        >
                          {book.title}
                        </button>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{book.author}</p>
                      </div>
                      <Badge
                        className={`${LOAN_STATUS_COLORS[loan.status] ?? ""} shrink-0`}
                        variant="outline"
                      >
                        {LOAN_STATUS_LABELS[loan.status] ?? loan.status}
                      </Badge>
                    </div>

                    {/* Dates */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-start gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Pinjam</p>
                          <p className="font-medium text-foreground">{formatDateShort(loan.loanDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CalendarCheck className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                        </CalendarCheck>
                        <div>
                          <p className="text-muted-foreground">Jatuh Tempo</p>
                          <p className={`font-medium ${isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                            {formatDateShort(loan.dueDate)}
                          </p>
                        </div>
                      </div>
                      {isReturned && loan.returnDate && (
                        <div className="flex items-start gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Dikembalikan</p>
                            <p className="font-medium text-foreground">{formatDateShort(loan.returnDate)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Countdown badge for active/overdue */}
                    {(isActive || isOverdue) && (
                      <div className="mt-3">
                        <Badge
                          variant="outline"
                          className={
                            countdown.tone === "danger"
                              ? "border-red-200 bg-red-100 text-red-700"
                              : countdown.tone === "warn"
                              ? "border-amber-200 bg-amber-100 text-amber-700"
                              : "border-emerald-200 bg-emerald-100 text-emerald-700"
                          }
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {countdown.text}
                        </Badge>
                      </div>
                    )}

                    {/* Fine info */}
                    {(isOverdue || (isReturned && (loan.fineAmount ?? 0) > 0)) && (
                      <div
                        className={`mt-3 flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                          isOverdue
                            ? "bg-red-100/70 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        <Wallet className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Denda: {formatRupiah(loan.fineAmount ?? currentFine)}
                          </p>
                          {isOverdue && (
                            <p className="mt-0.5 opacity-90">
                              Kembalikan segera untuk menghentikan akumulasi denda.
                            </p>
                          )}
                          {isReturned && (loan.finePaid ?? 0) > 0 && (
                            <p className="mt-0.5 opacity-90">Sudah dibayar: {formatRupiah(loan.finePaid ?? 0)}</p>
                          )}
                          {isReturned && (loan.fineAmount ?? 0) > 0 && (loan.finePaid ?? 0) === 0 && (
                            <p className="mt-0.5 opacity-90">Denda belum dibayar. Silakan lunasi di perpustakaan.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Renewed count */}
                    {loan.renewedCount > 0 && (
                      <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                        <RotateCw className="h-3 w-3" />
                        Sudah diperpanjang {loan.renewedCount}x (maks. {rule.maxRenewals}x)
                      </p>
                    )}

                    {/* Actions */}
                    {(isActive || isOverdue) && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
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
                        {!canRenew && (isActive || isOverdue) && (
                          <span className="text-[11px] text-muted-foreground">
                            Batas perpanjangan tercapai
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => setView("book-detail", { id: book.id })}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Lihat Buku
                        </Button>
                      </div>
                    )}

                    {isReturned && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => setView("book-detail", { id: book.id })}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Lihat Buku
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help note */}
      <Card className="p-4 bg-muted/40">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Info className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">Butuh bantuan?</p>
            <p className="text-muted-foreground mt-0.5">
              Kunjungi perpustakaan atau hubungi pustakawan untuk bantuan perpanjangan, pengembalian, atau pelunasan denda.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
