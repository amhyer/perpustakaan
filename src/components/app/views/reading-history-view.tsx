"use client";

import { useMemo, useState } from "react";
import {
  History,
  BookOpen,
  CalendarDays,
  TrendingUp,
  Download,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { Button } from "@/components/ui/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { BookCover } from "@/components/app/shared/book-cover";
import { Spinner } from "@/components/app/shared/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/store/use-app-store";
import { formatDateShort, daysBetween } from "@/lib/constants";
import { toast } from "sonner";

interface ReadingLoan {
  id: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  fineAmount: number;
  bookItem: {
    book: {
      id: string;
      title: string;
      author: string;
      coverColor: string;
      coverImage: string | null;
      category: { id: string; name: string } | null;
    };
  };
}

interface ReadingStats {
  totalBooks: number;
  totalDays: number;
  avgDays: number;
  categoryStats: { name: string; count: number }[];
  monthlyMap: Record<string, number>;
  years: number[];
  readingPace: number;
  streak: number;
  favoriteAuthor: string | null;
}

export function ReadingHistoryView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  if (!user?.member) {
    return (
      <Card className="p-6">
        <EmptyState icon={BookOpen} title="Akses Ditolak" description="Anda belum terdaftar sebagai anggota." />
      </Card>
    );
  }

  return <ReadingHistoryContent />;
}

function ReadingHistoryContent() {
  const [year, setYear] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const setView = useAppStore((s) => s.setView);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (year !== "all") params.set("year", year);
    if (catFilter !== "all") params.set("category", catFilter);
    const qs = params.toString();
    return `/api/loans/history${qs ? `?${qs}` : ""}`;
  }, [year, catFilter]);

  const { data, loading, error } = useFetch<{ loans: ReadingLoan[]; stats: ReadingStats }>(url, { deps: [url] });

  const loans = data?.loans ?? [];
  const stats = data?.stats;

  // Get available categories from data
  const categories = useMemo(() => {
    if (!stats) return [];
    return stats.categoryStats.map((c) => c.name);
  }, [stats]);

  function handleExportCSV() {
    const rows = [
      ["Judul", "Pengarang", "Kategori", "Tgl Pinjam", "Tgl Kembali", "Durasi (hari)"],
      ...loans.map((l) => {
        const days = l.returnDate ? daysBetween(new Date(l.loanDate), new Date(l.returnDate)) : 0;
        return [
          l.bookItem.book.title,
          l.bookItem.book.author,
          l.bookItem.book.category?.name || "",
          formatDateShort(l.loanDate),
          l.returnDate ? formatDateShort(l.returnDate) : "",
          String(days),
        ];
      }),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riwayat-baca-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV riwayat baca berhasil diekspor.");
  }

  return (
    <div>
      <PageHeader
        title="Riwayat Baca"
        description="Buku-buku yang sudah Anda kembalikan"
        icon={History}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Total Buku Dibaca"
          value={stats?.totalBooks ?? 0}
          icon={BookOpen}
          color="bg-sky-100 text-sky-700"
        />
        <StatCard
          label="Rata-rata Durasi"
          value={stats ? `${stats.avgDays} hari` : "0 hari"}
          icon={CalendarDays}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label="Kategori Favorit"
          value={stats?.categoryStats?.[0]?.name ?? "—"}
          icon={BarChart3}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Pace Membaca"
          value={stats ? `${stats.readingPace}/bln` : "0/bln"}
          icon={TrendingUp}
          color="bg-purple-100 text-purple-700"
          subtitle="Buku/bulan (12 bln)"
        />
        <StatCard
          label="Streak Membaca"
          value={stats?.streak ?? 0}
          icon={TrendingUp}
          color={stats && stats.streak >= 3 ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}
          subtitle={`Bulan berturut-turut`}
        />
        <StatCard
          label="Pengarang Favorit"
          value={stats?.favoriteAuthor ?? "—"}
          icon={BookOpen}
          color="bg-rose-100 text-rose-700"
        />
      </div>

      {/* Monthly reading chart (Tahap 32) */}
      {stats && Object.keys(stats.monthlyMap).length > 0 && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Buku per Bulan</h3>
          </div>
          <div className="flex items-end gap-1 h-32">
            {Object.entries(stats.monthlyMap)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, count]) => {
                const max = Math.max(...Object.values(stats.monthlyMap));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono">{count}</span>
                    <div
                      className="w-full bg-primary/80 rounded-t-sm transition-all"
                      style={{ height: `${pct}%`, minHeight: 2 }}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {month.slice(5)}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Category breakdown */}
      {stats && stats.categoryStats.length > 0 && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Pembagian Kategori</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.categoryStats.map((cat) => {
              const pct = stats.totalBooks > 0 ? Math.round((cat.count / stats.totalBooks) * 100) : 0;
              return (
                <Badge key={cat.name} variant="outline" className="text-xs gap-1.5">
                  {cat.name}
                  <span className="text-muted-foreground">· {cat.count} ({pct}%)</span>
                </Badge>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tahun:</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {stats?.years?.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Kategori:</span>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Books list */}
      {error ? (
        <Card className="p-6 text-center text-sm text-destructive">{error}</Card>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
      ) : loans.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={History}
            title="Belum ada riwayat baca"
            description="Buku yang sudah Anda kembalikan akan muncul di sini."
            action={{ label: "Jelajahi Katalog", onClick: () => setView("catalog") }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => {
            const book = loan.bookItem.book;
            const days = loan.returnDate ? daysBetween(new Date(loan.loanDate), new Date(loan.returnDate)) : 0;
            return (
              <Card key={loan.id} className="p-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setView("book-detail", { id: book.id })}
                    className="shrink-0 w-16 sm:w-20 mx-auto sm:mx-0"
                    aria-label={`Lihat detail ${book.title}`}
                  >
                    <BookCover title={book.title} author={book.author} color={book.coverColor} coverImage={book.coverImage} size="sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setView("book-detail", { id: book.id })}
                      className="text-left font-semibold text-sm sm:text-base leading-tight hover:text-primary transition-colors line-clamp-2"
                    >
                      {book.title}
                    </button>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{book.author}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {book.category && (
                        <Badge variant="outline" className="text-[10px]">{book.category.name}</Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateShort(loan.loanDate)} → {loan.returnDate ? formatDateShort(loan.returnDate) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Durasi</div>
                    <div className="text-sm font-semibold">{days} hari</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
