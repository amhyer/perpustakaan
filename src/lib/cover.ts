/** Sampul otomatis dari ISBN (Open Library) jika pustakawan belum unggah gambar. */

export function normalizeIsbn(isbn: string | null | undefined): string | null {
  if (!isbn) return null;
  const cleaned = isbn.replace(/[-\s]/g, "");
  return /^(\d{10}|\d{13})$/.test(cleaned) ? cleaned : null;
}

export function coverFromIsbn(isbn: string | null | undefined): string | null {
  const cleaned = normalizeIsbn(isbn);
  if (!cleaned) return null;
  return `https://covers.openlibrary.org/b/isbn/${cleaned}-L.jpg`;
}

export function resolveCoverImage(book: {
  coverImage?: string | null;
  isbn?: string | null;
}): string | null {
  if (book.coverImage) return book.coverImage;
  return coverFromIsbn(book.isbn);
}
