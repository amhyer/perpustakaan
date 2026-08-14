"use client";

import { useEffect, useRef, useState } from "react";
import {
  ScanLine,
  Search,
  UserCheck,
  BookOpen,
  ArrowRightLeft,
  AlertTriangle,
  X,
  Loader2,
  RotateCcw,
  CalendarClock,
  Info,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAppStore } from "@/store/use-app-store";
import { BookCover } from "@/components/app/shared/book-cover";
import { Spinner } from "@/components/app/shared/loading";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import {
  LOAN_RULES,
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  ROLE_LABELS,
  ROLE_COLORS,
  formatRupiah,
  formatDate,
  formatDateShort,
  calculateFine,
} from "@/lib/constants";

// ===== Types =====
interface MemberSearchResult {
  id: string;
  memberNumber: string;
  fullName: string;
  category: string;
  status: string;
  classGrade: string | null;
  photo: string | null;
  user: { email: string; role: string };
  _count: { loans: number };
}

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

interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverImage: string | null;
  items: { id: string; status: string; itemCode: string; condition: string }[];
}

// ===== Reusable: Debounced member search input =====
function MemberSearchInput({
  selected,
  onSelect,
}: {
  selected: MemberSearchResult | null;
  onSelect: (m: MemberSearchResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryLongEnough = query.trim().length >= 2;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!queryLongEnough) return;
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/members?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d: MemberSearchResult[]) => {
          setResults(d);
          setLoading(false);
          setOpen(true);
        })
        .catch(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, queryLongEnough]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (selected) {
    const rule = LOAN_RULES[selected.category] ?? LOAN_RULES.STUDENT;
    return (
      <div className="rounded-lg border bg-muted/40 p-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
          {selected.fullName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{selected.fullName}</span>
            <Badge className={ROLE_COLORS[selected.category] ?? ""} variant="outline">
              {ROLE_LABELS[selected.category] ?? selected.category}
            </Badge>
            {selected.status !== "ACTIVE" && (
              <Badge variant="destructive" className="text-[10px]">Nonaktif</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {selected.memberNumber}
            {selected.classGrade ? ` · ${selected.classGrade}` : ""}
            {selected.user?.email ? ` · ${selected.user.email}` : ""}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Kuota: maks {rule.maxBooks} buku · {rule.loanDays} hari pinjam
            {rule.finePerDay > 0 ? ` · denda ${formatRupiah(rule.finePerDay)}/hari` : " · tanpa denda"}
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          aria-label="Ganti anggota"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          placeholder="Cari anggota: nama / nomor / kelas..."
          className="pl-9"
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
        />
        {loading && queryLongEnough && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && queryLongEnough && !loading && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-72 overflow-y-auto scrollbar-thin">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onSelect(m);
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-3 border-b last:border-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {m.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{m.fullName}</div>
                <div className="text-xs text-muted-foreground">
                  {m.memberNumber} · {ROLE_LABELS[m.category] ?? m.category}
                  {m.classGrade ? ` · ${m.classGrade}` : ""}
                </div>
              </div>
              {m.status !== "ACTIVE" && (
                <Badge variant="destructive" className="text-[10px]">Nonaktif</Badge>
              )}
            </button>
          ))}
        </div>
      )}
      {open && queryLongEnough && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md p-3 text-sm text-muted-foreground">
          Anggota tidak ditemukan.
        </div>
      )}
    </div>
  );
}

