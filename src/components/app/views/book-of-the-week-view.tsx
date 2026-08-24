"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Star,
  Plus,
  Loader2,
  BookOpen,
  Clock,
  History,
} from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { Badge } from "@/components/ui/data-display/badge";
import { Card } from "@/components/ui/layout/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { formatDate } from "@/lib/constants";

interface BookOfWeekBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  coverColor: string;
  category: { name: string } | null;
}

interface BookOfTheWeek {
  id: string;
  bookId: string;
  reason: string | null;
  setBy: string;
  weekStart: string;
  weekEnd: string;
  isActive: boolean;
  createdAt: string;
  book: BookOfWeekBook;
}

interface HistoryItem {
  id: string;
  bookId: string;
  reason: string | null;
  weekStart: string;
  weekEnd: string;
  isActive: boolean;
  createdAt: string;
  book: BookOfWeekBook;
}

interface BookOption {
  id: string;
  title: string;
  author: string;
}

export function BookOfWeekView() {
  const user = useAppStore((s) => s.user);
  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(null);
  const [reason, setReason] = useState("");

  const { data: currentResp, loading, error, refetch } = useFetch<{ current: BookOfTheWeek | null; latest: BookOfTheWeek | null }>(
    "/api/book-of-the-week"
  );

  const { data: historyResp, refetch: refetchHistory } = useFetch<{ data: HistoryItem[]; total: number }>(
    "/api/book-of-the-week/history?pageSize=20"
  );

  const { data: searchResults } = useFetch<BookOption[]>(
    searchQuery.length >= 2 ? `/api/books?search=${encodeURIComponent(searchQuery)}&pageSize=8` : null,
    { skip: searchQuery.length < 2 }
  );

  const current = currentResp?.current;
  const history = historyResp?.data ?? [];

  async function handleSetBookOfWeek() {
    if (!selectedBook) {
      toast.error("Pilih buku terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/book-of-the-week", {
        bookId: selectedBook.id,
        reason: reason.trim() || undefined,
      });
      toast.success("Buku Minggu Ini berhasil ditetapkan!");
      setDialogOpen(false);
      setSelectedBook(null);
      setReason("");
      setSearchQuery("");
      refetch();
      refetchHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menetapkan buku");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-3xl">
      <PageHeader
        title="Buku Minggu Ini"
        description="Buku pilihan perpustakaan minggu ini"
        icon={Star}
        actions={
          isLibrarian ? (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Tetapkan Buku
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={Star}
            title="Gagal memuat data"
            description={error}
            action={{ label: "Coba lagi", onClick: refetch }}
          />
        </Card>
      ) : loading ? (
        <Card className="p-8">
          <div className="space-y-4">
            <div className="h-48 w-full rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </Card>
      ) : current ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <div
              className="h-56 sm:h-auto sm:w-48 shrink-0 flex items-center justify-center"
              style={{ backgroundColor: current.book.coverColor + "20" }}
            >
              {current.book.coverImage ? (
                <img
                  src={current.book.coverImage}
                  alt={current.book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <BookOpen
                  className="h-16 w-16"
                  style={{ color: current.book.coverColor }}
                />
              )}
            </div>
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                  <Star className="h-3 w-3" />
                  Buku Minggu Ini
                </Badge>
                {current.book.category && (
                  <Badge variant="outline">{current.book.category.name}</Badge>
                )}
              </div>
              <h2 className="mt-3 text-xl font-bold text-foreground">
                {current.book.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {current.book.author}
              </p>
              {current.reason && (
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm text-foreground/90 italic">
                    &ldquo;{current.reason}&rdquo;
                  </p>
                </div>
              )}
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(current.weekStart)} — {formatDate(current.weekEnd)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={Star}
            title="Belum ada Buku Minggu Ini"
            description={
              isLibrarian
                ? "Tetapkan buku pilihan minggu ini untuk ditampilkan di beranda siswa."
                : "Belum ada buku pilihan untuk minggu ini."
            }
            action={
              isLibrarian
                ? { label: "Tetapkan Buku", onClick: () => setDialogOpen(true) }
                : undefined
            }
          />
        </Card>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <History className="h-4 w-4 text-muted-foreground" />
            Riwayat Pilihan
          </div>
          {history.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 shrink-0 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: item.book.coverColor + "20" }}
                >
                  <BookOpen
                    className="h-6 w-6"
                    style={{ color: item.book.coverColor }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {item.book.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.book.author}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {formatDate(item.weekStart)}
                </div>
              </div>
              {item.reason && (
                <p className="mt-2 text-xs text-muted-foreground italic pl-15">
                  &ldquo;{item.reason}&rdquo;
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setSelectedBook(null);
            setReason("");
            setSearchQuery("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Tetapkan Buku Minggu Ini</DialogTitle>
            <DialogDescription>
              Pilih buku yang akan menjadi featured book minggu ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cari Buku *</Label>
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedBook(null);
                }}
                placeholder="Ketik judul atau pengarang..."
              />
            </div>
            {searchResults && searchResults.length > 0 && !selectedBook && (
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {searchResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="w-full text-left p-3 hover:bg-muted transition-colors"
                    onClick={() => {
                      setSelectedBook(b);
                      setSearchQuery(b.title);
                    }}
                  >
                    <p className="font-medium text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.author}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedBook && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="font-medium text-sm">{selectedBook.title}</p>
                <p className="text-xs text-muted-foreground">{selectedBook.author}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="botw-reason">Alasan Pilihan</Label>
              <Textarea
                id="botw-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Mengapa buku ini dipilih? (opsional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setSelectedBook(null);
                setReason("");
                setSearchQuery("");
              }}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSetBookOfWeek} disabled={saving || !selectedBook} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Tetapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
