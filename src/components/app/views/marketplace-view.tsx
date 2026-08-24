"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Store,
  Plus,
  Loader2,
  ShoppingCart,
  Tag,
  User,
  BookOpen,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { Badge } from "@/components/ui/data-display/badge";
import { Card } from "@/components/ui/layout/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";
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
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { formatDate } from "@/lib/constants";

interface Listing {
  id: string;
  bookTitle: string;
  author: string | null;
  isbn: string | null;
  condition: string;
  pricePoints: number;
  description: string | null;
  coverImage: string | null;
  status: string;
  createdAt: string;
  seller: { id: string; fullName: string; memberNumber: string };
  buyer?: { id: string; fullName: string; memberNumber: string } | null;
}

interface FormState {
  bookTitle: string;
  author: string;
  isbn: string;
  condition: string;
  pricePoints: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  bookTitle: "",
  author: "",
  isbn: "",
  condition: "GOOD",
  pricePoints: "",
  description: "",
};

const CONDITION_MAP: Record<string, { label: string; color: string }> = {
  GOOD: { label: "Bagus", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  FAIR: { label: "Cukup", color: "bg-amber-100 text-amber-700 border-amber-200" },
  WORN: { label: "Usang", color: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function MarketplaceView() {
  const user = useAppStore((s) => s.user);
  const memberId = user?.member?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<"AVAILABLE" | "ALL">("AVAILABLE");

  const listingsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("status", filter);
    const qs = params.toString();
    return `/api/marketplace${qs ? `?${qs}` : ""}`;
  }, [filter]);

  const {
    data: listings,
    loading,
    error,
    refetch,
  } = useFetch<Listing[]>(listingsUrl, { deps: [listingsUrl] });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bookTitle.trim() || !form.pricePoints) {
      toast.error("Judul buku dan harga wajib diisi");
      return;
    }
    const price = parseInt(form.pricePoints);
    if (isNaN(price) || price < 1) {
      toast.error("Harga harus berupa angka minimal 1 poin");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/marketplace", {
        bookTitle: form.bookTitle.trim(),
        author: form.author.trim() || undefined,
        isbn: form.isbn.trim() || undefined,
        condition: form.condition,
        pricePoints: price,
        description: form.description.trim() || undefined,
      });
      toast.success("Buku berhasil dijual di marketplace");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat listing");
    } finally {
      setSaving(false);
    }
  }

  async function handleBuy(listing: Listing) {
    if (!confirm(`Beli "${listing.bookTitle}" seharga ${listing.pricePoints} poin?`)) return;
    setBuyingId(listing.id);
    try {
      await api.post(`/api/marketplace/${listing.id}/buy`);
      toast.success("Pembelian berhasil! Poin telah dikurangi.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membeli");
    } finally {
      setBuyingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/marketplace/${deleteTarget.id}`);
      toast.success("Listing berhasil dihapus");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-3xl">
      <PageHeader
        title="Marketplace Buku Bekas"
        description="Jual dan beli buku bekas antar siswa"
        icon={Store}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as "AVAILABLE" | "ALL")}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                <SelectItem value="ALL">Semua</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Jual Buku
            </Button>
          </div>
        }
      />

      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={Store}
            title="Gagal memuat marketplace"
            description={error}
            action={{ label: "Coba lagi", onClick: refetch }}
          />
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="space-y-2.5">
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-20 w-full rounded bg-muted animate-pulse mt-2" />
              </div>
            </Card>
          ))}
        </div>
      ) : !listings || listings.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Store}
            title="Belum ada buku dijual"
            description="Jadilah yang pertama menjual buku bekas di marketplace!"
            action={{ label: "Jual Buku", onClick: () => setDialogOpen(true) }}
          />
        </Card>
      ) : (
        <div className="space-y-4 max-h-[750px] overflow-y-auto scrollbar-thin pr-1">
          {listings.map((l) => {
            const cond = CONDITION_MAP[l.condition] || CONDITION_MAP.GOOD;
            const isOwnListing = memberId && l.seller.id === memberId;

            return (
              <Card key={l.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-bold text-lg leading-tight text-foreground">
                          {l.bookTitle}
                        </h3>
                        {l.author && (
                          <p className="text-sm text-muted-foreground mt-0.5">{l.author}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${cond.color} gap-1`}>
                          <Tag className="h-3 w-3" />
                          {cond.label}
                        </Badge>
                        <Badge className="bg-primary/15 text-primary border-primary/30 font-semibold">
                          {l.pricePoints} poin
                        </Badge>
                      </div>
                    </div>

                    {l.description && (
                      <p className="mt-2 text-sm text-foreground/80">{l.description}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {l.seller.fullName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        {formatDate(l.createdAt)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 pt-3 border-t">
                      {l.status === "AVAILABLE" && !isOwnListing && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={buyingId === l.id}
                          onClick={() => handleBuy(l)}
                        >
                          {buyingId === l.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3.5 w-3.5" />
                          )}
                          Beli ({l.pricePoints} poin)
                        </Button>
                      )}
                      {l.status === "SOLD" && (
                        <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                          Terjual
                        </Badge>
                      )}
                      {isOwnListing && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(l)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Create Listing */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setForm(EMPTY_FORM);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Jual Buku Bekas</DialogTitle>
            <DialogDescription>
              Daftarkan buku bekas Anda untuk dijual ke siswa lain.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mp-title">Judul Buku *</Label>
              <Input
                id="mp-title"
                required
                value={form.bookTitle}
                onChange={(e) => setForm((p) => ({ ...p, bookTitle: e.target.value }))}
                placeholder="Judul buku"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mp-author">Pengarang</Label>
              <Input
                id="mp-author"
                value={form.author}
                onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                placeholder="Nama pengarang"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kondisi *</Label>
                <Select value={form.condition} onValueChange={(v) => setForm((p) => ({ ...p, condition: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD">Bagus</SelectItem>
                    <SelectItem value="FAIR">Cukup</SelectItem>
                    <SelectItem value="WORN">Usang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp-price">Harga (Poin) *</Label>
                <Input
                  id="mp-price"
                  type="number"
                  min="1"
                  required
                  value={form.pricePoints}
                  onChange={(e) => setForm((p) => ({ ...p, pricePoints: e.target.value }))}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mp-desc">Deskripsi</Label>
              <Textarea
                id="mp-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Kondisi buku, alasan dijual, dll."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); setForm(EMPTY_FORM); }}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Menyimpan..." : "Daftarkan Buku"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Listing <b className="text-foreground">&ldquo;{deleteTarget.bookTitle}&rdquo;</b>{" "}
                  akan dihapus dari marketplace.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
