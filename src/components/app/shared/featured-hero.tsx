"use client";

import { Sparkles } from "lucide-react";
import { BookCover } from "@/components/app/shared/book-cover";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import type { PublicBook } from "@/lib/opac";

export function FeaturedHero({
  book,
  onOpen,
  ctaLabel = "Baca sinopsis",
}: {
  book: Pick<
    PublicBook,
    "id" | "title" | "author" | "synopsis" | "coverColor" | "coverImage" | "isbn" | "category" | "available"
  >;
  onOpen: (id: string) => void;
  ctaLabel?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-900 text-primary-foreground shadow-lg">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[160px_1fr] lg:items-center">
        <div className="w-36 sm:w-40 mx-auto lg:mx-0">
          <BookCover
            title={book.title}
            author={book.author}
            color={book.coverColor}
            coverImage={book.coverImage}
            isbn={book.isbn}
            size="lg"
            tilt
          />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Buku Minggu Ini
          </div>
          {book.category && (
            <Badge className="bg-white/15 text-white border-0 hover:bg-white/20">{book.category.name}</Badge>
          )}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight">{book.title}</h2>
            <p className="text-sm text-primary-foreground/80 mt-1">{book.author}</p>
          </div>
          {book.synopsis && (
            <p className="text-sm text-primary-foreground/85 leading-relaxed line-clamp-3 max-w-2xl">
              {book.synopsis}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => onOpen(book.id)}
            >
              {ctaLabel}
            </Button>
            <span className="text-xs text-primary-foreground/70">
              {book.available > 0 ? `${book.available} eksemplar tersedia` : "Sedang dipinjam — reservasi setelah masuk"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
