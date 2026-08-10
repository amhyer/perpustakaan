"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Edit,
  FileText,
  Heart,
  HeartCrack,
  Loader2,
  MapPin,
  Package,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

import { BookCover } from "@/components/app/shared/book-cover";
import { Spinner } from "@/components/app/shared/loading";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";

interface BookItem {
  id: string;
  itemCode: string;
  status: string;
  condition: string | null;
}

interface ReservationRow {
  id: string;
  status: string;
  queueOrder: number;
  member: { id: string; fullName: string; memberNumber: string; category: string };
}

interface BookDetail {
  id: string;
  title: string;
  author: string;
  publisher: string | null;
  isbn: string | null;
  year: number | null;
  pages: number | null;
  synopsis: string | null;
  coverImage: string | null;
  coverColor: string;
  language: string | null;
  subject: string | null;
  category: { id: string; name: string } | null;
  location: { id: string; name: string; code: string } | null;
  items: BookItem[];
  reservations: ReservationRow[];
}

interface WishlistRow {
  id: string;
  bookId: string;
}

export function BookDetailView({ bookId }: { bookId: string }) {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const { data: book, loading, error, refetch } = useFetch<BookDetail>(
    `/api/books/${bookId}`,
    { deps: [bookId] }
  );

  const { data: wishlist, refetch: refetchWishlist } = useFetch<WishlistRow[]>(
    "/api/wishlist?mine=1"
  );

  const [actionLoading, setActionLoading] = useState(false);

  const isWishlisted = useMemo(
    () => (wishlist ?? []).some((w) => w.bookId === bookId),
    [wishlist, bookId]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setView("catalog")} />
        <Spinner />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setView("catalog")} />
        <Card className="p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Gagal memuat detail buku</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {error || "Buku tidak ditemukan."}
          </p>
          <Button onClick={() => setView("catalog")} className="mt-4">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Katalog
          </Button>
        </Card>
      </div>
    );
  }

  const availableItems = book.items.filter((i) => i.status === "AVAILABLE");
  const availableCount = availableItems.length;
  const totalCount = book.items.length;
  const firstAvailable = availableItems[0];

  const isMember = user?.role === "TEACHER" || user?.role === "STUDENT";
  const isLibrarian = user?.role === "LIBRARIAN";

  async function handleBorrow() {
    if (!firstAvailable) return;
    setActionLoading(true);
    try {
      await api.post("/api/loans", { bookItemId: firstAvailable.id });
      toast.success("Buku berhasil dipinjam. Lihat di Peminjaman Saya.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal meminjam buku");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReserve() {
    setActionLoading(true);
    try {
      await api.post("/api/reservations", { bookId });
      toast.success("Reservasi berhasil dibuat.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat reservasi");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWishlistToggle() {
    setActionLoading(true);
    try {
      if (isWishlisted) {
        await api.delete(`/api/wishlist?bookId=${bookId}`);
        toast.success("Dihapus dari wishlist");
      } else {
        await api.post("/api/wishlist", { bookId });
        toast.success("Ditambahkan ke wishlist");
      }
      refetchWishlist();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah wishlist");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      await api.delete(`/api/books/${bookId}`);
      toast.success("Buku berhasil dihapus");
      setView("catalog");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus buku");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackButton onClick={() => setView("catalog")} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* LEFT — cover (sticky) */}
        <div className="lg:sticky lg:top-6 self-start space-y-4">
          <BookCover
            title={book.title}
            author={book.author}
            color={book.coverColor}
            size="lg"
          />
          {/* Quick stats */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Eksemplar</span>
              <span className="font-semibold">{totalCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tersedia</span>
              <Badge
                className={
                  availableCount > 0
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }
              >
                {availableCount}
              </Badge>
            </div>
            {book.location && (
              <div className="flex items-center gap-2 text-sm pt-2 border-t">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Rak:</span>
                <span className="font-medium">{book.location.code}</span>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — details */}
        <div className="space-y-6 min-w-0">
          {/* Title block */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {book.category && (
                <Badge variant="secondary">{book.category.name}</Badge>
              )}
              {book.year && (
                <Badge variant="outline" className="font-normal">
                  <Calendar className="h-3 w-3" />
                  {book.year}
                </Badge>
              )}
              {book.language && (
                <Badge variant="outline" className="font-normal">
                  {book.language}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">
              {book.title}
            </h1>
            <p className="text-base text-muted-foreground flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {book.author}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {isMember && (
              <>
                {availableCount > 0 ? (
                  <Button onClick={handleBorrow} disabled={actionLoading}>
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    Pinjam Buku
                  </Button>
                ) : (
                  <Button onClick={handleReserve} disabled={actionLoading}>
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    Reservasi
                  </Button>
                )}
                <Button
                  variant={isWishlisted ? "secondary" : "outline"}
                  onClick={handleWishlistToggle}
                  disabled={actionLoading}
                >
                  {isWishlisted ? (
                    <HeartCrack className="h-4 w-4" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                  {isWishlisted ? "Hapus dari Wishlist" : "Tambah ke Wishlist"}
                </Button>
              </>
            )}

            {isMember && availableCount === 0 && (
              <span className="text-sm text-muted-foreground self-center">
                Stok habis — reservasi untuk mengantre
              </span>
            )}

            {isLibrarian && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setView("book-form", { id: book.id })}
                >
                  <Edit className="h-4 w-4" />
                  Edit Buku
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={actionLoading}>
                      <Trash2 className="h-4 w-4" />
                      Hapus Buku
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus buku ini?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Buku “{book.title}”
                        beserta seluruh eksemplar akan dihapus permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>

          {/* Metadata grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Buku</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <MetaItem label="Pengarang" value={book.author} />
              <MetaItem label="Penerbit" value={book.publisher || "-"} />
              <MetaItem label="Tahun Terbit" value={book.year?.toString() || "-"} />
              <MetaItem label="ISBN" value={book.isbn || "-"} />
              <MetaItem label="Jumlah Halaman" value={book.pages ? `${book.pages} hlm` : "-"} />
              <MetaItem label="Bahasa" value={book.language || "-"} />
              <MetaItem label="Subjek" value={book.subject || "-"} />
              <MetaItem
                label="Lokasi / Rak"
                value={
                  book.location
                    ? `${book.location.name} (${book.location.code})`
                    : "-"
                }
                icon={MapPin}
              />
            </CardContent>
          </Card>

          {/* Synopsis */}
          {book.synopsis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Sinopsis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {book.synopsis}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Availability / Items */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ketersediaan Eksemplar
              </CardTitle>
              <Badge
                className={
                  availableCount > 0
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }
              >
                {availableCount} dari {totalCount} tersedia
              </Badge>
            </CardHeader>
            <CardContent>
              {book.items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada eksemplar untuk buku ini.
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-2 pr-1">
                  {book.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.itemCode}
                          </p>
                          {item.condition && (
                            <p className="text-xs text-muted-foreground">
                              Kondisi: {item.condition}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={`shrink-0 ${ITEM_STATUS_COLORS[item.status] || ""}`}
                      >
                        {ITEM_STATUS_LABELS[item.status] || item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reservations queue */}
          {book.reservations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Antrian Reservasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-2 pr-1">
                  {book.reservations.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {r.queueOrder}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {r.member.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.member.memberNumber} · {r.member.category}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {RESERVATION_STATUS_LABELS[r.status] || r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground flex items-center gap-1.5 truncate">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        {value}
      </span>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="-ml-2">
      <ArrowLeft className="h-4 w-4" />
      Kembali ke Katalog
    </Button>
  );
}
