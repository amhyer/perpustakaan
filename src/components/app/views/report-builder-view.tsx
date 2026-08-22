"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  Calendar,
  X,
  Plus,
  Loader2,
  Save,
  History,
  Settings as SettingsIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Badge } from "@/components/ui/data-display/badge";
import { Checkbox } from "@/components/ui/form/checkbox";
import { Skeleton } from "@/components/app/shared/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { formatDate, formatRupiah } from "@/lib/constants";
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

type ReportType =
  | "loans-by-period"
  | "loans-by-category"
  | "loans-by-member"
  | "overdue-summary"
  | "popular-books"
  | "member-activity"
  | "fine-collection"
  | "book-condition";

interface FilterConfig {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  memberCategory?: "STUDENT" | "TEACHER" | "LIBRARIAN";
  status?: string;
  groupBy?: "day" | "week" | "month" | "category" | "member" | "book";
}

interface ReportResult {
  type: ReportType;
  totalRows: number;
  data: any[];
  summary: Record<string, any>;
}

const REPORT_TYPES: Array<{ value: ReportType; label: string; description: string; icon: any }> = [
  {
    value: "loans-by-period",
    label: "Peminjaman per Periode",
    description: "Trend peminjaman berdasarkan waktu",
    icon: Calendar,
  },
  {
    value: "loans-by-category",
    label: "Peminjaman per Kategori",
    description: "Kategori buku paling sering dipinjam",
    icon: BarChart3,
  },
  {
    value: "loans-by-member",
    label: "Peminjaman per Anggota",
    description: "Daftar anggota paling aktif",
    icon: BarChart3,
  },
  {
    value: "overdue-summary",
    label: "Ringkasan Keterlambatan",
    description: "Detail buku terlambat & denda",
    icon: FileText,
  },
  {
    value: "popular-books",
    label: "Buku Terpopuler",
    description: "Top buku paling sering dipinjam",
    icon: BarChart3,
  },
  {
    value: "member-activity",
    label: "Aktivitas Anggota",
    description: "Statistik keaktifan anggota",
    icon: FileText,
  },
  {
    value: "fine-collection",
    label: "Pendapatan Denda",
    description: "Total denda yang terkumpul",
    icon: FileText,
  },
  {
    value: "book-condition",
    label: "Kondisi Buku",
    description: "Status kondisi koleksi buku",
    icon: FileText,
  },
];

const COLORS = ["#1e3a5f", "#2d5a3d", "#7c4a2d", "#5a3a6b", "#8b3a3a", "#1f5f5b", "#3d4a2d"];

