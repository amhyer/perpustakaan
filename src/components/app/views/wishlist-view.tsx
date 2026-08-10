"use client";

import { useMemo, useState } from "react";
import {
  BookHeart,
  Trash2,
  Loader2,
  HeartCrack,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { BookCard, type BookWithDetails } from "@/components/app/shared/book-card";
import { LoadingGrid } from "@/components/app/shared/loading";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

interface WishlistItem {
  id: string;
  book: BookWithDetails;
}

export function WishlistView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const url = user?.member ? `/api/wishlist?mine=1` : null;
  const { data: wishlist, loading, error, refetch } = useFetch<WishlistItem[]>(url);

  const items = useMemo(() => wishlist ?? [], [wishlist]);

  if (!user || !user.member) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Wishlist Favorit"
          description="Buku yang Anda simpan untuk dibaca nanti"
          icon={BookHeart}
        />
        <EmptyState
          icon={BookHeart}
          title="Akun Anda belum terdaftar sebagai anggota"
          description="Silakan hubungi pustakawan untuk mengaktifkan keanggotaan Anda."
        />
      </div>
    );
  }

  async function handleRemove(bookId: string, title: string) {
    setRemovingId(bookId);
    try {
      await api.delete(`/api/wishlist?bookId=${encodeURIComponent(bookId)}`);
      toast.success(`"${title}" dihapus dari wishlist.`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus dari wishlist");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wishlist Favorit"
        description="Buku yang Anda simpan untuk dibaca nanti"
        icon={BookHeart}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Wishlist"
          value={loading ? "..." : items.length}
          icon={BookHeart}
          color="bg-violet-100 text-violet-700"
          subtitle={items.length === 0 ? "Belum ada buku" : "Buku tersimpan"}
        />
        <StatCard
          label="Mau Baca"
          value={loading ? "..." : items.length}
          icon={BookHeart}
          color="bg-amber-100 text-amber-700"
          subtitle="Antrean bacaan"
        />
        <StatCard
          label="Aksi Cepat"
          value="Jelajahi"
          icon={BookHeart}
          color="bg-primary/10 text-primary"
          subtitle="Temukan buku baru"
        />
      </div>

      {/* Grid */}
      {error ? (
        <Card className="p-6 text-center text-sm text-destructive">
          Gagal memuat wishlist: {error}
        </Card>
      ) : loading ? (
        <LoadingGrid />
      ) : items.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={HeartCrack}
            title="Wishlist masih kosong"
            description="Simpan buku yang menarik minat Anda dengan menekan ikon hati di halaman detail buku. Wishlist membantu Anda menemukan bacaan berikutnya dengan cepat."
            action={{ label: "Jelajahi Katalog", onClick: () => setView("catalog") }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              <BookCard book={item.book} />
              {/* Hover overlay action */}
              <div className="absolute inset-x-3 bottom-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full h-8 text-xs pointer-events-auto shadow-md"
                  disabled={removingId === item.book.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.book.id, item.book.title);
                  }}
                >
                  {removingId === item.book.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Hapus
                </Button>
              </div>
              {/* Always-visible small badge on mobile */}
              <Badge
                variant="secondary"
                className="sm:hidden absolute top-2 left-2 bg-violet-500 text-white border-0 text-[10px] py-0"
              >
                <BookHeart className="h-3 w-3 mr-1" />
                Favorit
              </Badge>
              {/* Mobile delete button (always visible) */}
              <Button
                size="sm"
                variant="outline"
                className="sm:hidden w-full mt-2 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={removingId === item.book.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item.book.id, item.book.title);
                }}
              >
                {removingId === item.book.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Hapus
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Helper card */}
      {items.length > 0 && (
        <Card className="p-4 bg-muted/40">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <BookHeart className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">Tips Wishlist</p>
              <p className="text-muted-foreground mt-0.5">
                Arahkan kursor ke kartu buku untuk menampilkan tombol hapus. Klik kartu untuk melihat detail dan meminjam buku.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
