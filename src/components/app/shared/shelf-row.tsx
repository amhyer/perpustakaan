"use client";

import { ChevronRight } from "lucide-react";
import { BookCard, type BookWithDetails } from "@/components/app/shared/book-card";
import { Button } from "@/components/ui/form/button";

export function ShelfRow({
  title,
  books,
  onSeeAll,
  onOpen,
}: {
  title: string;
  books: BookWithDetails[];
  onSeeAll?: () => void;
  onOpen?: (id: string) => void;
}) {
  if (books.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {onSeeAll && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={onSeeAll}>
            Lihat semua
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-3 -mx-1 px-1">
        {books.map((book) => (
          <div key={book.id} className="w-36 sm:w-40 shrink-0">
            <BookCard book={book} compact onOpen={onOpen} />
          </div>
        ))}
      </div>
    </section>
  );
}
