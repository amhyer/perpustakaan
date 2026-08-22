"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Loader2,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  Users,
  Download,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/overlay/alert-dialog";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import {
  ROLE_LABELS,
  formatRupiah,
  formatDateShort,
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

type FilterKey = "unpaid" | "paid" | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "unpaid", label: "Belum Dibayar" },
  { key: "all", label: "Semua" },
  { key: "paid", label: "Sudah Dibayar" },
];

export function FinesView() {
  return <FinesViewContent />;
}

function FinesViewContent() {
  const [filter, setFilter] = useState<FilterKey>("unpaid");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [payingFine, setPayingFine] = useState<string | null>(null);
  const [payAllTarget, setPayAllTarget] = useState<{ memberId: string; memberName: string; count: number; total: number } | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [partialPayTarget, setPartialPayTarget] = useState<Loan | null>(null);
  const [partialPayAmount, setPartialPayAmount] = useState("");
  const [partialPaying, setPartialPaying] = useState(false);

  const url = useMemo(() => {
    return `/api/loans?fines=1&page=${page}&pageSize=${pageSize}`;
  }, [page]);

  const { data: allFinesResp, loading, error, refetch } = useFetch<{ data: Loan[]; total: number; page: number; pageSize: number; totalPages: number }>(
    url,
    { deps: [url] }
  );
  const data = allFinesResp?.data ?? [];
  const totalPages = allFinesResp?.totalPages ?? 1;

  const stats = useMemo(() => {
    const allLoans = data;
    const unpaid = allLoans.filter((l) => (l.fineAmount ?? 0) > (l.finePaid ?? 0));
    const paid = allLoans.filter((l) => (l.fineAmount ?? 0) > 0 && (l.finePaid ?? 0) >= (l.fineAmount ?? 0));
    const totalUnpaid = unpaid.reduce((sum, l) => sum + (l.fineAmount - (l.finePaid ?? 0)), 0);
    const uniqueMembers = new Set(unpaid.map((l) => l.memberId));
    return {
      unpaidCount: unpaid.length,
      paidCount: paid.length,
      totalUnpaid,
      memberCount: uniqueMembers.size,
    };
  }, [data]);

  const filtered = useMemo(() => {
    let list = data;
    if (filter === "unpaid") {
      list = list.filter((l) => (l.fineAmount ?? 0) > (l.finePaid ?? 0));
    } else if (filter === "paid") {
      list = list.filter((l) => (l.fineAmount ?? 0) > 0 && (l.finePaid ?? 0) >= (l.fineAmount ?? 0));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.member.fullName.toLowerCase().includes(q) ||
          l.member.memberNumber.toLowerCase().includes(q) ||
          l.bookItem.book.title.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filter, search]);

  async function handlePayFine(loanId: string, amount?: number) {
    setPayingFine(loanId);
    try {
      await api.put(`/api/loans/${loanId}/pay-fine`, amount ? { amount } : {});
      toast.success(amount ? `Dibayar: ${formatRupiah(amount)}` : "Denda ditandai lunas.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menandai denda lunas");
    } finally {
      setPayingFine(null);
    }
  }

  async function handlePartialPay() {
    if (!partialPayTarget || !partialPayAmount) return;
    const amount = parseInt(partialPayAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Masukkan jumlah yang valid");
      return;
    }
    const remaining = (partialPayTarget.fineAmount ?? 0) - (partialPayTarget.finePaid ?? 0);
    if (amount > remaining) {
      toast.error(`Maksimal: ${formatRupiah(remaining)}`);
      return;
    }
    setPartialPaying(true);
    try {
      await handlePayFine(partialPayTarget.id, amount);
      setPartialPayTarget(null);
      setPartialPayAmount("");
    } finally {
      setPartialPaying(false);
    }
  }

  async function handlePayAll() {
    if (!payAllTarget) return;
    setPayingAll(true);
    try {
      const unpaidLoans = filtered.filter(
        (l) => l.memberId === payAllTarget.memberId && (l.fineAmount ?? 0) > (l.finePaid ?? 0)
      );
      let paid = 0;
      for (const loan of unpaidLoans) {
        try {
          await api.put(`/api/loans/${loan.id}/pay-fine`, {});
          paid++;
        } catch {
          // skip individual failures
        }
      }
      toast.success(`${paid} denda ditandai lunas untuk ${payAllTarget.memberName}.`);
      setPayAllTarget(null);
      refetch();
    } finally {
      setPayingAll(false);
    }
  }

  function handleExportCSV() {
    const rows = [
      ["Anggota", "No. Anggota", "Kategori", "Buku", "Tgl Pinjam", "Jatuh Tempo", "Tgl Kembali", "Denda", "Dibayar", "Sisa", "Status"],
      ...filtered.map((l) => [
        l.member.fullName,
        l.member.memberNumber,
        ROLE_LABELS[l.member.category] ?? l.member.category,
        l.bookItem.book.title,
        formatDateShort(l.loanDate),
        formatDateShort(l.dueDate),
        l.returnDate ? formatDateShort(l.returnDate) : "",
        String(l.fineAmount ?? 0),
        String(l.finePaid ?? 0),
        String(Math.max(0, (l.fineAmount ?? 0) - (l.finePaid ?? 0))),
        (l.finePaid ?? 0) >= (l.fineAmount ?? 0) ? "Lunas" : "Belum Dibayar",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `denda-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV denda berhasil diekspor.");
  }

  // Group unpaid fines by member for bulk pay
  const unpaidByMember = useMemo(() => {
    const map = new Map<string, { memberName: string; count: number; total: number }>();
    for (const l of filtered) {
      if ((l.fineAmount ?? 0) > (l.finePaid ?? 0)) {
        const existing = map.get(l.memberId);
        const remaining = (l.fineAmount ?? 0) - (l.finePaid ?? 0);
        if (existing) {
          existing.count++;
          existing.total += remaining;
        } else {
          map.set(l.memberId, { memberName: l.member.fullName, count: 1, total: remaining });
        }
      }
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Manajemen Denda"
        description="Kelola denda keterlambatan pengembalian buku"
        icon={Banknote}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Tertunggak"
          value={formatRupiah(stats.totalUnpaid)}
          icon={AlertTriangle}
          color="bg-red-100 text-red-700"
        />
        <StatCard
          label="Belum Dibayar"
          value={stats.unpaidCount}
          icon={Wallet}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label="Sudah Dibayar"
          value={stats.paidCount}
          icon={CheckCircle2}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Anggota Berdenda"
          value={stats.memberCount}
          icon={Users}
          color="bg-sky-100 text-sky-700"
        />
      </div>

      {/* Bulk pay buttons */}
      {unpaidByMember.length > 0 && filter !== "paid" && (
        <Card className="p-4 mb-4">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground">Bayar Semua Denda Per Anggota</div>
            <div className="flex flex-wrap gap-2">
              {unpaidByMember.map(([memberId, info]) => (
                <Button
                  key={memberId}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  disabled={payingAll}
                  onClick={() => setPayAllTarget({ memberId, memberName: info.memberName, count: info.count, total: info.total })}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {info.memberName} ({info.count} denda · {formatRupiah(info.total)})
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Filters + search + export */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={filter} onValueChange={(v) => { setFilter(v as FilterKey); setPage(1); }}>
              <TabsList className="flex-wrap h-auto">
                {FILTERS.map((f) => (
                  <TabsTrigger key={f.key} value={f.key} className="text-xs">
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari anggota / buku..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
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
            icon={Banknote}
            title="Tidak ada data denda"
            description={
              search
                ? "Tidak ada hasil yang cocok dengan pencarian."
                : filter === "paid"
                ? "Belum ada denda yang sudah dibayar."
                : "Tidak ada denda yang belum dibayar. Semua sudah lunas!"
            }
          />
        ) : (
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Anggota</TableHead>
                  <TableHead>Buku</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Kembali</TableHead>
                  <TableHead className="text-right">Denda</TableHead>
                  <TableHead className="text-right">Dibayar</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((loan) => {
                  const remaining = Math.max(0, (loan.fineAmount ?? 0) - (loan.finePaid ?? 0));
                  const isPaid = remaining === 0;
                  return (
                    <TableRow
                      key={loan.id}
                      className={isPaid ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}
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
                        <span className="font-medium text-sm line-clamp-1 max-w-[200px]">
                          {loan.bookItem.book.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateShort(loan.dueDate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {loan.returnDate ? formatDateShort(loan.returnDate) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-red-600 dark:text-red-400">
                        {formatRupiah(loan.fineAmount ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {isPaid ? (
                          <span className="text-emerald-600">{formatRupiah(loan.finePaid ?? 0)}</span>
                        ) : (
                          <span className="text-muted-foreground">{formatRupiah(loan.finePaid ?? 0)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {isPaid ? (
                          <Badge className="bg-emerald-100 text-emerald-700" variant="outline">Lunas</Badge>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">{formatRupiah(remaining)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPaid && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                              disabled={payingFine === loan.id}
                              onClick={() => { setPartialPayTarget(loan); setPartialPayAmount(""); }}
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Bayar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-1"
                              disabled={payingFine === loan.id}
                              onClick={() => handlePayFine(loan.id)}
                            >
                              {payingFine === loan.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Wallet className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">Lunas</span>
                            </Button>
                          </div>
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

      {/* Confirm pay-all dialog */}
      <AlertDialog
        open={!!payAllTarget}
        onOpenChange={(o) => { if (!o) setPayAllTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai Semua Denda Lunas</AlertDialogTitle>
            <AlertDialogDescription>
              {payAllTarget && (
                <span className="block">
                  Tandai <b className="text-foreground">{payAllTarget.count} denda</b> untuk{" "}
                  <b className="text-foreground">{payAllTarget.memberName}</b> sebagai lunas?
                  <span className="block mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                    Total: {formatRupiah(payAllTarget.total)}
                  </span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={payingAll}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePayAll}
              disabled={payingAll}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {payingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Ya, Lunaskan Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Partial payment dialog */}
      <AlertDialog
        open={!!partialPayTarget}
        onOpenChange={(o) => { if (!o) { setPartialPayTarget(null); setPartialPayAmount(""); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bayar Denda</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {partialPayTarget && (
                  <div className="space-y-1">
                    <p><b className="text-foreground">{partialPayTarget.member.fullName}</b> - {partialPayTarget.bookItem.book.title}</p>
                    <p className="text-sm">Denda: {formatRupiah(partialPayTarget.fineAmount ?? 0)} | Sudah bayar: {formatRupiah(partialPayTarget.finePaid ?? 0)}</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Sisa: {formatRupiah((partialPayTarget.fineAmount ?? 0) - (partialPayTarget.finePaid ?? 0))}</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label className="text-sm font-medium mb-1.5 block">Jumlah Bayar (Rp)</label>
            <Input
              type="number"
              min={1}
              max={partialPayTarget ? (partialPayTarget.fineAmount ?? 0) - (partialPayTarget.finePaid ?? 0) : undefined}
              placeholder="Masukkan jumlah"
              value={partialPayAmount}
              onChange={(e) => setPartialPayAmount(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={partialPaying}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePartialPay}
              disabled={partialPaying || !partialPayAmount}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {partialPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              Bayar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
