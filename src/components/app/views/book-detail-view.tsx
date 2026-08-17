"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Download,
  Edit,
  FileText,
  Heart,
  HeartCrack,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Music,
  Package,
  Paperclip,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

import { BookCover } from "@/components/app/shared/book-cover";
import { Spinner } from "@/components/app/shared/loading";

import { Badge } from "@/components/ui/data-display/badge";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
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
} from "@/components/ui/overlay/alert-dialog";
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

interface BookAttachment {
  id: string;
  bookId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
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

  const { data: attachments, refetch: refetchAttachments } = useFetch<BookAttachment[]>(
    `/api/books/${bookId}/attachments`,
    { deps: [bookId] }
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);

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
  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";
  const isFullLibrarian = user?.role === "LIBRARIAN";

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

  // ===== Attachment handlers (Tahap 15-D) =====
  async function handleUploadAttachment(file: File) {
    setUploadingAttachment(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/books/${bookId}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Gagal mengunggah (${res.status})`);
      }
      toast.success(`Lampiran "${file.name}" berhasil diunggah`);
      refetchAttachments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah lampiran");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteAttachment() {
    if (!deleteAttachmentId) return;
    setDeletingAttachment(true);
    try {
      await api.delete(`/api/books/${bookId}/attachments/${deleteAttachmentId}`);
      toast.success("Lampiran dihapus.");
      setDeleteAttachmentId(null);
      refetchAttachments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus lampiran");
    } finally {
      setDeletingAttachment(false);
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
            coverImage={book.coverImage}
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
              <Button
                variant="outline"
                onClick={() => setView("book-form", { id: book.id })}
              >
                <Edit className="h-4 w-4" />
                Edit Buku
              </Button>
            )}
            {isFullLibrarian && (
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

          {/* Lampiran Digital (Tahap 15-D) */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Lampiran Digital
                {attachments && attachments.length > 0 && (
                  <Badge variant="secondary">{attachments.length}</Badge>
                )}
              </CardTitle>
              {isLibrarian && (
                <label
                  htmlFor="attachment-upload"
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {uploadingAttachment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadingAttachment ? "Mengunggah..." : "Unggah"}
                </label>
              )}
              {isLibrarian && (
                <input
                  id="attachment-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.ogg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadAttachment(f);
                    // reset input supaya bisa upload file yang sama lagi
                    e.target.value = "";
                  }}
                />
              )}
            </CardHeader>
            <CardContent>
              {!attachments || attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada lampiran untuk buku ini.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                  {attachments.map((att) => {
                    // Tentukan icon berdasarkan tipe file
                    let Icon = FileText;
                    let iconColor = "text-muted-foreground";
                    if (att.fileType.startsWith("application/pdf")) {
                      Icon = FileText;
                      iconColor = "text-red-500";
                    } else if (att.fileType.startsWith("image/")) {
                      Icon = ImageIcon;
                      iconColor = "text-blue-500";
                    } else if (att.fileType.startsWith("audio/")) {
                      Icon = Music;
                      iconColor = "text-purple-500";
                    }
                    const sizeStr = att.fileSizeBytes < 1024
                      ? `${att.fileSizeBytes} B`
                      : att.fileSizeBytes < 1024 * 1024
                      ? `${(att.fileSizeBytes / 1024).toFixed(1)} KB`
                      : `${(att.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`;
                    return (
                      <div
                        key={att.id}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2"
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted ${iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {att.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {att.fileType.split("/")[1]?.toUpperCase()} · {sizeStr}
                          </p>
                        </div>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.fileName}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                          aria-label={`Unduh ${att.fileName}`}
                          title="Unduh / Buka"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {isFullLibrarian && (
                          <button
                            type="button"
                            onClick={() => setDeleteAttachmentId(att.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                            aria-label={`Hapus ${att.fileName}`}
                            title="Hapus lampiran"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {isLibrarian && (
                <p className="text-xs text-muted-foreground mt-3">
                  Tipe diizinkan: PDF, gambar (JPG/PNG/WEBP/GIF), audio (MP3/WAV/OGG).
                  Maks 15MB per file.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AlertDialog: Konfirmasi Hapus Lampiran */}
      <AlertDialog
        open={!!deleteAttachmentId}
        onOpenChange={(o) => { if (!o) setDeleteAttachmentId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Lampiran?</AlertDialogTitle>
            <AlertDialogDescription>
              File akan dihapus permanen dari disk dan tidak bisa dikembalikan.
              Anggota tidak akan bisa mengunduh lampiran ini lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAttachment}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingAttachment}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAttachment();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deletingAttachment && <Loader2 className="h-4 w-4 animate-spin" />}
              {deletingAttachment ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
