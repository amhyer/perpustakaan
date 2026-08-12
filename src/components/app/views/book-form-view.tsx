"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookPlus,
  ImagePlus,
  Loader2,
  Save,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

import { BookCover } from "@/components/app/shared/book-cover";
import { PageHeader } from "@/components/app/shared/page-header";
import { AutocompleteInput } from "@/components/app/shared/autocomplete-input";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COVER_COLORS } from "@/lib/constants";

interface Category {
  id: string;
  name: string;
  code: string;
}
interface Location {
  id: string;
  name: string;
  code: string;
}
interface MasterEntry {
  id: string;
  name: string;
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
  categoryId: string | null;
  locationId: string | null;
}

interface FormState {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  year: string;
  pages: string;
  language: string;
  subject: string;
  synopsis: string;
  categoryId: string;
  locationId: string;
  coverColor: string;
  coverImage: string;
  itemCount: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  author: "",
  publisher: "",
  isbn: "",
  year: "",
  pages: "",
  language: "Indonesia",
  subject: "",
  synopsis: "",
  categoryId: "",
  locationId: "",
  coverColor: COVER_COLORS[0],
  coverImage: "",
  itemCount: "3",
};

export function BookFormView({ bookId }: { bookId?: string }) {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const isEdit = !!bookId;

  const { data: categories } = useFetch<Category[]>("/api/categories");
  const { data: locations } = useFetch<Location[]>("/api/locations");
  // Master data untuk autocomplete (Tahap 15-C)
  const { data: publishers } = useFetch<MasterEntry[]>("/api/publishers");
  const { data: authors } = useFetch<MasterEntry[]>("/api/authors");
  const publisherSuggestions = (publishers ?? []).map((p) => p.name);
  const authorSuggestions = (authors ?? []).map((a) => a.name);

  // Fetch existing book in edit mode
  const { data: existingBook, loading: loadingBook } = useFetch<BookDetail>(
    isEdit ? `/api/books/${bookId}` : null,
    { deps: [bookId, isEdit] }
  );

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Prefill when edit data arrives
  useEffect(() => {
    if (isEdit && existingBook) {
      setForm({
        title: existingBook.title || "",
        author: existingBook.author || "",
        publisher: existingBook.publisher || "",
        isbn: existingBook.isbn || "",
        year: existingBook.year ? String(existingBook.year) : "",
        pages: existingBook.pages ? String(existingBook.pages) : "",
        language: existingBook.language || "Indonesia",
        subject: existingBook.subject || "",
        synopsis: existingBook.synopsis || "",
        categoryId: existingBook.categoryId || "",
        locationId: existingBook.locationId || "",
        coverColor: existingBook.coverColor || COVER_COLORS[0],
        coverImage: existingBook.coverImage || "",
        itemCount: "3",
      });
    }
  }, [isEdit, existingBook]);

  // Guard: librarian only
  if (user?.role !== "LIBRARIAN") {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setView("catalog")} />
        <Card className="p-8 text-center max-w-md mx-auto">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Akses Ditolak</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Halaman ini hanya tersedia untuk pustakawan.
          </p>
          <Button onClick={() => setView("catalog")} className="mt-4">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Katalog
          </Button>
        </Card>
      </div>
    );
  }

  if (isEdit && loadingBook) {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setView("catalog")} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleUploadCover(file: File) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Format file tidak didukung (hanya JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 3MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Gagal mengunggah gambar");
      }
      const data = (await res.json()) as { url: string };
      update("coverImage", data.url);
      toast.success("Gambar cover berhasil diunggah");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah gambar");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) {
      toast.error("Judul dan pengarang wajib diisi");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      author: form.author.trim(),
      publisher: form.publisher.trim() || null,
      isbn: form.isbn.trim() || null,
      year: form.year ? parseInt(form.year, 10) : null,
      pages: form.pages ? parseInt(form.pages, 10) : null,
      language: form.language.trim() || "Indonesia",
      subject: form.subject.trim() || null,
      synopsis: form.synopsis.trim() || null,
      categoryId: form.categoryId || null,
      locationId: form.locationId || null,
      coverColor: form.coverColor,
      coverImage: form.coverImage || null,
    };
    if (!isEdit) {
      payload.itemCount = parseInt(form.itemCount || "1", 10);
    }
    try {
      if (isEdit) {
        await api.put(`/api/books/${bookId}`, payload);
        toast.success("Buku berhasil diperbarui");
        setView("book-detail", { id: bookId! });
      } else {
        const created = await api.post<{ id: string }>("/api/books", payload);
        toast.success("Buku baru berhasil ditambahkan");
        setView("book-detail", { id: created.id });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan buku");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackButton onClick={() => setView("catalog")} />

      <PageHeader
        title={isEdit ? "Edit Buku" : "Tambah Buku Baru"}
        description={
          isEdit
            ? "Perbarui informasi buku di katalog"
            : "Lengkapi data untuk menambahkan buku baru ke katalog"
        }
        icon={BookPlus}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Form fields */}
        <div className="space-y-6 min-w-0">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="title">
                  Judul <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="cth. Laskar Pelangi"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="author">
                  Pengarang <span className="text-destructive">*</span>
                </Label>
                <AutocompleteInput
                  id="author"
                  value={form.author}
                  onChange={(v) => update("author", v)}
                  placeholder="cth. Andrea Hirata"
                  suggestions={authorSuggestions}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="publisher">Penerbit</Label>
                <AutocompleteInput
                  id="publisher"
                  value={form.publisher}
                  onChange={(v) => update("publisher", v)}
                  placeholder="cth. Bentang Pustaka"
                  suggestions={publisherSuggestions}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={form.isbn}
                  onChange={(e) => update("isbn", e.target.value)}
                  placeholder="cth. 978-979-3062-79-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subjek</Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  placeholder="cth. Fiksi Indonesia"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year">Tahun Terbit</Label>
                <Input
                  id="year"
                  type="number"
                  value={form.year}
                  onChange={(e) => update("year", e.target.value)}
                  placeholder="cth. 2005"
                  min={1900}
                  max={2100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pages">Jumlah Halaman</Label>
                <Input
                  id="pages"
                  type="number"
                  value={form.pages}
                  onChange={(e) => update("pages", e.target.value)}
                  placeholder="cth. 529"
                  min={1}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language">Bahasa</Label>
                <Input
                  id="language"
                  value={form.language}
                  onChange={(e) => update("language", e.target.value)}
                  placeholder="Indonesia"
                />
              </div>
            </CardContent>
          </Card>

          {/* Classification & synopsis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Klasifikasi & Sinopsis</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="categoryId">Kategori</Label>
                <Select
                  value={form.categoryId || "NONE"}
                  onValueChange={(v) => update("categoryId", v === "NONE" ? "" : v)}
                >
                  <SelectTrigger id="categoryId" className="w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— Tidak ada —</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locationId">Lokasi / Rak</Label>
                <Select
                  value={form.locationId || "NONE"}
                  onValueChange={(v) => update("locationId", v === "NONE" ? "" : v)}
                >
                  <SelectTrigger id="locationId" className="w-full">
                    <SelectValue placeholder="Pilih lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— Tidak ada —</SelectItem>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="synopsis">Sinopsis</Label>
                <Textarea
                  id="synopsis"
                  value={form.synopsis}
                  onChange={(e) => update("synopsis", e.target.value)}
                  placeholder="Tuliskan ringkasan isi buku..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cover & items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover & Eksemplar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Warna Cover</Label>
                <div className="flex flex-wrap gap-2">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update("coverColor", c)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        form.coverColor === c
                          ? "border-foreground scale-110 shadow-md"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Pilih warna ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover-upload">Cover Gambar (opsional)</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="cover-upload"
                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    {uploading ? "Mengunggah..." : "Unggah Gambar"}
                  </label>
                  <Input
                    id="cover-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadCover(f);
                    }}
                  />
                  {form.coverImage && (
                    <div className="flex items-center gap-2">
                      <img
                        src={form.coverImage}
                        alt="Preview cover"
                        className="h-12 w-9 rounded object-cover border"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => update("coverImage", "")}
                        aria-label="Hapus gambar cover"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG/PNG/WEBP, maks 3MB. Jika tidak diunggah, cover gradient warna akan dipakai.
                </p>
              </div>

              {!isEdit && (
                <div className="space-y-1.5">
                  <Label htmlFor="itemCount">Jumlah Eksemplar</Label>
                  <Input
                    id="itemCount"
                    type="number"
                    value={form.itemCount}
                    onChange={(e) => update("itemCount", e.target.value)}
                    min={1}
                    max={50}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Berapa banyak salinan fisik buku ini yang didaftarkan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit row */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setView("catalog")}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? "Simpan Perubahan" : "Tambah Buku"}
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pratinjau Cover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.coverImage ? (
                <img
                  src={form.coverImage}
                  alt={form.title || "Cover buku"}
                  className="aspect-[3/4] w-full rounded-lg object-cover shadow-md"
                />
              ) : (
                <BookCover
                  title={form.title || "Judul Buku"}
                  author={form.author || "Pengarang"}
                  color={form.coverColor}
                  size="md"
                />
              )}
              <div className="space-y-1 text-center">
                <p className="font-semibold text-sm leading-tight">
                  {form.title || "Judul Buku"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {form.author || "Pengarang"}
                </p>
                {form.categoryId && categories && (
                  <p className="text-xs text-muted-foreground">
                    {categories.find((c) => c.id === form.categoryId)?.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
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
