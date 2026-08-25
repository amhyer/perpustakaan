"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ScrollText,
  Search,
  ShieldAlert,
  User,
  BookOpen,
  ArrowRightLeft,
  Megaphone,
  Settings,
  AlertTriangle,
  Loader2,
  Download,
  FileSpreadsheet,
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
import { AUDIT_ACTIONS } from "@/lib/audit";
import {
  ROLE_LABELS,
  formatDateShort,
} from "@/lib/constants";

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const ACTION_CATEGORIES: Record<string, { label: string; icon: typeof ScrollText; color: string }> = {
  LOAN_CREATE: { label: "Peminjaman", icon: ArrowRightLeft, color: "bg-blue-100 text-blue-700 border-blue-200" },
  LOAN_RETURN: { label: "Pengembalian", icon: ArrowRightLeft, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  LOAN_RENEW: { label: "Perpanjangan", icon: ArrowRightLeft, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  LOAN_DELETE: { label: "Hapus Peminjaman", icon: AlertTriangle, color: "bg-red-100 text-red-700 border-red-200" },
  FINE_PAY: { label: "Pembayaran Denda", icon: ArrowRightLeft, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  RESERVATION_CREATE: { label: "Reservasi", icon: BookOpen, color: "bg-violet-100 text-violet-700 border-violet-200" },
  RESERVATION_FULFILL: { label: "Reservasi Diambil", icon: BookOpen, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  RESERVATION_CANCEL: { label: "Reservasi Dibatalkan", icon: BookOpen, color: "bg-orange-100 text-orange-700 border-orange-200" },
  MEMBER_CREATE: { label: "Anggota Baru", icon: User, color: "bg-blue-100 text-blue-700 border-blue-200" },
  MEMBER_UPDATE: { label: "Update Anggota", icon: User, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  MEMBER_DEACTIVATE: { label: "Nonaktifkan Anggota", icon: User, color: "bg-red-100 text-red-700 border-red-200" },
  MEMBER_IMPORT: { label: "Import Anggota", icon: User, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  BOOK_CREATE: { label: "Buku Baru", icon: BookOpen, color: "bg-blue-100 text-blue-700 border-blue-200" },
  BOOK_UPDATE: { label: "Update Buku", icon: BookOpen, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  BOOK_DELETE: { label: "Hapus Buku", icon: AlertTriangle, color: "bg-red-100 text-red-700 border-red-200" },
  BOOK_IMPORT: { label: "Import Buku", icon: BookOpen, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  PROPOSAL_CREATE: { label: "Usulan Buku", icon: BookOpen, color: "bg-violet-100 text-violet-700 border-violet-200" },
  PROPOSAL_REVIEW: { label: "Review Usulan", icon: BookOpen, color: "bg-amber-100 text-amber-700 border-amber-200" },
  SETTING_CHANGE: { label: "Ubah Pengaturan", icon: Settings, color: "bg-gray-100 text-gray-700 border-gray-200" },
  ANNOUNCEMENT_CREATE: { label: "Pengumuman Baru", icon: Megaphone, color: "bg-blue-100 text-blue-700 border-blue-200" },
  ANNOUNCEMENT_UPDATE: { label: "Update Pengumuman", icon: Megaphone, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  ANNOUNCEMENT_DELETE: { label: "Hapus Pengumuman", icon: AlertTriangle, color: "bg-red-100 text-red-700 border-red-200" },
  REPORT_DAMAGE: { label: "Lapor Kerusakan", icon: AlertTriangle, color: "bg-orange-100 text-orange-700 border-orange-200" },
  BATCH_CHECKOUT: { label: "Peminjaman Massal", icon: ArrowRightLeft, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  BATCH_RETURN: { label: "Pengembalian Massal", icon: ArrowRightLeft, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

const ENTITY_LABELS: Record<string, string> = {
  Loan: "Peminjaman",
  Reservation: "Reservasi",
  Member: "Anggota",
  Book: "Buku",
  BookItem: "Eksemplar",
  Setting: "Pengaturan",
  Announcement: "Pengumuman",
  BookProposal: "Usulan Buku",
  ConditionLog: "Kondisi Buku",
};

const TAB_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "loan", label: "Peminjaman" },
  { value: "member", label: "Anggota" },
  { value: "book", label: "Buku" },
  { value: "reservation", label: "Reservasi" },
  { value: "system", label: "Sistem" },
];

const LOAN_ACTIONS = ["LOAN_CREATE", "LOAN_RETURN", "LOAN_RENEW", "LOAN_DELETE", "FINE_PAY", "BATCH_CHECKOUT", "BATCH_RETURN"];
const MEMBER_ACTIONS = ["MEMBER_CREATE", "MEMBER_UPDATE", "MEMBER_DEACTIVATE", "MEMBER_IMPORT"];
const BOOK_ACTIONS = ["BOOK_CREATE", "BOOK_UPDATE", "BOOK_DELETE", "BOOK_IMPORT", "REPORT_DAMAGE"];
const RESERVATION_ACTIONS = ["RESERVATION_CREATE", "RESERVATION_FULFILL", "RESERVATION_CANCEL"];

function getActionCategory(action: string) {
  return ACTION_CATEGORIES[action] ?? { label: AUDIT_ACTIONS[action as keyof typeof AUDIT_ACTIONS] ?? action, icon: ScrollText, color: "bg-muted text-muted-foreground" };
}

export function AuditLogView() {
  const user = useAppStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: "audit" });
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export gagal" }));
        toast.error(`Export gagal: ${err.error || res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
      const filename = filenameMatch?.[1] || `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (user?.role !== "LIBRARIAN") {
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

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "20");
  if (search) params.set("q", search);
  if (entityFilter) params.set("entityType", entityFilter);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (actionFilter) {
    params.set("action", actionFilter);
  } else if (tab !== "all") {
    let actions: string[] = [];
    if (tab === "loan") actions = LOAN_ACTIONS;
    else if (tab === "member") actions = MEMBER_ACTIONS;
    else if (tab === "book") actions = BOOK_ACTIONS;
    else if (tab === "reservation") actions = RESERVATION_ACTIONS;
    else if (tab === "system") {
      actions = ["SETTING_CHANGE", "ANNOUNCEMENT_CREATE", "ANNOUNCEMENT_UPDATE", "ANNOUNCEMENT_DELETE"];
    }
    if (actions.length === 1) params.set("action", actions[0]);
  }

  const { data, loading } = useFetch<{
    data: AuditLogItem[];
    total: number;
    totalPages: number;
  }>(`/api/audit-log?${params.toString()}`, {
    deps: [page, search, tab, actionFilter],
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div>
      <PageHeader
        title="Jejak Aktivitas"
        description="Riwayat semua tindakan di sistem perpustakaan"
        icon={ScrollText}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={ArrowRightLeft}
          label="Total Aktivitas"
          value={total}
          color="blue"
        />
        <StatCard
          icon={User}
          label="Pengguna Aktif"
          value={new Set(logs.map((l) => l.user.id)).size}
          color="emerald"
        />
        <StatCard
          icon={ScrollText}
          label="Jenis Tindakan"
          value={new Set(logs.map((l) => l.action)).size}
          color="violet"
        />
        <StatCard
          icon={BookOpen}
          label="Entitas Terdampak"
          value={logs.filter((l) => l.entityId).length}
          color="amber"
        />
      </div>

      <Card className="p-0">
        <div className="border-b px-4 pt-4 pb-0">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari tindakan, pengguna, atau detail..."
                className="pl-9"
              />
            </div>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="">Semua Entitas</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              placeholder="Dari"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              placeholder="Sampai"
            />
            {(entityFilter || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => { setEntityFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}>
                Reset
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleExport}
                disabled={exporting}
                title="Export jejak audit ke CSV"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                )}
                Export CSV
              </Button>
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setActionFilter(""); setPage(1); }}>
            <TabsList>
              {TAB_FILTERS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Belum ada jejak aktivitas"
              description="Aktivitas akan tercatat saat ada tindakan di sistem."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Waktu</TableHead>
                      <TableHead className="w-[140px]">Pengguna</TableHead>
                      <TableHead className="w-[160px]">Tindakan</TableHead>
                      <TableHead className="w-[100px]">Entitas</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const cat = getActionCategory(log.action);
                      const Icon = cat.icon;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {formatDateShort(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {(log.user?.name ?? "?").charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{log.user?.name ?? "-"}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {log.user ? (ROLE_LABELS[log.user.role] ?? log.user.role) : "-"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cat.color} variant="outline">
                              <Icon className="h-3 w-3 mr-1" />
                              {cat.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {ENTITY_LABELS[log.entityType] ?? log.entityType}
                            {log.entityId && (
                              <span className="block text-[10px] font-mono opacity-50 truncate max-w-[100px]">
                                {log.entityId}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {log.detail || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Halaman {page} dari {totalPages} ({total} aktivitas)
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
