// src/app/api/books/import-sibi/route.ts

import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { db } from "@/lib/db";
import { sibi } from "@/lib/sibi-client";
import type { SibiBook, SibiListResponse, SibiSourceType } from "@/lib/sibi-types";

const VALID_SOURCES: SibiSourceType[] = ["text-k13", "penggerak", "non-teks", "tag"];

/** Ambil detail buku SIBI by id dari dataset penuh sumbernya (API SIBI tidak punya lookup by id). */
async function findBookById(source: SibiSourceType, sibiId: string, tag?: string): Promise<SibiBook | null> {
  let data: SibiListResponse;
  switch (source) {
    case "tag":
      data = await sibi.getBooksByTag(tag ?? "", 5000);
      break;
    case "penggerak":
      data = await sibi.getPenggerakTextBooks(5000);
      break;
    case "non-teks":
      data = await sibi.getNonTextBooks(5000);
      break;
    default:
      data = await sibi.getTextBooks(5000);
  }
  return data.results.find((b) => b.id === sibiId) || null;
}

export async function GET(request: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const rawSource = searchParams.get("source") || "text-k13";
  const tag = searchParams.get("tag") || undefined;

  const source = (VALID_SOURCES.includes(rawSource as SibiSourceType)
    ? (rawSource as SibiSourceType)
    : "text-k13") as SibiSourceType;

  try {
    const results =
      source === "tag"
        ? (await sibi.getBooksByTag(tag || q, 100)).results
        : await sibi.search(q, source, 2000);
    return NextResponse.json(results.slice(0, 50));
  } catch (error) {
    console.error("SIBI import GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from SIBI" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { sibiId, source, tag } = await request.json();

  if (!sibiId || !source) {
    return NextResponse.json(
      { error: "sibiId and source are required" },
      { status: 400 }
    );
  }

  if (!VALID_SOURCES.includes(source as SibiSourceType)) {
    return NextResponse.json(
      { error: `Sumber tidak valid. Gunakan: ${VALID_SOURCES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const existingBook = await db.book.findUnique({
      where: { sibiId },
    });

    if (existingBook) {
      return NextResponse.json(
        { error: `Buku dengan SIBI ID ${sibiId} sudah pernah diimpor.` },
        { status: 409 }
      );
    }

    const bookData = await findBookById(source as SibiSourceType, sibiId, tag);
    if (!bookData) {
      return NextResponse.json(
        { error: `Book with SIBI ID ${sibiId} not found.` },
        { status: 404 }
      );
    }

    // Dedupe ISBN (Tahap 12): jangan impor buku yang ISBN-nya sudah ada di katalog
    const isbnNormalized = bookData.isbn?.replace(/[-\s]/g, "");
    if (isbnNormalized) {
      const withIsbn = await db.book.findMany({ where: { isbn: { not: null } }, select: { isbn: true } });
      const isbnDup = withIsbn.find((b) => b.isbn!.replace(/[-\s]/g, "") === isbnNormalized);
      if (isbnDup) {
        return NextResponse.json(
          { error: `Buku dengan ISBN ${bookData.isbn} sudah ada di katalog. Impor dibatalkan.` },
          { status: 409 }
        );
      }
    }

    // Tahun terbit: published_year, fallback ke edition (biasanya "2018").
    const yearRaw = bookData.published_year ?? bookData.edition;
    const year = yearRaw ? parseInt(String(yearRaw), 10) : undefined;

    // Halaman: parse angka dari collation (mis. "XII, 190 p." -> 190)
    const pagesMatch = bookData.collation?.match(/(\d+)\s*(p|h)?\.?\s*(p|h)?\.?$/i);
    const pages = pagesMatch ? parseInt(pagesMatch[1], 10) : null;

    const createdBook = await db.book.create({
      data: {
        title: bookData.title,
        author: bookData.writer || "N/A",
        publisher: bookData.publisher,
        isbn: bookData.isbn,
        year: year && !isNaN(year) && year > 1900 ? year : undefined,
        pages: pages || undefined,
        synopsis: bookData.description || undefined,
        coverImage: bookData.image,
        language: bookData.language || "Indonesia",
        subject: bookData.subject || bookData.category,
        source: "SIBI",
        sourceUrl: bookData.attachment,
        sibiId: bookData.id,
        importedAt: new Date(),
        items: {
          create: {
            itemCode: `SI-${bookData.id.slice(-8)}-1`,
            status: "AVAILABLE",
            condition: "BAIK",
          },
        },
      },
    });

    const withItems = await db.book.findUnique({
      where: { id: createdBook.id },
      include: { items: true },
    });

    return NextResponse.json(withItems ?? createdBook, { status: 201 });
  } catch (error) {
    console.error("SIBI import POST error:", error);
    return NextResponse.json(
      { error: "Failed to import book from SIBI" },
      { status: 500 }
    );
  }
}