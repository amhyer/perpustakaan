"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Search,
  RotateCcw,
  Loader2,
  AlertTriangle,
  BookCheck,
  Clock,
  User,
  BookOpen,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import {
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  ROLE_LABELS,
  formatRupiah,
  formatDateShort,
  formatDate,
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

type FilterKey = "all" | "active" | "overdue" | "returned";

const FILTERS: { key: FilterKey; label: string; param: string }[] = [
  { key: "all", label: "Semua", param: "" },
  { key: "active", label: "Aktif", param: "status=LOANED" },
  { key: "overdue", label: "Terlambat", param: "overdue=1" },
  { key: "returned", label: "Dikembalikan", param: "status=RETURNED" },
];

export function LoansView() {
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

  return <LoansViewContent />;
}

function LoansViewContent() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [returnTarget, setReturnTarget] = useState<Loan | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const setView = useAppStore((s) => s.setView);

  const activeParam = FILTERS.find((f) => f.key === filter)?.param ?? "";
  const url = `/api/loans${activeParam ? `?${activeParam}` : ""}`;

  // Fetch all loans for stats (we use the "all" data for counts)
  const { data: allLoans, loading: allLoading } = useFetch<Loan[]>("/api/loans", {});
  const { data, loading, error, refetch } = useFetch<Loan[]>(url, {
    deps: [filter],
  });

  const stats = useMemo(() => {
    const list = allLoans ?? [];
    return {
      total: list.length,
      active: list.filter((l) => l.status === "LOANED" || l.status === "OVERDUE").length,
      overdue: list.filter((l) => l.status === "OVERDUE").length,
    };
  }, [allLoans]);

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (l) =>
        l.member.fullName.toLowerCase().includes(q) ||
        l.member.memberNumber.toLowerCase().includes(q) ||
        l.bookItem.book.title.toLowerCase().includes(q) ||
        l.bookItem.book.author.toLowerCase().includes(q)
    );
  }, [data, search]);

  async function handleReturn() {
    if (!returnTarget) return;
    setReturning(returnTarget.id);
    try {
      const res = await api.put<{
        loan: Loan;
        fine: number;
        nextReservation: { id: string; member: { fullName: string } } | null;
      }>(`/api/loans/${returnTarget.id}/return`, {});
      const fine = res.fine ?? 0;
      const title = res.loan.bookItem.book.title;
      if (fine > 0) {
        toast.success(`"${title}" dikembalikan. Denda: ${formatRupiah(fine)}.`);
      } else {
        toast.success(`"${title}" berhasil dikembalikan.`);
      }
      if (res.nextReservation) {
        toast.info(`Reservasi oleh ${res.nextReservation.member.fullName} kini siap diambil.`);
      }
      setReturnTarget(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses pengembalian");
    } finally {
      setReturning(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Data Peminjaman"
        description="Riwayat & status peminjaman semua anggota"
        icon={ClipboardList}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Peminjaman"
          value={allLoading ? "..." : stats.total}
          icon={BookOpen}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label="Sedang Dipinjam"
          value={allLoading ? "..." : stats.active}
          icon={Clock}
          color="bg-sky-100 text-sky-700"
        />
        <StatCard
          label="Terlambat"
          value={allLoading ? "..." : stats.overdue}
          icon={AlertTriangle}
          color="bg-red-100 text-red-700"
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
              placeholder="Cari anggota / buku..."
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
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Tidak ada data peminjaman"
            description={
              search
                ? "Tidak ada hasil yang cocok dengan pencarian."
                : "Belum ada peminjaman untuk filter ini."
            }
          />
        ) : (
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Anggota</TableHead>
                  <TableHead>Buku</TableHead>
                  <TableHead>Tgl Pinjam</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Kembali</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Denda</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((loan) => {
                  const isOverdue = loan.status === "OVERDUE";
                  const canReturn = loan.status === "LOANED" || loan.status === "OVERDUE";
                  return (
                    <TableRow
                      key={loan.id}
                      className={isOverdue ? "bg-red-50 dark:bg-red-950/20" : ""}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{loan.member.fullName}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {loan.member.memberNumber} · {ROLE_LABELS[loan.member.category] ?? loan.member.category}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm line-clamp-1 max-w-[220px]">
                            {loan.bookItem.book.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[220px]">
                            {loan.bookItem.book.author}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateShort(loan.loanDate)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className={isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}>
                          {formatDateShort(loan.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {loan.returnDate ? formatDateShort(loan.returnDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={LOAN_STATUS_COLORS[loan.status] ?? ""} variant="outline">
                          {LOAN_STATUS_LABELS[loan.status] ?? loan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {(loan.fineAmount ?? 0) > 0 ? (
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {formatRupiah(loan.fineAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {canReturn ? (
                            <Button
                              size="sm"
                              variant={isOverdue ? "destructive" : "default"}
                              className="h-8"
                              disabled={returning === loan.id}
                              onClick={() => setReturnTarget(loan)}
                            >
                              {returning === loan.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Kembalikan
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => setView("member-detail", { id: loan.member.id })}
                          >
                            <User className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Detail</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Confirm return dialog */}
      <AlertDialog
        open={!!returnTarget}
        onOpenChange={(o) => {
          if (!o) setReturnTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pengembalian</AlertDialogTitle>
            <AlertDialogDescription>
              {returnTarget && (
                <span className="block">
                  Kembalikan{" "}
                  <b className="text-foreground">"{returnTarget.bookItem.book.title}"</b> atas nama{" "}
                  <b className="text-foreground">{returnTarget.member.fullName}</b>?
                  <span className="block mt-1 text-xs">
                    Jatuh tempo: {formatDate(returnTarget.dueDate)}
                  </span>
                  {(returnTarget.fineAmount ?? 0) > 0 && (
                    <span className="block mt-2 text-red-600 dark:text-red-400">
                      Denda keterlambatan: {formatRupiah(returnTarget.fineAmount ?? 0)}
                    </span>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={returning === returnTarget?.id}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReturn}
              disabled={returning === returnTarget?.id}
              className={
                returnTarget && (returnTarget.fineAmount ?? 0) > 0
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : ""
              }
            >
              {returning === returnTarget?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookCheck className="h-4 w-4" />
              )}
              Ya, Kembalikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
