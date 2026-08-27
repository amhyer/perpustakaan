"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, LogIn, Search, X } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { BookCover } from "@/components/app/shared/book-cover";
import { BookCard, type BookWithDetails } from "@/components/app/shared/book-card";
import { FeaturedHero } from "@/components/app/shared/featured-hero";
import { ShelfMap } from "@/components/app/shared/shelf-map";
import { ShelfRow } from "@/components/app/shared/shelf-row";
import { Badge } from "@/components/ui/data-display/badge";
import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { aisleHint, type PublicBook } from "@/lib/opac";

interface OpacPayload {
  featured: PublicBook | null;
  books: PublicBook[];
  categories: { id: string; name: string }[];
  locations: { id: string; name: string; code: string }[];
  hours: { label: string };
}

interface PublicDetail extends PublicBook {
  aisle: string;
  queueCount: number;
  similarBooks: {
    id: string;
    title: string;
    author: string;
    coverColor: string;
    coverImage: string | null;
    isbn?: string | null;
    category: { name: string } | null;
  }[];
}

function asCard(book: PublicBook): BookWithDetails {
  return {
    ...book,
    items: Array.from({ length: book.total }, (_, i) => ({
      id: `${book.id}-${i}`,
      status: i < book.available ? "AVAILABLE" : "LOANED",
    })),
  };
}

export function PublicCatalog() {
  const [data, setData] = useState<OpacPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PublicDetail | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (categoryId) params.set("categoryId", categoryId);
    const qs = params.toString();
    fetch(`/api/public/opac${qs ? `?${qs}` : ""}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat katalog");
        setData(await res.json());
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat"));
  }, [q, categoryId]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    fetch(`/api/public/books/${detailId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Buku tidak ditemukan");
        setDetail(await res.json());
      })
      .catch(() => setDetail(null));
  }, [detailId]);

  const shelves = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, PublicBook[]>();
    for (const book of data.books) {
      const key = book.category?.name || "Lainnya";
      const list = map.get(key) ?? [];
      list.push(book);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [data]);

  const searching = q.trim().length > 0 || !!categoryId;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <a href="/katalog" className="shrink-0">
            <Logo />
          </a>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {data?.hours.label ?? "Senin–Jumat 07.00–16.00"}
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <a href="/">
              <LogIn className="h-4 w-4" />
              Masuk untuk meminjam
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
        {detailId && detail ? (
          <PublicBookPanel book={detail} onBack={() => setDetailId(null)} onOpen={setDetailId} />
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Katalog Umum</h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Cari buku tanpa akun. Masuk hanya saat ingin meminjam, mereservasi, atau melihat kartu anggota.
              </p>
            </div>

            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setQ(String(fd.get("q") || ""));
              }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Cari judul, pengarang, atau ISBN..."
                className="pl-9 h-12 text-base"
              />
              {q && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setQ("")}
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              <Button
                size="sm"
                variant={categoryId === "" ? "default" : "outline"}
                onClick={() => setCategoryId("")}
              >
                Semua
              </Button>
              {data?.categories.map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant={categoryId === c.id ? "default" : "outline"}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </Button>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!searching && data?.featured && (
              <FeaturedHero book={data.featured} onOpen={setDetailId} ctaLabel="Lihat di rak" />
            )}

            {searching ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(data?.books ?? []).map((book) => (
                  <BookCard key={book.id} book={asCard(book)} onOpen={setDetailId} />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {shelves.map(([name, books]) => (
                  <ShelfRow
                    key={name}
                    title={name}
                    books={books.map(asCard)}
                    onSeeAll={() => {
                      const cat = data?.categories.find((c) => c.name === name);
                      if (cat) setCategoryId(cat.id);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PublicBookPanel({
  book,
  onBack,
  onOpen,
}: {
  book: PublicDetail;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Kembali ke rak
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-4">
          <BookCover
            title={book.title}
            author={book.author}
            color={book.coverColor}
            coverImage={book.coverImage}
            isbn={book.isbn}
            size="lg"
            tilt
          />
          <Card className="p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tersedia</span>
              <span className="font-semibold">
                {book.available}/{book.total}
              </span>
            </div>
            {book.queueCount > 0 && (
              <p className="text-xs text-amber-700">{book.queueCount} orang mengantri</p>
            )}
          </Card>
        </div>
        <div className="space-y-4 min-w-0">
          {book.category && <Badge variant="secondary">{book.category.name}</Badge>}
          <h1 className="text-3xl font-serif font-bold leading-tight">{book.title}</h1>
          <p className="text-muted-foreground">{book.author}</p>
          {book.synopsis && <p className="text-sm leading-relaxed">{book.synopsis}</p>}
          <ShelfMap code={book.location?.code} name={book.location?.name} />
          <p className="text-sm text-muted-foreground">
            {book.location
              ? `Ambil di ${book.location.code} — ${aisleHint(book.location.code)}`
              : "Tanyakan lokasi ke petugas."}
          </p>
          <Button asChild>
            <a href="/">Masuk untuk meminjam</a>
          </Button>
        </div>
      </div>
      {book.similarBooks.length > 0 && (
        <ShelfRow
          title="Buku serupa"
          onOpen={onOpen}
          books={book.similarBooks.map((s) => ({
            id: s.id,
            title: s.title,
            author: s.author,
            coverColor: s.coverColor,
            coverImage: s.coverImage,
            isbn: s.isbn,
            category: s.category,
          }))}
          onSeeAll={undefined}
        />
      )}
    </div>
  );
}