// ===== Reusable: book search input =====
function BookSearchInput({
  selected,
  onSelect,
}: {
  selected: BookSearchResult | null;
  onSelect: (b: BookSearchResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryLongEnough = query.trim().length >= 2;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!queryLongEnough) return;
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/books?q=${encodeURIComponent(query.trim())}&limit=20`)
        .then((r) => r.json())
        .then((d: BookSearchResult[]) => {
          setResults(d);
          setLoading(false);
          setOpen(true);
        })
        .catch(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, queryLongEnough]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (selected) {
    const availableItems = selected.items.filter((i) => i.status === "AVAILABLE");
    return (
      <div className="rounded-lg border bg-muted/40 p-3 flex items-start gap-3">
        <div className="w-10 shrink-0">
          <BookCover title={selected.title} author={selected.author} color={selected.coverColor} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm line-clamp-2">{selected.title}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{selected.author}</div>
          <Badge className="mt-1 bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
            {availableItems.length} eksemplar tersedia
          </Badge>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          aria-label="Ganti buku"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          placeholder="Cari buku: judul / pengarang / ISBN..."
          className="pl-9"
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
        />
        {loading && queryLongEnough && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && queryLongEnough && !loading && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-72 overflow-y-auto scrollbar-thin">
          {results.map((b) => {
            const available = b.items.filter((i) => i.status === "AVAILABLE").length;
            return (
              <button
                key={b.id}
                type="button"
                disabled={available === 0}
                onClick={() => {
                  onSelect(b);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-3 border-b last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 shrink-0">
                  <BookCover title={b.title} author={b.author} color={b.coverColor} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{b.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{b.author}</div>
                </div>
                <Badge
                  className={
                    available > 0
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-muted text-muted-foreground"
                  }
                  variant="outline"
                >
                  {available} tersedia
                </Badge>
              </button>
            );
          })}
        </div>
      )}
      {open && queryLongEnough && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md p-3 text-sm text-muted-foreground">
          Buku tidak ditemukan.
        </div>
      )}
    </div>
  );
}

// ===== Active loans list (shared) =====
function ActiveLoansList({
  loans,
  loading,
  emptyHint,
  onReturn,
  returningId,
}: {
  loans: Loan[];
  loading: boolean;
  emptyHint: string;
  onReturn?: (loan: Loan) => void;
  returningId?: string | null;
}) {
  if (loading) return <Spinner className="py-6" />;
  if (loans.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">{emptyHint}</div>
    );
  }
  return (
    <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
      {loans.map((loan) => {
        const isOverdue = loan.status === "OVERDUE";
        const fine = loan.fineAmount ?? 0;
        return (
          <div
            key={loan.id}
            className={`rounded-lg border p-3 flex items-start gap-3 ${
              isOverdue ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900" : ""
            }`}
          >
            <div className="w-10 shrink-0">
              <BookCover
                title={loan.bookItem.book.title}
                author={loan.bookItem.book.author}
                color={loan.bookItem.book.coverColor}
                size="sm"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm line-clamp-2">{loan.bookItem.book.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{loan.bookItem.book.author}</div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Badge className={LOAN_STATUS_COLORS[loan.status] ?? ""} variant="outline">
                  {LOAN_STATUS_LABELS[loan.status] ?? loan.status}
                </Badge>
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Jatuh tempo {formatDateShort(loan.dueDate)}
                </span>
              </div>
              {fine > 0 && (
                <div className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Denda: {formatRupiah(fine)}
                </div>
              )}
            </div>
            {onReturn && (
              <Button
                type="button"
                size="sm"
                variant={isOverdue ? "destructive" : "default"}
                className="shrink-0"
                disabled={returningId === loan.id}
                onClick={() => onReturn(loan)}
              >
                {returningId === loan.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Kembalikan
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== Main view =====
export function CirculationView() {
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

  return <CirculationViewContent />;
}

function CirculationViewContent() {
  // Borrow state
  const [borrowMember, setBorrowMember] = useState<MemberSearchResult | null>(null);
  const [borrowBook, setBorrowBook] = useState<BookSearchResult | null>(null);
  const [borrowItemId, setBorrowItemId] = useState<string>("");
  const [borrowing, setBorrowing] = useState(false);

  // Return state
  const [returnMember, setReturnMember] = useState<MemberSearchResult | null>(null);
  const [returnTarget, setReturnTarget] = useState<Loan | null>(null);
  const [returning, setReturning] = useState<string | null>(null);

  // Loans for selected member (borrow side)
  const {
    data: borrowLoans,
    loading: borrowLoansLoading,
    refetch: refetchBorrowLoans,
  } = useFetch<Loan[]>(borrowMember ? `/api/loans?memberId=${borrowMember.id}` : null, {
    deps: [borrowMember?.id],
  });

  // Loans for selected member (return side)
  const {
    data: returnLoans,
    loading: returnLoansLoading,
    refetch: refetchReturnLoans,
  } = useFetch<Loan[]>(returnMember ? `/api/loans?memberId=${returnMember.id}` : null, {
    deps: [returnMember?.id],
  });

  function handleBorrowMemberSelect(m: MemberSearchResult | null) {
    setBorrowMember(m);
    setBorrowBook(null);
    setBorrowItemId("");
  }

  function handleBorrowBookSelect(b: BookSearchResult | null) {
    setBorrowBook(b);
    if (b) {
      const available = b.items.filter((i) => i.status === "AVAILABLE");
      setBorrowItemId(available[0]?.id ?? "");
    } else {
      setBorrowItemId("");
    }
  }

  const activeBorrowLoans = (borrowLoans ?? []).filter(
    (l) => l.status === "LOANED" || l.status === "OVERDUE"
  );
  const activeReturnLoans = (returnLoans ?? []).filter(
    (l) => l.status === "LOANED" || l.status === "OVERDUE"
  );

  const overdueBorrowCount = activeBorrowLoans.filter((l) => l.status === "OVERDUE").length;
  const totalReturnFine = activeReturnLoans.reduce((sum, l) => sum + (l.fineAmount ?? 0), 0);

  const borrowRule = borrowMember
    ? LOAN_RULES[borrowMember.category] ?? LOAN_RULES.STUDENT
    : null;

  const canBorrow =
    borrowMember &&
    borrowMember.status === "ACTIVE" &&
    borrowBook &&
    borrowItemId &&
    overdueBorrowCount === 0 &&
    activeBorrowLoans.length < (borrowRule?.maxBooks ?? 0) &&
    !borrowing;

  async function handleBorrow() {
    if (!borrowMember || !borrowItemId) return;
    setBorrowing(true);
    try {
      const loan = await api.post<Loan>("/api/loans", {
        memberId: borrowMember.id,
        bookItemId: borrowItemId,
      });
      // Cek apakah dueDate digeser karena hari libur (Tahap 15-B)
      // Bandingkan dueDate aktual dengan loanDate + loanDays (per kategori)
      const rule = LOAN_RULES[borrowMember.category] ?? LOAN_RULES.STUDENT;
      const expectedDue = new Date(new Date(loan.loanDate).getTime() + rule.loanDays * 86400000);
      const actualDue = new Date(loan.dueDate);
      const shiftedDays = Math.round((actualDue.getTime() - expectedDue.getTime()) / 86400000);
      const shiftedNote = shiftedDays > 0
        ? ` (disesuaikan +${shiftedDays} hari karena jatuh di hari libur)`
        : "";
      toast.success(
        `Peminjaman berhasil: "${loan.bookItem.book.title}". Jatuh tempo ${formatDate(loan.dueDate)}${shiftedNote}.`
      );
      handleBorrowBookSelect(null);
      refetchBorrowLoans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses peminjaman");
    } finally {
      setBorrowing(false);
    }
  }

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
      const bookTitle = res.loan.bookItem.book.title;
      if (fine > 0) {
        toast.success(
          `"${bookTitle}" dikembalikan. Denda keterlambatan: ${formatRupiah(fine)}.`
        );
      } else {
        toast.success(`"${bookTitle}" berhasil dikembalikan. Terima kasih!`);
      }
      if (res.nextReservation) {
        toast.info(
          `Reservasi berikutnya oleh ${res.nextReservation.member.fullName} kini siap diambil.`
        );
      }
      setReturnTarget(null);
      refetchReturnLoans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses pengembalian");
    } finally {
      setReturning(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Sirkulasi"
        description="Layanan peminjaman & pengembalian buku"
        icon={ScanLine}
        actions={
          <Button
            onClick={() => setView("kiosk")}
            variant="outline"
            className="gap-2"
          >
            <ScanLine className="h-4 w-4" />
            Mode Kios
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== Card: Pinjam Buku ===== */}
        <Card className="p-0">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Pinjam Buku</CardTitle>
                <CardDescription>Pilih anggota & buku untuk dipinjamkan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Step 1: Member */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
                Pilih Anggota
              </label>
              <MemberSearchInput selected={borrowMember} onSelect={handleBorrowMemberSelect} />
            </div>

            {/* Member active loans */}
            {borrowMember && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    Pinjaman Aktif ({activeBorrowLoans.length}
                    {borrowRule ? `/${borrowRule.maxBooks}` : ""})
                  </span>
                  {overdueBorrowCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertTriangle className="h-3 w-3" />
                      {overdueBorrowCount} terlambat
                    </Badge>
                  )}
                </div>
                <ActiveLoansList
                  loans={activeBorrowLoans}
                  loading={borrowLoansLoading}
                  emptyHint="Belum ada pinjaman aktif."
                />
                {overdueBorrowCount > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Anggota memiliki buku terlambat. Pengembalian dahulu sebelum meminjam lagi.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Book */}
            {borrowMember && borrowMember.status === "ACTIVE" && overdueBorrowCount === 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">2</span>
                  Pilih Buku
                </label>
                <BookSearchInput selected={borrowBook} onSelect={handleBorrowBookSelect} />

                {borrowBook && (
                  <div className="space-y-1.5">
                    {(() => {
                      const availableItems = borrowBook.items.filter((i) => i.status === "AVAILABLE");
                      if (availableItems.length === 0) {
                        return (
                          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>Tidak ada eksemplar tersedia untuk buku ini.</span>
                          </div>
                        );
                      }
                      return (
                        <>
                          <label className="text-[11px] text-muted-foreground">Pilih eksemplar</label>
                          <Select value={borrowItemId} onValueChange={setBorrowItemId}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih eksemplar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableItems.map((it) => (
                                <SelectItem key={it.id} value={it.id}>
                                  {it.itemCode} · Kondisi {it.condition}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Loan rules info */}
                {borrowRule && (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      Aturan {ROLE_LABELS[borrowMember.category] ?? borrowMember.category}: maks{" "}
                      <b className="text-foreground">{borrowRule.maxBooks} buku</b>, durasi{" "}
                      <b className="text-foreground">{borrowRule.loanDays} hari</b>
                      {borrowRule.finePerDay > 0
                        ? `, denda ${formatRupiah(borrowRule.finePerDay)}/hari keterlambatan.`
                        : ", tanpa denda."}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!canBorrow}
                  onClick={handleBorrow}
                >
                  {borrowing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4" />
                  )}
                  Proses Peminjaman
                </Button>
                {borrowMember &&
                  activeBorrowLoans.length >= (borrowRule?.maxBooks ?? 0) &&
                  overdueBorrowCount === 0 && (
                    <p className="text-[11px] text-amber-600 text-center">
                      Kuota peminjaman penuh.
                    </p>
                  )}
              </div>
            )}

            {borrowMember && borrowMember.status !== "ACTIVE" && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Anggota tidak aktif. Tidak dapat meminjam buku.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== Card: Kembalikan Buku ===== */}
        <Card className="p-0">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Kembalikan Buku</CardTitle>
                <CardDescription>Pilih anggota untuk melihat & mengembalikan pinjaman</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
                Pilih Anggota
              </label>
              <MemberSearchInput selected={returnMember} onSelect={setReturnMember} />
            </div>

            {returnMember && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    Pinjaman Aktif ({activeReturnLoans.length})
                  </span>
                  {totalReturnFine > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertTriangle className="h-3 w-3" />
                      Total denda: {formatRupiah(totalReturnFine)}
                    </Badge>
                  )}
                </div>

                {returnLoansLoading ? (
                  <Spinner className="py-6" />
                ) : activeReturnLoans.length === 0 ? (
                  <EmptyState
                    icon={UserCheck}
                    title="Tidak ada pinjaman aktif"
                    description="Anggota ini sedang tidak meminjam buku."
                  />
                ) : (
                  <ActiveLoansList
                    loans={activeReturnLoans}
                    loading={false}
                    emptyHint="Tidak ada pinjaman aktif."
                    onReturn={(loan) => setReturnTarget(loan)}
                    returningId={returning}
                  />
                )}
              </div>
            )}

            {!returnMember && (
              <EmptyState
                icon={UserCheck}
                title="Pilih anggota dahulu"
                description="Cari nama atau nomor anggota untuk menampilkan pinjaman aktifnya."
              />
            )}
          </CardContent>
        </Card>
      </div>

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
                <RotateCcw className="h-4 w-4" />
              )}
              Ya, Kembalikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
