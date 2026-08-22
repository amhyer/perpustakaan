"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Search,
  Info,
  AlertTriangle,
  Clock,
  AlertCircle,
  Megaphone,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/disclosure/tabs";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/store/use-app-store";
import {
  ROLE_LABELS,
  formatDateShort,
} from "@/lib/constants";

interface NotificationLogItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    member: {
      id: string;
      memberNumber: string;
      fullName: string;
      category: string;
    } | null;
  };
}

type FilterType = "all" | "INFO" | "WARNING" | "DUE_DATE" | "OVERDUE" | "ANNOUNCEMENT";

const TYPE_FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "INFO", label: "Info" },
  { key: "WARNING", label: "Peringatan" },
  { key: "DUE_DATE", label: "Jatuh Tempo" },
  { key: "OVERDUE", label: "Terlambat" },
  { key: "ANNOUNCEMENT", label: "Pengumuman" },
];

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  INFO: { label: "Info", icon: Info, className: "bg-sky-100 text-sky-700 border-sky-200" },
  WARNING: { label: "Peringatan", icon: AlertTriangle, className: "bg-amber-100 text-amber-700 border-amber-200" },
  DUE_DATE: { label: "Jatuh Tempo", icon: Clock, className: "bg-orange-100 text-orange-700 border-orange-200" },
  OVERDUE: { label: "Terlambat", icon: AlertCircle, className: "bg-red-100 text-red-700 border-red-200" },
  ANNOUNCEMENT: { label: "Pengumuman", icon: Megaphone, className: "bg-primary/10 text-primary border-primary/20" },
};

export function NotificationLogView() {
  const user = useAppStore((s) => s.user);

  if (user?.role !== "LIBRARIAN" && user?.role !== "PUSTAKAWAN_JUNIOR") {
    return (
      <Card className="p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Akses Ditolak"
          description="Halaman ini hanya tersedia untuk pustakawan."
        />
      </Card>
    );
  }

  return <NotificationLogContent />;
}

function NotificationLogContent() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("type", filter);
    if (search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `/api/notifications/log?${params.toString()}`;
  }, [filter, search, page]);

  const { data: resp, loading, error } = useFetch<{
    data: NotificationLogItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    stats: {
      totalAll: number;
      infoCount: number;
      warningCount: number;
      dueDateCount: number;
      overdueCount: number;
      announceCount: number;
      unreadCount: number;
    };
  }>(url, { deps: [url] });

  const data = resp?.data ?? [];
  const totalPages = resp?.totalPages ?? 1;
  const stats = resp?.stats;

  return (
    <div>
      <PageHeader
        title="Log Notifikasi"
        description="Riwayat semua notifikasi yang dikirim ke anggota"
        icon={Bell}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Notifikasi"
          value={stats?.totalAll ?? 0}
          icon={Bell}
          color="bg-sky-100 text-sky-700"
        />
        <StatCard
          label="Jatuh Tempo"
          value={stats?.dueDateCount ?? 0}
          icon={Clock}
          color="bg-orange-100 text-orange-700"
        />
        <StatCard
          label="Terlambat"
          value={stats?.overdueCount ?? 0}
          icon={AlertCircle}
          color="bg-red-100 text-red-700"
        />
        <StatCard
          label="Belum Dibaca"
          value={stats?.unreadCount ?? 0}
          icon={CheckCircle2}
          color="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <Tabs value={filter} onValueChange={(v) => { setFilter(v as FilterType); setPage(1); }}>
            <TabsList className="flex-wrap h-auto">
              {TYPE_FILTERS.map((f) => (
                <TabsTrigger key={f.key} value={f.key} className="text-xs">
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari anggota / judul / pesan..."
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0">
        {error ? (
          <div className="p-6 text-center text-sm text-destructive">{error}</div>
        ) : loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Tidak ada notifikasi"
            description={
              search
                ? "Tidak ada hasil yang cocok dengan pencarian."
                : "Belum ada notifikasi terkirim."
            }
          />
        ) : (
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const typeCfg = TYPE_CONFIG[item.type] ?? { label: item.type, icon: Info, className: "" };
                  const TypeIcon = typeCfg.icon;
                  const recipient = item.user.member?.fullName || item.user.name;
                  return (
                    <TableRow key={item.id} className={!item.isRead ? "bg-sky-50/40 dark:bg-sky-950/10" : ""}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{recipient}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {item.user.member?.memberNumber ?? item.user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[280px]">
                          <span className="text-sm line-clamp-1">{item.title}</span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">{item.message}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeCfg.className} variant="outline">
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateShort(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.isRead ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-amber-400 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Hal. {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Berikutnya →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
