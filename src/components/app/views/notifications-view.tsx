"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  Clock,
  Megaphone,
  CheckCheck,
  Loader2,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/constants";

type NotificationType =
  | "INFO"
  | "WARNING"
  | "OVERDUE"
  | "DUE_DATE"
  | "ANNOUNCEMENT";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  relatedId: string | null;
}

type FilterKey = "all" | "unread";

const TYPE_META: Record<
  NotificationType,
  { icon: React.ElementType; accent: string; bg: string; ring: string; label: string }
> = {
  INFO: {
    icon: Info,
    accent: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-950/40",
    ring: "ring-sky-200 dark:ring-sky-900",
    label: "Info",
  },
  WARNING: {
    icon: AlertTriangle,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    ring: "ring-amber-200 dark:ring-amber-900",
    label: "Peringatan",
  },
  OVERDUE: {
    icon: AlertCircle,
    accent: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-950/40",
    ring: "ring-red-200 dark:ring-red-900",
    label: "Terlambat",
  },
  DUE_DATE: {
    icon: Clock,
    accent: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-950/40",
    ring: "ring-orange-200 dark:ring-orange-900",
    label: "Jatuh Tempo",
  },
  ANNOUNCEMENT: {
    icon: Megaphone,
    accent: "text-primary",
    bg: "bg-primary/10",
    ring: "ring-primary/30",
    label: "Pengumuman",
  },
};

function relativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  return formatDate(then);
}

export function NotificationsView() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const { data: notifications, loading, error, refetch } = useFetch<Notification[]>(`/api/notifications`);

  const stats = useMemo(() => {
    const list = notifications ?? [];
    return {
      total: list.length,
      unread: list.filter((n) => !n.isRead).length,
    };
  }, [notifications]);

  const filtered = useMemo(() => {
    const list = notifications ?? [];
    if (filter === "unread") return list.filter((n) => !n.isRead);
    return list;
  }, [notifications, filter]);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await api.post(`/api/notifications?action=read`, { all: true });
      toast.success("Semua notifikasi ditandai dibaca.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menandai notifikasi");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleMarkRead(n: Notification) {
    if (n.isRead) return;
    setMarkingId(n.id);
    try {
      await api.post(`/api/notifications?action=read`, { id: n.id });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menandai notifikasi");
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifikasi"
        description="Pengingat & info terbaru untuk Anda"
        icon={Bell}
        actions={
          stats.unread > 0 ? (
            <Button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {markingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Tandai Semua Dibaca
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Notifikasi"
          value={loading ? "..." : stats.total}
          icon={Bell}
          color="bg-primary/10 text-primary"
          subtitle="Sepanjang waktu"
        />
        <StatCard
          label="Belum Dibaca"
          value={loading ? "..." : stats.unread}
          icon={AlertCircle}
          color={stats.unread > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
          subtitle={stats.unread > 0 ? "Ada yang baru" : "Semua dibaca"}
        />
        <StatCard
          label="Status"
          value={loading ? "..." : stats.unread === 0 ? "Lengkap" : `${stats.unread} baru`}
          icon={CheckCheck}
          color="bg-emerald-100 text-emerald-700"
          subtitle="Pesan masuk"
        />
      </div>

      {/* Filter */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Semua
            {stats.total > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Belum Dibaca
            {stats.unread > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-red-100 text-red-700">
                {stats.unread}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {error ? (
        <Card className="p-6 text-center text-sm text-destructive">
          Gagal memuat notifikasi: {error}
        </Card>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-1/4 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={BellOff}
            title={
              filter === "unread"
                ? "Tidak ada notifikasi belum dibaca"
                : "Tidak ada notifikasi"
            }
            description={
              filter === "unread"
                ? "Semua notifikasi sudah Anda baca. Bagus!"
                : "Saat ada pengingat jatuh tempo, pengumuman, atau info penting, notifikasi akan muncul di sini."
            }
          />
        </Card>
      ) : (
        <div className="space-y-2 max-h-[700px] overflow-y-auto scrollbar-thin pr-1">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.INFO;
            const Icon = meta.icon;
            const isMarking = markingId === n.id;

            return (
              <Card
                key={n.id}
                className={`p-4 transition-all cursor-pointer hover:shadow-md ${
                  !n.isRead ? `ring-1 ${meta.ring} ${meta.bg}` : "opacity-90"
                }`}
                onClick={() => handleMarkRead(n)}
              >
                <div className="flex gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.accent}`}
                  >
                    {isMarking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2">
                          {n.title}
                        </h3>
                        {!n.isRead && (
                          <span
                            aria-label="Belum dibaca"
                            title="Belum dibaca"
                            className="shrink-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
                          />
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] py-0 ${meta.bg} ${meta.accent} border-transparent`}
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {filtered.length > 0 && (
        <Card className="p-4 bg-muted/40">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Info className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">Tentang Notifikasi</p>
              <p className="text-muted-foreground mt-0.5">
                Klik notifikasi untuk menandainya sebagai dibaca. Notifikasi otomatis dibuat saat Anda meminjam buku, menjelang jatuh tempo, atau saat ada pengumuman baru.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
