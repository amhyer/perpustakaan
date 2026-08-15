"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Filter,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

import { BookCard, type BookWithDetails } from "@/components/app/shared/book-card";
import { EmptyState, PageHeader } from "@/components/app/shared/page-header";
import { LoadingGrid } from "@/components/app/shared/loading";

import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Badge } from "@/components/ui/data-display/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

interface Location {
  id: string;
  name: string;
  code: string;
}

type SortKey = "title-asc" | "title-desc" | "newest";

const SORT_LABELS: Record<SortKey, string> = {
  "title-asc": "Judul A-Z",
  "title-desc": "Judul Z-A",
  newest: "Terbaru",
};

export function CatalogView() {
  const user = useAppStore((s) => s.user);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  const initialQ = view.params.q || "";

  // Filter state
  const [searchInput, setSearchInput] = useState(initialQ);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [categoryId, setCategoryId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("title-asc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1); // Reset ke halaman 1 saat search berubah
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch filters options
  const { data: categories } = useFetch<Category[]>("/api/categories");
  const { data: locations } = useFetch<Location[]>("/api/locations");

  // Build books URL with pagination
  const booksUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (categoryId) params.set("categoryId", categoryId);
    if (locationId) params.set("locationId", locationId);
    if (year) params.set("year", year);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const qs = params.toString();
    return `/api/books${qs ? `?${qs}` : ""}`;
  }, [searchQuery, categoryId, locationId, year, page]);

  const { data: booksResp, loading, error } = useFetch<{ data: BookWithDetails[]; total: number; page: number; pageSize: number; totalPages: number }>(
    booksUrl,
    { deps: [booksUrl] }
  );
  const books = booksResp?.data ?? [];
  const totalPages = booksResp?.totalPages ?? 1;

  // Client-side sort
  const sortedBooks = useMemo(() => {
    if (!books) return [];
    const arr = [...books];
    switch (sort) {
      case "title-asc":
        arr.sort((a, b) => a.title.localeCompare(b.title, "id"));
        break;
      case "title-desc":
        arr.sort((a, b) => b.title.localeCompare(a.title, "id"));
        break;
      case "newest":
        arr.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
    }
    return arr;
  }, [books, sort]);

  const activeFilterCount =
    (categoryId ? 1 : 0) + (locationId ? 1 : 0) + (year ? 1 : 0);

  function handleResetFilters() {
    setCategoryId("");
    setLocationId("");
    setYear("");
    setSearchInput("");
    setSearchQuery("");
    toast.success("Filter telah direset");
  }

  function handleSubmitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog Buku"
        description="Telusuri koleksi perpustakaan kami"
        icon={BookOpen}
        actions={
          (user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR") ? (
            <Button onClick={() => setView("book-form")} size="sm">
              <Plus className="h-4 w-4" />
              Tambah Buku
            </Button>
          ) : undefined
        }
      />

      {/* Search bar */}
      <Card className="p-4">
        <form onSubmit={handleSubmitSearch} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Cari judul, pengarang, penerbit, atau ISBN..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-11 text-base"
                aria-label="Cari buku"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters((v) => !v)}
                className="h-11"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 bg-background text-foreground border-0 px-1.5 py-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-11 w-[160px]" aria-label="Urutkan">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SORT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="filter-category" className="text-xs">
                  Kategori
                </Label>
                <Select
                  value={categoryId || "ALL"}
                  onValueChange={(v) => { setCategoryId(v === "ALL" ? "" : v); setPage(1); }}
                >
                  <SelectTrigger id="filter-category" className="w-full">
                    <SelectValue placeholder="Semua kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua kategori</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-location" className="text-xs">
                  Lokasi / Rak
                </Label>
                <Select
                  value={locationId || "ALL"}
                  onValueChange={(v) => { setLocationId(v === "ALL" ? "" : v); setPage(1); }}
                >
                  <SelectTrigger id="filter-location" className="w-full">
                    <SelectValue placeholder="Semua lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua lokasi</SelectItem>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-year" className="text-xs">
                  Tahun Terbit
                </Label>
                <Input
                  id="filter-year"
                  type="number"
                  placeholder="cth. 2023"
                  value={year}
                  onChange={(e) => { setYear(e.target.value); setPage(1); }}
                  min={1900}
                  max={2100}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="w-full justify-start text-muted-foreground"
                  disabled={activeFilterCount === 0 && !searchInput}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Filter
                </Button>
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* Results summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {loading ? (
            "Memuat..."
          ) : (
            <>
              Menampilkan{" "}
              <span className="font-semibold text-foreground">
                {sortedBooks.length}
              </span>{" "}
              buku
              {searchQuery && (
                <>
                  {" "}untuk “<span className="text-foreground">{searchQuery}</span>”
                </>
              )}
            </>
          )}
        </p>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingGrid />
      ) : error ? (
        <EmptyState
          icon={BookOpen}
          title="Gagal memuat buku"
          description={error}
          action={{ label: "Coba lagi", onClick: () => window.location.reload() }}
        />
      ) : sortedBooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Tidak ada buku ditemukan"
          description="Coba ubah kata kunci pencarian atau reset filter untuk melihat semua koleksi."
          action={
            activeFilterCount > 0 || searchQuery
              ? { label: "Reset Filter", onClick: handleResetFilters }
              : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          {/* Pagination (Tahap 16 #26) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Hal. {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Berikutnya →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
