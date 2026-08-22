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
  Star,
  Trash2,
  Upload,
  User,
  Users,
  ExternalLink,
  MonitorPlay,
  Clock,
  History,
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
  BOOK_CONDITION_LABELS,
  DAMAGE_FINE_AMOUNT,
} from "@/lib/constants";

interface BookItem {
  id: string;
  itemCode: string;
  status: string;
  condition: string | null;
  conditionLogs?: {
    id: string;
    previousCondition: string | null;
    newCondition: string;
    previousStatus: string | null;
    newStatus: string | null;
    reason: string | null;
    reportedById: string;
    createdAt: string;
  }[];
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
  source: string;
  sourceUrl: string | null;
  sibiId: string | null;
  items: BookItem[];
  reservations: ReservationRow[];
  similarBooks?: { id: string; title: string; author: string; coverColor: string; coverImage: string | null; category: { name: string } | null }[];
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

interface ReviewRow {
  id: string;
  rating: number;
  review: string | null;
  createdAt: string;
  member: { id: string; fullName: string; memberNumber: string; category: string; user: { name: string } };
}

interface ReviewData {
  reviews: ReviewRow[];
  stats: { average: number | null; count: number };
  distribution: Record<number, number>;
  myReview: ReviewRow | null;
  hasReturned: boolean;
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

  // Report damage (Tahap 22)
  const [reportDamageId, setReportDamageId] = useState<string | null>(null);
  const [reportCondition, setReportCondition] = useState("RUSAK_RINGAN");
  const [reportDescription, setReportDescription] = useState("");
  const [reportingDamage, setReportingDamage] = useState(false);

  // Reviews (Tahap 28)
  const { data: reviewData, refetch: refetchReviews } = useFetch<ReviewData>(
    `/api/books/${bookId}/reviews`,
    { deps: [bookId] }
  );
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [deletingReview, setDeletingReview] = useState(false);

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

