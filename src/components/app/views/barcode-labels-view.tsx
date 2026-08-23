"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Tag,
  Printer,
  CheckSquare,
  Square,
  Search,
  Filter,
  X,
  Settings as SettingsIcon,
  QrCodeIcon,
  Download,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Badge } from "@/components/ui/data-display/badge";
import { Checkbox } from "@/components/ui/form/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { Barcode } from "@/components/app/shared/barcode";
import { QrCode } from "@/components/app/shared/qr-code";
import { useAppStore } from "@/store/use-app-store";

interface BookItem {
  id: string;
  bookId: string;
  itemCode: string;
  status: string;
  condition: string;
  book: {
    id: string;
    title: string;
    author: string;
  };
}

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
}

const PAGE_SIZES = {
  A4: { width: 210, height: 297, cols: 3, rows: 8 }, // mm, 24 labels
  LETTER: { width: 216, height: 279, cols: 3, rows: 9 },
  A6: { width: 105, height: 148, cols: 2, rows: 4 },
} as const;

type PageSize = keyof typeof PAGE_SIZES;

export function BarcodeLabelsView() {
  const user = useAppStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [labelFormat, setLabelFormat] = useState<"CODE128" | "QR">("CODE128");
  const [showSettings, setShowSettings] = useState(false);

  // Guard: pustakawan only
  if (user?.role !== "LIBRARIAN" && user?.role !== "PUSTAKAWAN_JUNIOR") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cetak Label Barcode"
          description="Generate label barcode/QR untuk eksemplar buku"
          icon={Tag}
        />
        <Card className="p-6">
          <EmptyState
            icon={Tag}
            title="Akses Ditolak"
            description="Hanya pustakawan yang dapat mencetak label."
          />
        </Card>
      </div>
    );
  }

  // Fetch all books
  const { data: books, loading: loadingBooks } = useFetch<Book[]>(
    "/api/books?pageSize=500"
  );

  // Fetch all book items (eksemplar)
  const { data: items, loading: loadingItems } = useFetch<BookItem[]>(
    "/api/book-items/all?pageSize=1000" // Custom endpoint we'll add
  );

  // Filter books by search
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    if (!search.trim()) return books.slice(0, 100); // Limit untuk performance
    const s = search.toLowerCase();
    return books
      .filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          b.author.toLowerCase().includes(s) ||
          b.isbn?.includes(s)
      )
      .slice(0, 100);
  }, [books, search]);

  // Get items for selected books
  const selectedBookItems = useMemo(() => {
    if (!items) return [];
    return items.filter((i) => selectedBooks.has(i.bookId));
  }, [items, selectedBooks]);

  const toggleBook = (bookId: string) => {
    setSelectedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedBooks((prev) => {
      const next = new Set(prev);
      filteredBooks.forEach((b) => next.add(b.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedBooks(new Set());
    setSelectedItems(new Set());
  };

  const handlePrint = () => {
    if (selectedBooks.size === 0) {
      toast.error("Pilih minimal 1 buku");
      return;
    }
    window.print();
  };

  const handleExportCSV = () => {
    if (!selectedBookItems.length) {
      toast.error("Tidak ada data");
      return;
    }
    const csv = [
      ["Item Code", "Book Title", "Author", "Status"].join(","),
      ...selectedBookItems.map((i) =>
        [i.itemCode, `"${i.book.title}"`, `"${i.book.author}"`, i.status].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode-labels-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV diunduh");
  };

  const { cols, rows } = PAGE_SIZES[pageSize];
  const labelsPerPage = cols * rows;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cetak Label Barcode"
        description="Generate label barcode/QR untuk eksemplar buku. Pilih buku, atur layout, lalu cetak."
        icon={Tag}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2"
            >
              <SettingsIcon className="h-4 w-4" />
              {showSettings ? "Sembunyikan" : "Aturan"} Cetak
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              disabled={selectedBookItems.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={handlePrint}
              disabled={selectedBooks.size === 0}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Cetak {selectedBooks.size > 0 && `(${selectedBooks.size})`}
            </Button>
          </div>
        }
      />

      {/* Print settings panel */}
      {showSettings && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="page-size">Ukuran Kertas</Label>
                <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
                  <SelectTrigger id="page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (24 label/halaman)</SelectItem>
                    <SelectItem value="LETTER">Letter (27 label/halaman)</SelectItem>
                    <SelectItem value="A6">A6 (8 label/halaman)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="format">Format</Label>
                <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as any)}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CODE128">Code 128 (Barcode)</SelectItem>
                    <SelectItem value="QR">QR Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Tip: Untuk label eksemplar fisik, gunakan Code 128. Untuk QR ke digital, gunakan QR Code.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Book selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pilih Buku</CardTitle>
              <CardDescription>
                {loadingBooks ? "Memuat..." : `${filteredBooks.length} buku ditemukan`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari judul, pengarang, ISBN..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllFiltered}
                    className="gap-1.5"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Pilih Semua
                  </Button>
                  {selectedBooks.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="gap-1.5"
                    >
                      <X className="h-4 w-4" />
                      Reset
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
                  {loadingBooks ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : filteredBooks.length === 0 ? (
                    <EmptyState
                      icon={Search}
                      title="Tidak ada buku"
                      description="Coba kata kunci lain"
                    />
                  ) : (
                    filteredBooks.map((book) => {
                      const isSelected = selectedBooks.has(book.id);
                      return (
                        <button
                          key={book.id}
                          onClick={() => toggleBook(book.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                            isSelected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{book.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {book.author} {book.isbn && `· ${book.isbn}`}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview & Info</CardTitle>
              <CardDescription>Layout: {pageSize} ({labelsPerPage} label/halaman)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buku dipilih</span>
                  <span className="font-semibold">{selectedBooks.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Eksemplar</span>
                  <span className="font-semibold">{selectedBookItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Halaman dibutuhkan</span>
                  <span className="font-semibold">
                    {Math.ceil(selectedBookItems.length / labelsPerPage) || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format</span>
                  <Badge variant="outline">{labelFormat}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print preview area — only visible on print */}
      {selectedBookItems.length > 0 && (
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="print:hidden">
            <CardTitle className="text-base">Preview Cetak ({selectedBookItems.length} label)</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {selectedBookItems.slice(0, labelsPerPage).map((item) => (
                <div
                  key={item.id}
                  className="border-2 border-dashed border-muted p-3 rounded flex flex-col items-center gap-1 print:border-solid print:border-black"
                >
                  <div className="text-[10px] text-center line-clamp-2 w-full font-medium text-foreground">
                    {item.book.title}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate w-full text-center">
                    {item.book.author}
                  </div>
                  <div className="bg-white p-1 rounded">
                    {labelFormat === "CODE128" ? (
                      <Barcode
                        value={item.itemCode}
                        width={1.5}
                        height={40}
                        fontSize={9}
                        margin={2}
                      />
                    ) : (
                      <QrCode value={`perpustakaan://item/${item.itemCode}`} size={80} />
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">{item.itemCode}</div>
                </div>
              ))}
            </div>
            {selectedBookItems.length > labelsPerPage && (
              <p className="text-xs text-muted-foreground text-center mt-4 print:hidden">
                + {selectedBookItems.length - labelsPerPage} label lainnya (cetak untuk lihat semua)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Print-specific CSS */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\\\:hidden { display: none !important; }
          .print\\\\:shadow-none { box-shadow: none !important; }
          .print\\\\:border-0 { border: 0 !important; }
          .print\\\\:border-solid { border-style: solid !important; }
          .print\\\\:border-black { border-color: black !important; }
        }
      `}</style>
    </div>
  );
}
