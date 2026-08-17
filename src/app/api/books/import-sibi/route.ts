// src/app/api/books/import-sibi/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as sibi from "@/lib/sibi-client";
import { SIBI } from "@/lib/sibi-types";

type SibiSource = "text-k13" | "text-kurmer" | "non-text";

function mapSourceToFunction(
  source: SibiSource
): (search: string) => Promise<SIBI.Book[]> {
  switch (source) {
    case "text-k13":
      return sibi.getTextBooks;
    case "text-kurmer":
      return sibi.getPenggerakTextBooks;
    case "non-text":
      return sibi.getNonTextBooks;
  }
}

function mapSourceToEndpointString(
    source: SibiSource
  ): "getTextBooks" | "getPenggerakTextBooks" | "getNonTextBooks" {
    switch (source) {
      case "text-k13":
        return "getTextBooks";
      case "text-kurmer":
        return "getPenggerakTextBooks";
      case "non-text":
        return "getNonTextBooks";
    }
  }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const source = (searchParams.get("source") as SibiSource) || "text-k13";

  try {
    const fetchFunction = mapSourceToFunction(source);
    const results = await fetchFunction(q);
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
  const { sibiId, source } = await request.json();

  if (!sibiId || !source) {
    return NextResponse.json(
      { error: "sibiId and source are required" },
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

    const endpointString = mapSourceToEndpointString(source);
    const bookData = await sibi.getBookDetails(endpointString, sibiId);

    if (!bookData) {
      return NextResponse.json(
        { error: `Book with SIBI ID ${sibiId} not found.` },
        { status: 404 }
      );
    }

    const createdBook = await db.book.create({
      data: {
        title: bookData.title,
        author: bookData.writer || "N/A",
        publisher: bookData.publisher,
        isbn: bookData.isbn,
        year: bookData.publish_date
          ? new Date(bookData.publish_date).getFullYear()
          : undefined,
        pages: bookData.total_page || undefined,
        synopsis: bookData.description,
        coverImage: bookData.image,
        language: "Indonesia",
        subject: bookData.tags,
        source: "SIBI",
        sourceUrl: bookData.attachment,
        sibiId: bookData.id,
        importedAt: new Date(),
      },
    });

    return NextResponse.json(createdBook, { status: 201 });
  } catch (error) {
    console.error("SIBI import POST error:", error);
    return NextResponse.json(
      { error: "Failed to import book from SIBI" },
      { status: 500 }
    );
  }
}