  // Report damage handler (Tahap 22)
  async function handleReportDamage() {
    if (!reportDamageId) return;
    setReportingDamage(true);
    try {
      const res = await fetch(`/api/book-items/${reportDamageId}/report-damage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: reportCondition, description: reportDescription || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal melaporkan kondisi");
      toast.success("Kondisi eksemplar berhasil diperbarui.");
      setReportDamageId(null);
      setReportDescription("");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal melaporkan kondisi");
    } finally {
      setReportingDamage(false);
    }
  }

  // Review handlers (Tahap 28)
  async function handleSubmitReview() {
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/books/${bookId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, review: reviewText || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim ulasan");
      toast.success("Ulasan berhasil dikirim.");
      setShowReviewForm(false);
      setReviewText("");
      setReviewRating(5);
      refetchReviews();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim ulasan");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    setDeletingReviewId(reviewId);
    setDeletingReview(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus ulasan");
      toast.success("Ulasan berhasil dihapus.");
      refetchReviews();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus ulasan");
    } finally {
      setDeletingReviewId(null);
      setDeletingReview(false);
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

          {/* Buku Digital (Tahap 9) — SIBI atau lampiran digital manual (Tahap 12) */}
          {book.sourceUrl && (
            <Card className="p-4 space-y-3 border-sky-200 bg-sky-50/50 dark:bg-sky-950/10">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <MonitorPlay className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Buku Digital</p>
                  <p className="text-[11px] text-muted-foreground">
                    {book.source === "SIBI" ? "Sumber: SIBI (Kemendikbud)" : "Lampiran digital perpustakaan"}
                  </p>
                </div>
              </div>
              <Button asChild className="w-full gap-1.5" size="sm">
                <a href={book.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Baca Buku Digital
                </a>
              </Button>
              <p className="text-[11px] text-muted-foreground break-all leading-snug">{book.sourceUrl}</p>
            </Card>
          )}
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
              {book.source === "SIBI" && (
                <Badge className="border-sky-200 bg-sky-100 text-sky-700">SIBI</Badge>
              )}
              {(book.source === "SIBI" || !!book.sourceUrl) && (
                <Badge className="border-sky-200 bg-sky-100 text-sky-700">Digital</Badge>
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

          {/* Reviews (Tahap 28) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" />
                Penilaian & Ulasan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aggregate rating */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {reviewData?.stats?.average?.toFixed(1) ?? "-"}
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= Math.round(reviewData?.stats?.average ?? 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {reviewData?.stats?.count ?? 0} ulasan
                  </div>
                </div>

                {/* Distribution bars */}
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const count = reviewData?.distribution?.[s] ?? 0;
                    const total = reviewData?.stats?.count ?? 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={s} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-right">{s}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-muted-foreground">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Write review button */}
              {reviewData?.hasReturned && !reviewData?.myReview && !showReviewForm && (
                <Button variant="outline" size="sm" onClick={() => setShowReviewForm(true)}>
                  <Star className="h-4 w-4 mr-1" />
                  Tulis Ulasan
                </Button>
              )}

              {/* Review form */}
              {showReviewForm && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReviewRating(s)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              s <= reviewRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300 hover:text-yellow-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background"
                    placeholder="Tulis ulasan Anda (opsional)..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                    >
                      {submittingReview && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Kirim
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowReviewForm(false); setReviewText(""); setReviewRating(5); }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}

              {/* Reviews list */}
              {(reviewData?.reviews ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada ulasan.</p>
              )}
              {(reviewData?.reviews ?? []).map((rev) => (
                <div key={rev.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rev.member.fullName}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {rev.member.category === "STUDENT" ? "Siswa" : rev.member.category === "TEACHER" ? "Guru" : "Pustakawan"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s <= rev.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {new Date(rev.createdAt).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </div>
                    {(user?.member?.id === rev.member.id || user?.role === "LIBRARIAN") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive"
                        onClick={() => handleDeleteReview(rev.id)}
                        disabled={deletingReview && deletingReviewId === rev.id}
                      >
                        {deletingReview && deletingReviewId === rev.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  {rev.review && (
                    <p className="text-sm text-muted-foreground">{rev.review}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

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
                      {item.status !== "DAMAGED" && item.status !== "LOST" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 shrink-0"
                          onClick={() => {
                            setReportDamageId(item.id);
                            setReportCondition("RUSAK_RINGAN");
                            setReportDescription("");
                          }}
                        >
                          Laporkan
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Condition History (Tahap 38) */}
          {book.items.some(item => item.conditionLogs && item.conditionLogs.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Riwayat Kondisi Eksemplar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-3 pr-1">
                  {book.items.map(item => item.conditionLogs && item.conditionLogs.length > 0 ? (
                    <div key={item.id} className="border rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Eksemplar {item.itemCode}</p>
                      <div className="space-y-2">
                        {item.conditionLogs.map(log => (
                          <div key={log.id} className="flex items-start gap-2 text-xs">
                            <span className="shrink-0 font-mono text-muted-foreground">{new Date(log.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span>
                            <div>
                              {log.previousCondition && (
                                <span className="text-muted-foreground">{BOOK_CONDITION_LABELS[log.previousCondition] || log.previousCondition} → </span>
                              )}
                              <span className="font-medium">{BOOK_CONDITION_LABELS[log.newCondition] || log.newCondition}</span>
                              {log.reason && <span className="text-muted-foreground"> — {log.reason}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reservations queue (Tahap 36: highlight user position) */}
          {book.reservations.length > 0 && (() => {
            const myReservation = book.reservations.find(r => r.member.id === user?.member?.id);
            const borrowedCount = book.items.filter(i => i.status === "BORROWED").length;
            const totalCount = book.items.length;
            const availableCount = book.items.filter(i => i.status === "AVAILABLE").length;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Antrian Reservasi
                    {myReservation && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 ml-auto">
                        Posisi kamu: #{myReservation.queueOrder}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availableCount === 0 && borrowedCount > 0 && (
                    <div className="mb-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      Semua eksemplar sedang dipinjam. Estimasi ketersediaan: ~{7} hari (berdasarkan masa pinjam standar)
                    </div>
                  )}
                  <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-2 pr-1">
                    {book.reservations.map((r) => {
                      const isMe = r.member.id === user?.member?.id;
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${isMe ? "bg-primary/5 border-primary/30" : ""}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                              {r.queueOrder}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {r.member.fullName}
                                {isMe && <span className="text-primary ml-1">(Kamu)</span>}
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
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

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

      {/* Similar Books (Tahap 39) */}
      {book.similarBooks && book.similarBooks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Buku Serupa
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {book.similarBooks.map((sb) => (
              <button
                key={sb.id}
                onClick={() => setView("book-detail", { id: sb.id })}
                className="group text-left rounded-xl border bg-card p-3 hover:shadow-md hover:border-primary/40 transition-all"
              >
                <BookCover
                  title={sb.title}
                  author={sb.author}
                  color={sb.coverColor}
                  coverImage={sb.coverImage}
                  size="sm"
                />
                <p className="mt-2 text-xs font-medium line-clamp-2 group-hover:text-primary">{sb.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{sb.author}</p>
                {sb.category && (
                  <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">{sb.category.name}</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Report Damage Dialog (Tahap 22) */}
      <AlertDialog open={!!reportDamageId} onOpenChange={(o) => { if (!o) setReportDamageId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Laporkan Kondisi Eksemplar</AlertDialogTitle>
            <AlertDialogDescription>
              Pilih kondisi baru dan berikan keterangan jika diperlukan.
              {reportCondition === "LOST" && (
                <span className="block mt-1 text-amber-600 font-medium">
                  Buku hilang akan dikenakan denda pengganti: Rp {DAMAGE_FINE_AMOUNT.toLocaleString("id-ID")}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Kondisi *</label>
              <select
                value={reportCondition}
                onChange={(e) => setReportCondition(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="BAIK">Baik (Diperbaiki)</option>
                <option value="RUSAK_RINGAN">Rusak Ringan</option>
                <option value="RUSAK_BERAT">Rusak Berat</option>
                <option value="LOST">Hilang</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Keterangan (opsional)</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Jelaskan kondisi buku..."
                className="w-full h-20 rounded-md border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reportingDamage}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={reportingDamage}
              onClick={handleReportDamage}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {reportingDamage ? "Melaporkan..." : "Laporkan Kondisi"}
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
