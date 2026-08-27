import { resolveCoverImage } from "@/lib/cover";

export interface PublicBook {
  id: string;
  title: string;
  author: string;
  publisher: string | null;
  isbn: string | null;
  year: number | null;
  pages: number | null;
  synopsis: string | null;
  coverColor: string;
  coverImage: string | null;
  language: string | null;
  subject: string | null;
  source: string | null;
  sourceUrl: string | null;
  category: { id: string; name: string } | null;
  location: { id: string; name: string; code: string } | null;
  available: number;
  total: number;
}

export function toPublicBook(book: {
  id: string;
  title: string;
  author: string;
  publisher?: string | null;
  isbn?: string | null;
  year?: number | null;
  pages?: number | null;
  synopsis?: string | null;
  coverColor: string;
  coverImage?: string | null;
  language?: string | null;
  subject?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  category?: { id: string; name: string } | null;
  location?: { id: string; name: string; code: string } | null;
  items?: { status: string }[];
}): PublicBook {
  const items = book.items ?? [];
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    publisher: book.publisher ?? null,
    isbn: book.isbn ?? null,
    year: book.year ?? null,
    pages: book.pages ?? null,
    synopsis: book.synopsis ?? null,
    coverColor: book.coverColor,
    coverImage: resolveCoverImage({ coverImage: book.coverImage, isbn: book.isbn }),
    language: book.language ?? null,
    subject: book.subject ?? null,
    source: book.source ?? null,
    sourceUrl: book.sourceUrl ?? null,
    category: book.category ?? null,
    location: book.location ?? null,
    available: items.filter((i) => i.status === "AVAILABLE").length,
    total: items.length,
  };
}

export function aisleHint(code: string | null | undefined): string {
  if (!code) return "Tanyakan ke petugas di meja sirkulasi.";
  const letter = code.trim().charAt(0).toUpperCase();
  if (letter <= "C") return "Lorong kiri, dekat pintu masuk.";
  if (letter <= "E") return "Lorong tengah.";
  return "Lorong kanan, dekat ruang baca.";
}
