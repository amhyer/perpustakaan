"use client";

import { useEffect, useMemo, useState } from "react";
import { BookPlus, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { BookCover } from "@/components/app/shared/book-cover";
import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";

interface BookLite {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverImage: string | null;
  isbn?: string | null;
}

interface ListItem {
  note?: string | null;
  book: BookLite;
}

export function ReadingListEditor({
  taughtClasses,
  initialItems,
}: {
  taughtClasses: string[];
  initialItems: ListItem[];
}) {
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<BookLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const ids = useMemo(() => new Set(items.map((i) => i.book.id)), [items]);

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await api.get<{ data: BookLite[] }>(`/api/books?q=${encodeURIComponent(q.trim())}&pageSize=8`);
      setHits((res.data ?? []).filter((b) => !ids.has(b.id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mencari buku");
    } finally {
      setSearching(false);
    }
  }

  async function save(next: ListItem[]) {
    setSaving(true);
    try {
      await api.put("/api/reading-lists", {
        classGrades: taughtClasses,
        items: next.map((i) => ({ bookId: i.book.id, note: i.note })),
      });
      setItems(next);
      toast.success("Daftar bacaan tersimpan. Siswa di kelas Anda akan melihatnya di beranda.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan daftar bacaan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 space-y-3">
      <div>
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <BookPlus className="h-4 w-4 text-amber-700" />
          Daftar bacaan kelas
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Buku ini muncul di beranda siswa {taughtClasses.join(", ") || "kelas Anda"}.
        </p>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.book.id} className="flex items-center gap-3 rounded-lg border px-2 py-2">
              <div className="w-10 shrink-0">
                <BookCover
                  title={item.book.title}
                  author={item.book.author}
                  color={item.book.coverColor}
                  coverImage={item.book.coverImage}
                  isbn={item.book.isbn}
                  size="sm"
                  tilt={false}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.book.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{item.book.author}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-destructive"
                disabled={saving}
                onClick={() => save(items.filter((i) => i.book.id !== item.book.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
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
            placeholder="Cari buku untuk ditambahkan..."
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
              className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent/40"
              onClick={() => {
                const next = [...items, { book, note: null }];
                setHits(hits.filter((h) => h.id !== book.id));
                save(next);
              }}
            >
              <span className="truncate">
                {book.title} <span className="text-muted-foreground">· {book.author}</span>
              </span>
              <Badge variant="outline">Tambah</Badge>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
