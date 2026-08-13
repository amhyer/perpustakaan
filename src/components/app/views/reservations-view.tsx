"use client";

import { useMemo, useState } from "react";
import {
  BookMarked,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  BookOpen,
  Clock,
  CalendarClock,
  Bell,
  Hash,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { BookCover } from "@/components/app/shared/book-cover";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import {
  RESERVATION_STATUS_LABELS,
  ROLE_LABELS,
  ROLE_COLORS,
  formatDate,
  formatDateShort,
} from "@/lib/constants";

interface Reservation {
  id: string;
  memberId: string;
  bookId: string;
  status: string;
  queueOrder: number;
  reservedAt: string;
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
  member: {
    id: string;
    memberNumber: string;
    fullName: string;
    category: string;
    classGrade: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string;
    coverColor: string;
    coverImage: string | null;
  };
}

type FilterKey = "all" | "PENDING" | "READY" | "done";

const RESERVATION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  READY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FULFILLED: "bg-sky-100 text-sky-700 border-sky-200",
  CANCELLED: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
  EXPIRED: "bg-red-100 text-red-700 border-red-200",
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "PENDING", label: "Mengantre" },
  { key: "READY", label: "Siap Diambil" },
  { key: "done", label: "Selesai" },
];

type ActionTarget = { reservation: Reservation; action: "fulfill" | "cancel" };

export function ReservationsView() {
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

  return <ReservationsViewContent />;
}

function ReservationsViewContent() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const setView = useAppStore((s) => s.setView);

  const { data, loading, error, refetch } = useFetch<Reservation[]>("/api/reservations", {});

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      ready: list.filter((r) => r.status === "READY").length,
      pending: list.filter((r) => r.status === "PENDING").length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter === "PENDING") list = list.filter((r) => r.status === "PENDING");
    else if (filter === "READY") list = list.filter((r) => r.status === "READY");
    else if (filter === "done")
      list = list.filter((r) => ["FULFILLED", "CANCELLED", "EXPIRED"].includes(r.status));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.book.title.toLowerCase().includes(q) ||
          r.book.author.toLowerCase().includes(q) ||
          r.member.fullName.toLowerCase().includes(q) ||
          r.member.memberNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filter, search]);

  async function handleAction() {
    if (!actionTarget) return;
    const { reservation, action } = actionTarget;
    setActing(reservation.id);
    try {
      await api.put(`/api/reservations`, { id: reservation.id, action });
      toast.success(
        action === "fulfill"
          ? `"${reservation.book.title}" ditandai telah diambil oleh ${reservation.member.fullName}.`
          : `Reservasi "${reservation.book.title}" dibatalkan.`
      );
      setActionTarget(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses aksi");
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reservasi Buku"
        description="Kelola antrian reservasi anggota"
        icon={BookMarked}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Reservasi"
          value={loading ? "..." : stats.total}
          icon={BookMarked}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label="Siap Diambil"
          value={loading ? "..." : stats.ready}
          icon={Bell}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Mengantre"
          value={loading ? "..." : stats.pending}
          icon={Clock}
          color="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Filters + search */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <TabsList className="flex-wrap h-auto">
              {FILTERS.map((f) => (
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari buku / anggota..."
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {/* List */}
      {error ? (
        <Card className="p-6">
          <div className="text-center text-sm text-destructive">{error}</div>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <div className="w-12 h-16 rounded bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-6 w-24 rounded bg-muted animate-pulse mt-2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={BookMarked}
            title="Tidak ada reservasi"
            description={
              search
                ? "Tidak ada hasil yang cocok dengan pencarian."
                : "Belum ada reservasi untuk filter ini."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto scrollbar-thin pr-1">
          {filtered.map((r) => {
            const isReady = r.status === "READY";
            const isPending = r.status === "PENDING";
            const canCancel = isReady || isPending;
            const isExpired = r.status === "EXPIRED";
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 shrink-0">
                    <BookCover
                      title={r.book.title}
                      author={r.book.author}
                      color={r.book.coverColor}
                      size="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                      {r.book.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {r.book.author}
                    </p>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge
                        className={RESERVATION_STATUS_COLORS[r.status] ?? ""}
                        variant="outline"
                      >
                        {RESERVATION_STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                      {isPending && (
                        <Badge variant="outline" className="text-[10px]">
                          <Hash className="h-3 w-3" />
                          Antrian #{r.queueOrder}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{r.member.fullName}</span>
                        <Badge
                          className={`${ROLE_COLORS[r.member.category] ?? ""} text-[10px] py-0`}
                          variant="outline"
                        >
                          {ROLE_LABELS[r.member.category] ?? r.member.category}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.member.memberNumber}
                        {r.member.classGrade ? ` · ${r.member.classGrade}` : ""}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <CalendarClock className="h-3 w-3" />
                        Pesan: {formatDateShort(r.reservedAt)}
                      </div>
                      {isReady && r.expiresAt && (
                        <div
                          className={`flex items-center gap-1.5 ${
                            new Date(r.expiresAt) < new Date()
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : ""
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          Ambil sebelum: {formatDate(r.expiresAt)}
                        </div>
                      )}
                      {r.note && (
                        <div className="mt-1 rounded bg-muted/50 px-2 py-1 text-[11px] italic">
                          "{r.note}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setView("book-detail", { id: r.book.id })}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Lihat Buku
                  </Button>
                  {isReady && (
                    <Button
                      size="sm"
                      className="h-8 bg-emerald-600 hover:bg-emerald-700"
                      disabled={acting === r.id}
                      onClick={() => setActionTarget({ reservation: r, action: "fulfill" })}
                    >
                      {acting === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Tandai Diambil
                    </Button>
                  )}
                  {canCancel && !isExpired && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                      disabled={acting === r.id}
                      onClick={() => setActionTarget({ reservation: r, action: "cancel" })}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Batalkan
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm action dialog */}
      <AlertDialog
        open={!!actionTarget}
        onOpenChange={(o) => {
          if (!o) setActionTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === "fulfill"
                ? "Konfirmasi Pengambilan Buku"
                : "Batalkan Reservasi?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget && (
                <span className="block">
                  {actionTarget.action === "fulfill" ? (
                    <>
                      Tandai bahwa{" "}
                      <b className="text-foreground">{actionTarget.reservation.member.fullName}</b>{" "}
                      telah mengambil{" "}
                      <b className="text-foreground">"{actionTarget.reservation.book.title}"</b>?
                      Pastikan anggota telah meminjam buku ini di sirkulasi.
                    </>
                  ) : (
                    <>
                      Batalkan reservasi{" "}
                      <b className="text-foreground">"{actionTarget.reservation.book.title}"</b> atas
                      nama <b className="text-foreground">{actionTarget.reservation.member.fullName}</b>?
                      Eksemplar yang ditahan akan dikembalikan menjadi tersedia.
                    </>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting === actionTarget?.reservation.id}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={acting === actionTarget?.reservation.id}
              className={
                actionTarget?.action === "cancel"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }
            >
              {acting === actionTarget?.reservation.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : actionTarget?.action === "fulfill" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {actionTarget?.action === "fulfill" ? "Ya, Tandai Diambil" : "Ya, Batalkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
