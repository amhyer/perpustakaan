"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  FileText,
  Printer,
  Download,
  ClipboardList,
  Wallet,
  Trophy,
  UserCheck,
  BookOpen,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { Spinner } from "@/components/app/shared/loading";
import { useFetch } from "@/hooks/use-fetch";
import {
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  ROLE_LABELS,
  formatRupiah,
  formatDateShort,
} from "@/lib/constants";

// ===== Types =====
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
  overview: {
    totalBooks: number;
    totalItems: number;
    overdueFineTotal: number;
    activeLoans: number;
    overdueLoans: number;
  };
  popularBooks: Array<{
    id: string;
    title: string;
    author: string;
    loanCount: number;
  }>;
  topMembers: Array<{
    id: string;
    fullName: string;
    memberNumber: string;
    category: string;
    loanCount: number;
  }>;
  categoryStats: Array<{ name: string; count: number }>;
}

// ===== Chart palette =====
const CHART_COLORS = ["#3b5b8c", "#4a7c59", "#c99544", "#5a8fa6", "#8b5a9e"];
const STATUS_COLORS: Record<string, string> = {
  LOANED: "#3b5b8c",
  RETURNED: "#4a7c59",
  OVERDUE: "#c14a4a",
};

type Period = "daily" | "monthly" | "yearly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Harian",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

// ===== Custom tooltips =====
function MonthTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
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

function StatusTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; status: string; count: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground">{p.name}</p>
      <p className="text-muted-foreground mt-0.5">
        Total: <span className="font-semibold text-primary">{p.payload.count}</span>
      </p>
    </div>
  );
}

function BookTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { title: string; loanCount: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs max-w-[240px]">
      <p className="font-medium text-foreground line-clamp-2">{p.payload.title}</p>
      <p className="text-muted-foreground mt-0.5">
        Peminjaman: <span className="font-semibold text-primary">{p.payload.loanCount}</span>
      </p>
    </div>
  );
}