export function ReportBuilderView() {
  const user = useAppStore((s) => s.user);
  const [reportType, setReportType] = useState<ReportType>("loans-by-period");
  const [filters, setFilters] = useState<FilterConfig>({
    dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    groupBy: "day",
  });
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "pie" | "table">("bar");

  if (user?.role !== "LIBRARIAN" && user?.role !== "PUSTAKAWAN_JUNIOR") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report Builder"
          description="Buat laporan kustom sesuai kebutuhan"
          icon={FileText}
        />
        <Card className="p-6">
          <EmptyState
            icon={FileText}
            title="Akses Ditolak"
            description="Hanya pustakawan yang dapat membuat laporan."
          />
        </Card>
      </div>
    );
  }

  const runReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, String(v));
      });
      params.set("type", reportType);

      const data = await api.get<ReportResult>(`/api/reports/custom?${params.toString()}`);
      setResult(data);
      toast.success(`Laporan selesai. ${data.totalRows} baris data.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal generate laporan");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const headers = Object.keys(result.data[0] || {});
    const rows = result.data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV diunduh");
  };

  const selectedType = REPORT_TYPES.find((t) => t.value === reportType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Builder"
        description="Buat laporan kustom dengan filter fleksibel. Export ke CSV siap cetak."
        icon={FileText}
        actions={
          result && (
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Report type & filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Pilih Jenis Laporan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {REPORT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const selected = reportType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setReportType(t.value)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selected
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{t.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {t.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                2. Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="from" className="text-xs">Dari</Label>
                  <Input
                    id="from"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to" className="text-xs">Sampai</Label>
                  <Input
                    id="to"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Group By</Label>
                <Select
                  value={filters.groupBy}
                  onValueChange={(v) => setFilters({ ...filters, groupBy: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Hari</SelectItem>
                    <SelectItem value="week">Minggu</SelectItem>
                    <SelectItem value="month">Bulan</SelectItem>
                    <SelectItem value="category">Kategori</SelectItem>
                    <SelectItem value="member">Anggota</SelectItem>
                    <SelectItem value="book">Buku</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Kategori Anggota</Label>
                <Select
                  value={filters.memberCategory || "all"}
                  onValueChange={(v) =>
                    setFilters({ ...filters, memberCategory: v === "all" ? undefined : (v as any) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="STUDENT">Siswa</SelectItem>
                    <SelectItem value="TEACHER">Guru</SelectItem>
                    <SelectItem value="LIBRARIAN">Pustakawan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={runReport}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                {loading ? "Generating..." : "Generate Laporan"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : result ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">{selectedType?.label}</CardTitle>
                      <CardDescription>
                        {result.totalRows} baris · Periode {filters.dateFrom} → {filters.dateTo}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={chartType === "bar" ? "default" : "outline"}
                        onClick={() => setChartType("bar")}
                      >
                        Bar
                      </Button>
                      <Button
                        size="sm"
                        variant={chartType === "pie" ? "default" : "outline"}
                        onClick={() => setChartType("pie")}
                      >
                        Pie
                      </Button>
                      <Button
                        size="sm"
                        variant={chartType === "table" ? "default" : "outline"}
                        onClick={() => setChartType("table")}
                      >
                        Tabel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {result.data.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="Tidak ada data"
                      description="Coba ubah filter atau rentang tanggal"
                    />
                  ) : chartType === "table" ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {Object.keys(result.data[0]).map((k) => (
                              <th key={k} className="text-left p-2 font-medium capitalize">
                                {k.replace(/([A-Z])/g, " $1").trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.slice(0, 50).map((row, i) => (
                            <tr key={i} className="border-b hover:bg-muted/30">
                              {Object.values(row).map((v: any, j) => (
                                <td key={j} className="p-2">
                                  {typeof v === "number" && v > 1000 ? v.toLocaleString("id-ID") : String(v ?? "-")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.data.length > 50 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          + {result.data.length - 50} baris lainnya (export CSV untuk semua)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === "bar" ? (
                          <BarChart data={result.data.slice(0, 20)}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey={Object.keys(result.data[0])[0]}
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(255,255,255,0.95)",
                                border: "1px solid #ddd",
                                borderRadius: 6,
                                fontSize: 12,
                              }}
                            />
                            <Bar
                              dataKey={Object.keys(result.data[0]).find((k) => k !== Object.keys(result.data[0])[0]) || "count"}
                              fill="#1e3a5f"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        ) : (
                          <PieChart>
                            <Pie
                              data={result.data.slice(0, 10)}
                              dataKey={Object.keys(result.data[0]).find((k) => k !== Object.keys(result.data[0])[0]) || "count"}
                              nameKey={Object.keys(result.data[0])[0]}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={(entry: any) => entry[Object.keys(result.data[0])[0]]}
                            >
                              {result.data.slice(0, 10).map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {result.summary && Object.keys(result.summary).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ringkasan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(result.summary).map(([key, value]) => (
                        <div key={key} className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </p>
                          <p className="text-lg font-bold">
                            {typeof value === "number"
                              ? key.toLowerCase().includes("fine") || key.toLowerCase().includes("denda")
                                ? formatRupiah(value)
                                : value.toLocaleString("id-ID")
                              : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12">
                <EmptyState
                  icon={BarChart3}
                  title="Belum Ada Laporan"
                  description="Pilih jenis laporan & filter, lalu klik Generate."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
