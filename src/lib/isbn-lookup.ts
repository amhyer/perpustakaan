import path from "path";
import { promises as fs } from "fs";
import { db } from "@/lib/db";
import { ensureUploadDir, generateUniqueFileName, UPLOAD_DIR, COVER_ALLOWED_MIME } from "@/lib/upload";

export const COVERS_SUBDIR = "covers";
export const COVERS_DIR = path.join(UPLOAD_DIR, COVERS_SUBDIR);
export const COVERS_URL_PREFIX = `/api/uploads/${COVERS_SUBDIR}`;
export const LOOKUP_TIMEOUT_MS = 5000;

export interface ISBNNormalizedData {
  title: string | null;
  authors: string[] | null;
  publisher: string | null;
  publishedYear: string | null;
  description: string | null;
  categories: string[] | null;
  isbn: string;
  coverImageUrl: string | null;
}

export interface ISBNLookupResult {
  status: "FOUND" | "DUPLICATE" | "NOT_FOUND" | "ERROR";
  data?: ISBNNormalizedData;
  book?: { id: string; title: string; isbn: string | null };
  message?: string;
}

export interface ISBNBook {
  id: string;
  title: string;
  isbn: string | null;
}

const ALLOWED_COVER_MIME = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];

interface OLBook {
  title: string;
  authors?: { name: string }[];
  publishers?: { name: string }[];
  publish_date?: string;
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
  cover?: { large?: string; medium?: string };
  subjects?: { name: string }[];
  notes?: string | { value: string };
  description?: string | { value: string };
  error?: boolean;
}

interface GBBook {
  title: string;
  authors?: string[];
  publisher: string;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  industryIdentifiers?: { type: string; identifier: string }[];
}

interface GBBookItem {
  id: string;
  volumeInfo: GBBook;
}

/**
 * Check if ISBN already exists in local database.
 */
export async function checkISBNInDatabase(isbn: string): Promise<ISBNBook | null> {
  const existing = await db.book.findFirst({
    where: { isbn },
    select: { id: true, title: true, isbn: true },
  });
  if (!existing) return null;
  return { id: existing.id, title: existing.title, isbn: existing.isbn };
}

/**
 * Download cover image from URL, save to COVERS_DIR, return local URL.
 */
export async function downloadAndSaveCover(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!COVER_ALLOWED_MIME.includes(contentType)) {
      // Fallback: use content-type extension
      const ext = ".jpg";
      const buffer = Buffer.from(await response.arrayBuffer());
      await ensureUploadDir(COVERS_DIR);
      const filename = generateUniqueFileName(`cover-${Date.now()}${ext}`);
      await fs.writeFile(path.join(COVERS_DIR, filename), buffer);
      return `${COVERS_URL_PREFIX}/${filename}`;
    }

    const ext = `.${contentType.split("/")[1].split(";")[0]}`;
    const buffer = Buffer.from(await response.arrayBuffer());
    await ensureUploadDir(COVERS_DIR);
    const filename = generateUniqueFileName(`cover-${Date.now()}${ext}`);
    await fs.writeFile(path.join(COVERS_DIR, filename), buffer);
    return `${COVERS_URL_PREFIX}/${filename}`;
  } catch (e) {
    console.error("[isbn-lookup] Gagal download cover buku:", e);
    return null;
  }
}

/**
 * Fetch book data from Open Library API.
 */
async function fetchOpenLibrary(isbn: string): Promise<ISBNNormalizedData | null> {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const response = await fetch(url, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
    if (!response.ok) return null;

    const data: Record<string, OLBook> = await response.json();
    const book = data[`ISBN:${isbn}`];
    if (!book || book.error) return null;

    let description: string | null = null;
    if (book.description) {
      description = typeof book.description === "string" ? book.description : book.description.value;
    }

    const authors = book.authors?.map((a) => a.name) ?? null;
    const categories = book.subjects?.map((s) => s.name) ?? null;

    let coverImageUrl: string | null = null;
    if (book.cover?.large) {
      coverImageUrl = book.cover.large.replace("http://", "https://");
    }

    return {
      title: book.title ?? null,
      authors,
      publisher: book.publishers?.[0]?.name ?? null,
      publishedYear: book.publish_date ?? null,
      description,
      categories,
      isbn,
      coverImageUrl,
    };
  } catch (e) {
    console.error("[isbn-lookup] Gagal fetch dari Open Library:", e);
    return null;
  }
}

/**
 * Fetch book data from Google Books API.
 */
async function fetchGoogleBooks(isbn: string): Promise<ISBNNormalizedData | null> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
    if (!response.ok) return null;

    const data: { items?: GBBookItem[] } = await response.json();
    if (!data.items || data.items.length === 0) return null;

    const book = data.items[0].volumeInfo;
    if (!book) return null;

    const authors: string[] = book.authors ?? [];
    const categories = book.categories ?? null;

    let coverImageUrl: string | null = null;
    if (book.imageLinks?.thumbnail) {
      coverImageUrl = book.imageLinks.thumbnail.replace("http://", "https://");
    } else if (book.imageLinks?.smallThumbnail) {
      coverImageUrl = book.imageLinks.smallThumbnail.replace("http://", "https://");
    }

    return {
      title: book.title ?? null,
      authors: authors.length > 0 ? authors : null,
      publisher: book.publisher ?? null,
      publishedYear: book.publishedDate ?? null,
      description: book.description ?? null,
      categories,
      isbn,
      coverImageUrl,
    };
  } catch (e) {
    console.error("[isbn-lookup] Gagal fetch dari Google Books:", e);
    return null;
  }
}

/**
 * Main ISBN lookup function.
 * 1. Check local DB for existing ISBN (duplicate check)
 * 2. Query OpenLibrary → fallback Google Books
 * 3. Download cover image if available
 */
export async function lookupISBN(isbn: string): Promise<ISBNLookupResult> {
  // Step 1: Check local database for duplicate
  const existingBook = await checkISBNInDatabase(isbn);
  if (existingBook) {
    return {
      status: "DUPLICATE",
      book: existingBook,
      message: `Buku dengan ISBN ${isbn} sudah ada di katalog`,
    };
  }

  // Step 2: Query OpenLibrary first
  let data = await fetchOpenLibrary(isbn);

  // Step 3: Fallback to Google Books
  if (!data) {
    data = await fetchGoogleBooks(isbn);
  }

  if (!data) {
    return {
      status: "NOT_FOUND",
      message: "Data buku tidak ditemukan di OpenLibrary maupun Google Books",
    };
  }

  // Step 4: Download cover image if available
  let localCoverUrl: string | null = null;
  if (data.coverImageUrl) {
    localCoverUrl = await downloadAndSaveCover(data.coverImageUrl);
  }

  return {
    status: "FOUND",
    data: {
      ...data,
      coverImageUrl: localCoverUrl,
    },
  };
}
