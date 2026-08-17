// src/lib/sibi-client.ts

import { SIBI } from "./sibi-types";

const API_BASE_URL = "https://api.buku.cloudapp.web.id/api";

type SibiBookSource = "getTextBooks" | "getPenggerakTextBooks" | "getNonTextBooks";

async function fetchFromSIBI<T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<T> {
  const url = new URL(`${API_BASE_URL}/catalogue/${endpoint}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, String(value))
  );

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from SIBI API: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

export async function getTextBooks(
  search: string,
  limit: number = 2000
): Promise<SIBI.Book[]> {
  const books = await fetchFromSIBI<SIBI.Book[]>("getTextBooks", { limit });
  if (!search) return books;
  return books.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.writer?.toLowerCase().includes(search.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(search.toLowerCase())
  );
}

export async function getPenggerakTextBooks(
  search: string,
  limit: number = 2000
): Promise<SIBI.Book[]> {
  const books = await fetchFromSIBI<SIBI.Book[]>("getPenggerakTextBooks", {
    limit,
  });
  if (!search) return books;
  return books.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.writer?.toLowerCase().includes(search.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(search.toLowerCase())
  );
}

export async function getNonTextBooks(
  search: string,
  limit: number = 3000
): Promise<SIBI.Book[]> {
  const books = await fetchFromSIBI<SIBI.Book[]>("getNonTextBooks", { limit });
  if (!search) return books;
  return books.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.writer?.toLowerCase().includes(search.toLowerCase())
  );
}

export async function getBooksByTag(tag: string): Promise<SIBI.Book[]> {
  return fetchFromSIBI<SIBI.Book[]>("getBooksByTag", { tag });
}

export async function getBookDetails(
  source: SibiBookSource,
  id: string
): Promise<SIBI.Book | null> {
    const params = { limit: 5000 };
    const books = await fetchFromSIBI<SIBI.Book[]>(source, params);
    return books.find((book) => book.id === id) || null;
}
