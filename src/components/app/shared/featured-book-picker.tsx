"use client";

import { useState } from "react";
import { Loader2, Search, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { BookCover } from "@/components/app/shared/book-cover";
import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";
import { useFetch } from "@/hooks/use-fetch";

interface BookLite {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  coverColor: string;
  coverImage: string | null;
}

export function FeaturedBookPicker() {
  const { data, refetch } = useFetch<{ featured: BookLite | null }>("/api/public/featured");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<BookLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const featured = data?.featured ?? null;

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await api.get<{ data: BookLite[] }>(`/api/books?q=${encodeURIComponent(q.trim())}&pageSize=8`);
      setHits(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mencari buku");
    } finally {
      setSearching(false);
    }
  }

  async function pick(id: string) {
    setSaving(true);
    try {
      await api.put("/api/settings", { featured_book_id: id });
      toast.success("Buku Minggu Ini diperbarui. Tampil di katalog umum dan beranda siswa.");
      setHits([]);
      setQ("");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function useAutomatic() {
    setSaving(true);
    try {
      await api.put("/api/settings", { featured_book_id: "" });
      toast.success("Buku Minggu Ini kembali otomatis (buku terpopuler).");
      setHits([]);
      setQ("");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Buku Minggu Ini</h2>
          <p className="text-xs text-muted-foreground">
            Tampil di katalog umum tanpa login dan di zona Untukmu siswa. Tombol Otomatis memakai buku terpopuler.
          </p>
        </div>
      </div>

      {featured && (
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <div className="w-12 shrink-0">
            <BookCover
              title={featured.title}
              author={featured.author}
              color={featured.coverColor}
              coverImage={featured.coverImage}
              isbn={featured.isbn}
              size="sm"
              tilt={false}
            />
          </div>
          <div className="min-w-0">
            <Badge variant="outline" className="text-[10px] mb-1">Sedang ditampilkan</Badge>
            <p className="text-sm font-semibold truncate">{featured.title}</p>
            <p className="text-xs text-muted-foreground truncate">{featured.author}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="shrink-0 gap-1 text-xs"
            disabled={saving}
            onClick={useAutomatic}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Otomatis
          </Button>
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul untuk dijadikan Buku Minggu Ini..."
            className="pl-8 h-9"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={searching}>
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cari"}
        </Button>
      </form>

      {hits.length > 0 && (
        <div className="space-y-1">
          {hits.map((book) => (
            <button
              key={book.id}
              type="button"
              disabled={saving}
              className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent/40"
              onClick={() => pick(book.id)}
            >
              <span className="truncate">
                {book.title} <span className="text-muted-foreground">· {book.author}</span>
              </span>
              <Badge variant="outline">{featured?.id === book.id ? "Dipakai" : "Pilih"}</Badge>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
