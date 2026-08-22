"use client";

import {
  BookOpen,
  Users,
  Library,
  Activity,
  Crown,
  Award,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/app/shared/page-header";
import { RoleBadge } from "@/components/app/shared/role-badge";
import { useAppStore } from "@/store/use-app-store";
import { useFetch } from "@/hooks/use-fetch";
import { formatDate } from "@/lib/constants";
import {
  ExecutiveKpiCard,
  ExecutiveTrendChart,
  ExecutiveTopList,
  ExecutiveAlertCard,
} from "@/components/app/dashboard/widgets";

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
  topMembers: {
    id: string;
    fullName: string;
    memberNumber: string;
    category: string;
    loanCount: number;
  }[];
  period: { startOfYear: string };
}

export function ExecutiveDashboardView() {
  const user = useAppStore((s) => s.user);
  const { data, loading } = useFetch<ExecutiveData>("/api/executive");

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Eksekutif"
          description="Ringkasan eksekutif untuk kepala sekolah & stakeholder"
          icon={Sparkles}
          actions={<RoleBadge user={user} />}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-5"
            >
              <div className="h-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { summary, monthlyTrend, topBooks, topMembers } = data;

  // Map topBooks ke format ExecutiveTopList
  const topBookItems = topBooks.map((b) => ({
    id: b.id,
    primary: b.title,
    secondary: b.author,
    count: b.loanCount,
  }));

  // Map topMembers ke format ExecutiveTopList
  const topMemberItems = topMembers.map((m) => ({
    id: m.id,
    primary: m.fullName,
    secondary: `${m.memberNumber} • ${m.category}`,
    count: m.loanCount,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Eksekutif"
        description="Ringkasan eksekutif untuk kepala sekolah & stakeholder. Update: real-time"
        icon={Sparkles}
        actions={<RoleBadge user={user} />}
      />

      {/* KPI Cards — extracted to ExecutiveKpiCard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecutiveKpiCard
          icon={BookOpen}
          iconColor="bg-primary/10 text-primary"
          value={summary.totalItems}
          label="Total Eksemplar"
          footnote={`${summary.totalBooks} judul • +${summary.itemsAddedYear} tahun ini`}
        />
        <ExecutiveKpiCard
          icon={Users}
          iconColor="bg-emerald-100 text-emerald-700"
          value={summary.activeMembers}
          label="Anggota Aktif"
          footnote={`${summary.studentMembers} siswa • ${summary.teacherMembers} guru`}
        />
        <ExecutiveKpiCard
          icon={Library}
          iconColor="bg-amber-100 text-amber-700"
          value={summary.loansThisMonth}
          label="Peminjaman Bulan Ini"
          footnote={`${summary.loansThisYear.toLocaleString("id-ID")} total tahun ini`}
          growth={summary.loanGrowth}
        />
        <ExecutiveKpiCard
          icon={Activity}
          iconColor="bg-violet-100 text-violet-700"
          value={summary.visitorsThisMonth}
          label="Kunjungan Bulan Ini"
          footnote={`${summary.visitorsThisYear.toLocaleString("id-ID")} tahun ini`}
        />
      </div>

      {/* Tren Chart — extracted to ExecutiveTrendChart */}
      <ExecutiveTrendChart data={monthlyTrend} />

      {/* Top Books + Top Members — extracted to ExecutiveTopList */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExecutiveTopList
          title="Buku Terpopuler"
          icon="crown"
          iconColor="text-amber-600"
          items={topBookItems}
          countSuffix="x pinjam"
          emptyText="Belum ada data peminjaman."
        />
        <ExecutiveTopList
          title="Peminjam Paling Aktif"
          icon="award"
          iconColor="text-emerald-600"
          items={topMemberItems}
          countSuffix="x"
          emptyText="Belum ada data."
        />
      </div>

      {/* Alert Card — extracted to ExecutiveAlertCard */}
      <ExecutiveAlertCard
        totalOverdue={summary.totalOverdue}
        totalFineOutstanding={summary.totalFineOutstanding}
      />

      <p className="text-xs text-muted-foreground text-center italic">
        Dashboard ini di-generate otomatis dari data live sistem. Periode:{" "}
        {formatDate(data.period.startOfYear)} – sekarang.
      </p>
    </div>
  );
}