// ===== Helper: escape CSV field =====
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ===== Main view =====
export function ReportsView() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [exporting, setExporting] = useState(false);

  const { data: stats, loading: statsLoading, error: statsError } = useFetch<StatsResponse>("/api/stats");
  const { data: loans, loading: loansLoading, error: loansError } = useFetch<Loan[]>("/api/loans");

  const loading = statsLoading || loansLoading;
  const error = statsError ?? loansError;

  // Group loans by month for the bar chart
  const monthlyData = useMemo(() => {
    const list = loans ?? [];
    const map: Record<string, number> = {};
    for (const l of list) {
      const d = new Date(l.loanDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // last 12 months
      .map(([key, count]) => {
        const [y, m] = key.split("-");
        const date = new Date(Number(y), Number(m) - 1, 1);
        return {
          key,
          label: date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
          count,
        };
      });
  }, [loans]);

  // Status distribution
  const statusData = useMemo(() => {
    const list = loans ?? [];
    const counts: Record<string, number> = { LOANED: 0, RETURNED: 0, OVERDUE: 0 };
    for (const l of list) {
      const s = counts[l.status] !== undefined ? l.status : "LOANED";
      counts[s] += 1;
    }
    return [
      { status: "LOANED", name: LOAN_STATUS_LABELS.LOANED, count: counts.LOANED },
      { status: "RETURNED", name: LOAN_STATUS_LABELS.RETURNED, count: counts.RETURNED },
      { status: "OVERDUE", name: LOAN_STATUS_LABELS.OVERDUE, count: counts.OVERDUE },
    ].filter((d) => d.count > 0);
  }, [loans]);

  // Top 5 popular books from stats
  const topBooksData = useMemo(() => {
    return (stats?.popularBooks ?? []).slice(0, 5).map((b) => ({
      title: b.title.length > 30 ? b.title.slice(0, 30) + "…" : b.title,
      fullTitle: b.title,
      loanCount: b.loanCount,
    }));
  }, [stats]);

  // Summary metrics
  const summary = useMemo(() => {
    const list = loans ?? [];
    const totalLoans = list.length;
    const totalFine = list.reduce((s, l) => s + (l.fineAmount ?? 0), 0);
    const topBook = stats?.popularBooks?.[0];
    const topMember = stats?.topMembers?.[0];
    return {
      totalLoans,
      totalFine,
      topBook: topBook ? `${topBook.title} (${topBook.loanCount}×)` : "—",
      topMember: topMember ? `${topMember.fullName} (${topMember.loanCount}×)` : "—",
    };
  }, [loans, stats]);

  // Category summary table (from stats)
  const categoryRows = useMemo(() => {
    const cats = stats?.categoryStats ?? [];
    const total = cats.reduce((s, c) => s + c.count, 0) || 1;
    return cats.map((c) => ({
      name: c.name,
      count: c.count,
      percent: Math.round((c.count / total) * 100),
    }));
  }, [stats]);

  // Filter loans for display (period affects grouping label only — keep simple)
  const displayLoans = useMemo(() => {
    const list = (loans ?? []).slice();
    // sort newest first
    list.sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime());
    if (period === "daily") {
      // last 7 days
      const cutoff = Date.now() - 7 * 86400000;
      return list.filter((l) => new Date(l.loanDate).getTime() >= cutoff);
    }
    if (period === "monthly") {
      // last 30 days
      const cutoff = Date.now() - 30 * 86400000;
      return list.filter((l) => new Date(l.loanDate).getTime() >= cutoff);
    }
    // yearly: last 365 days
    const cutoff = Date.now() - 365 * 86400000;
    return list.filter((l) => new Date(l.loanDate).getTime() >= cutoff);
  }, [loans, period]);

  function handleExportCSV() {
    if (!loans || loans.length === 0) {
      toast.error("Tidak ada data peminjaman untuk diekspor.");
      return;
    }
    setExporting(true);
    try {
      const header = [
        "Tanggal Pinjam",
        "Jatuh Tempo",
        "Tanggal Kembali",
        "Nomor Anggota",
        "Nama Anggota",
        "Kategori",
        "Kelas",
        "Judul Buku",
        "Pengarang",
        "Status",
        "Denda",
        "Denda Dibayar",
      ];
      const rows = [header];
      for (const l of loans) {
        rows.push([
          formatDateShort(l.loanDate),
          formatDateShort(l.dueDate),
          l.returnDate ? formatDateShort(l.returnDate) : "",
          l.member.memberNumber,
          l.member.fullName,
          ROLE_LABELS[l.member.category] ?? l.member.category,
          l.member.classGrade ?? "",
          l.bookItem.book.title,
          l.bookItem.book.author,
          LOAN_STATUS_LABELS[l.status] ?? l.status,
          (l.fineAmount ?? 0).toString(),
          (l.finePaid ?? 0).toString(),
        ]);
      }
      const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
      // BOM for Excel UTF-8 compatibility
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const filename = `laporan-peminjaman-${today}.csv`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`File "${filename}" berhasil diunduh.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengekspor CSV");
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Laporan & Statistik"
          description="Analisis aktivitas perpustakaan"
          icon={BarChart3}
        />
        <Spinner />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div>
        <PageHeader
          title="Laporan & Statistik"
          description="Analisis aktivitas perpustakaan"
          icon={BarChart3}
        />
        <EmptyState
          icon={BarChart3}
          title="Gagal memuat laporan"
          description={error ?? "Data tidak tersedia."}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Laporan & Statistik"
        description="Analisis aktivitas perpustakaan"
        icon={BarChart3}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="no-print"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Cetak PDF</span>
            </Button>
            <Button
              size="sm"
              className="no-print"
              onClick={handleExportCSV}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Export Excel (CSV)</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </>
        }
      />

      {/* Period selector — no-print */}
      <Card className="p-4 mb-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <p className="text-sm font-medium">Periode Tampilan</p>
            <p className="text-xs text-muted-foreground">
              Filter data tabel berdasarkan periode
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Harian (7 hari terakhir)</SelectItem>
              <SelectItem value="monthly">Bulanan (30 hari terakhir)</SelectItem>
              <SelectItem value="yearly">Tahunan (365 hari terakhir)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="print-area space-y-6">
        {/* Print-only header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Laporan & Statistik Perpustakaan</h1>
          <p className="text-sm">Periode: {PERIOD_LABELS[period]} · Dicetak: {formatDateShort(new Date())}</p>
        </div>

        {/* ===== Summary cards ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Peminjaman"
            value={summary.totalLoans}
            icon={ClipboardList}
            color="bg-primary/10 text-primary"
            subtitle="Sepanjang periode"
          />
          <StatCard
            label="Total Denda"
            value={formatRupiah(summary.totalFine)}
            icon={Wallet}
            color="bg-red-100 text-red-700"
            subtitle="Akumulasi denda"
          />
          <StatCard
            label="Buku Terpopuler"
            value={summary.topBook}
            icon={Trophy}
            color="bg-amber-100 text-amber-700"
            subtitle="Paling banyak dipinjam"
          />
          <StatCard
            label="Anggota Paling Aktif"
            value={summary.topMember}
            icon={UserCheck}
            color="bg-sky-100 text-sky-700"
            subtitle="Paling sering meminjam"
          />
        </div>

        {/* ===== Charts ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly loans bar chart */}
          <Card className="p-4 sm:p-6">
            <CardHeader className="p-0 mb-4 space-y-0">
              <CardTitle className="text-base">Peminjaman per Bulan</CardTitle>
              <CardDescription className="text-xs">
                Tren peminjaman 12 bulan terakhir
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-64 w-full">
                {monthlyData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Belum ada data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <Tooltip content={<MonthTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }} />
                      <Bar dataKey="count" name="Peminjaman" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status distribution pie */}
          <Card className="p-4 sm:p-6">
            <CardHeader className="p-0 mb-4 space-y-0">
              <CardTitle className="text-base">Distribusi Status Peminjaman</CardTitle>
              <CardDescription className="text-xs">
                Proporsi status seluruh transaksi
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-64 w-full">
                {statusData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Belum ada data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry: { name?: string; count?: number }) =>
                          `${entry.name ?? ""} (${entry.count ?? 0})`
                        }
                        labelLine={false}
                      >
                        {statusData.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<StatusTooltip />} />
                      <Legend
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-[11px] text-muted-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top 5 books horizontal bar */}
        <Card className="p-4 sm:p-6">
          <CardHeader className="p-0 mb-4 space-y-0">
            <CardTitle className="text-base">Top 5 Buku Terpopuler</CardTitle>
            <CardDescription className="text-xs">
              Buku dengan jumlah peminjaman tertinggi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-72 w-full">
              {topBooksData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Belum ada data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topBooksData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="title"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      width={150}
                    />
                    <Tooltip content={<BookTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }} />
                    <Bar dataKey="loanCount" name="Peminjaman" radius={[0, 4, 4, 0]}>
                      {topBooksData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===== Detail loan table ===== */}
        <Card className="p-0">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Detail Peminjaman
            </CardTitle>
            <CardDescription className="text-xs">
              {displayLoans.length} transaksi pada periode {PERIOD_LABELS[period].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {displayLoans.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Tidak ada data"
                description={`Tidak ada peminjaman pada periode ${PERIOD_LABELS[period].toLowerCase()}.`}
              />
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin border-t">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="min-w-[110px]">Tanggal</TableHead>
                      <TableHead>Anggota</TableHead>
                      <TableHead className="min-w-[180px]">Buku</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Denda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateShort(loan.loanDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium line-clamp-1">{loan.member.fullName}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {loan.member.memberNumber} · {ROLE_LABELS[loan.member.category] ?? loan.member.category}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium line-clamp-1 max-w-[220px]">
                              {loan.bookItem.book.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[220px]">
                              {loan.bookItem.book.author}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={LOAN_STATUS_COLORS[loan.status] ?? ""} variant="outline">
                            {LOAN_STATUS_LABELS[loan.status] ?? loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs whitespace-nowrap">
                          {(loan.fineAmount ?? 0) > 0 ? (
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {formatRupiah(loan.fineAmount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== Category summary table ===== */}
        <Card className="p-0">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Ringkasan per Kategori
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi peminjaman berdasarkan kategori buku
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {categoryRows.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Tidak ada data kategori"
                description="Belum ada peminjaman untuk dirangkum."
              />
            ) : (
              <div className="border-t overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Total Peminjaman</TableHead>
                      <TableHead className="text-right">Persentase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryRows.map((c, i) => (
                      <TableRow key={c.name}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="text-right text-sm">{c.count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="hidden sm:block w-24 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${c.percent}%`,
                                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium tabular-nums">{c.percent}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
