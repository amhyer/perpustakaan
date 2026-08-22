"use client";

import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Library,
  Wallet,
  AlertTriangle,
  Activity,
  Award,
  Crown,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { PageHeader } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { formatRupiah, formatDate } from "@/lib/constants";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface ExecutiveData {
  summary: {
    totalBooks: number;
    totalItems: number;
    itemsAddedYear: number;
    totalMembers: number;
    activeMembers: number;
    studentMembers: number;
    teacherMembers: number;
    newMembersYear: number;
    loansThisMonth: number;
    loansLastMonth: number;
    loanGrowth: number;
    loansThisYear: number;
    returnsThisMonth: number;
    totalOverdue: number;
    totalFineOutstanding: number;
    visitorsThisMonth: number;
    visitorsThisYear: number;
  };
  monthlyTrend: { month: string; loans: number; members: number; visitors: number }[];
  topBooks: { id: string; title: string; author: string; loanCount: number }[];
  topMembers: { id: string; fullName: string; memberNumber: string; category: string; loanCount: number }[];
}

const CHART_COLORS = ["#1e3a5f", "#2d5a3d", "#7c4a2d", "#5a3a6b", "#8b3a3a"];

export function ExecutiveDashboardView() {
  const { data, loading } = useFetch<ExecutiveData>("/api/executive");

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Eksekutif"
          description="Ringkasan eksekutif untuk kepala sekolah & stakeholder"
          icon={Sparkles}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="h-20 bg-muted rounded animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { summary, monthlyTrend, topBooks, topMembers } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Eksekutif"
        description="Ringkasan eksekutif untuk kepala sekolah & stakeholder. Update: real-time"
        icon={Sparkles}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.totalItems.toLocaleString("id-ID")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Eksemplar</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {summary.totalBooks} judul • +{summary.itemsAddedYear} tahun ini
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.activeMembers.toLocaleString("id-ID")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Anggota Aktif</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {summary.studentMembers} siswa • {summary.teacherMembers} guru
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Library className="h-5 w-5" />
            </div>
            {summary.loanGrowth !== 0 && (
              <Badge variant={summary.loanGrowth > 0 ? "default" : "destructive"} className="text-[10px]">
                {summary.loanGrowth > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {summary.loanGrowth > 0 ? "+" : ""}
                {summary.loanGrowth}%
              </Badge>
            )}
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.loansThisMonth.toLocaleString("id-ID")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Peminjaman Bulan Ini</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {summary.loansThisYear.toLocaleString("id-ID")} total tahun ini
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.visitorsThisMonth.toLocaleString("id-ID")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Kunjungan Bulan Ini</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {summary.visitorsThisYear.toLocaleString("id-ID")} tahun ini
          </p>
        </Card>
      </div>

      {/* Tren Chart */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Tren 12 Bulan Terakhir</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="loans" stroke="#1e3a5f" strokeWidth={2} name="Peminjaman" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="members" stroke="#2d5a3d" strokeWidth={2} name="Anggota Baru" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="visitors" stroke="#7c4a2d" strokeWidth={2} name="Kunjungan" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Two columns: Top Books + Top Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Books */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-amber-600" />
            <h2 className="font-semibold text-foreground">Buku Terpopuler</h2>
          </div>
          {topBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data peminjaman.</p>
          ) : (
            <div className="space-y-3">
              {topBooks.map((b, i) => (
                <div key={b.id} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.author}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {b.loanCount}x pinjam
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Members */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-foreground">Peminjam Paling Aktif</h2>
          </div>
          {topMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data.</p>
          ) : (
            <div className="space-y-3">
              {topMembers.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm shrink-0"
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.memberNumber} • {m.classGrade || m.category}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {m.loanCount}x
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Alert Cards */}
      {(summary.totalOverdue > 0 || summary.totalFineOutstanding > 0) && (
        <Card className="p-5 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Perhatian Diperlukan</h3>
              <ul className="text-sm text-amber-800 mt-2 space-y-1">
                {summary.totalOverdue > 0 && (
                  <li>• {summary.totalOverdue} buku terlambat dikembalikan</li>
                )}
                {summary.totalFineOutstanding > 0 && (
                  <li>• Total denda tertunggak: {formatRupiah(summary.totalFineOutstanding)}</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center italic">
        Dashboard ini di-generate otomatis dari data live sistem. Periode: {formatDate(data.period.startOfYear)} – sekarang.
      </p>
    </div>
  );
}
