"use client";

import { MapPin } from "lucide-react";
import { BookCover } from "@/components/app/shared/book-cover";
import { Badge } from "@/components/ui/data-display/badge";
import { Card } from "@/components/ui/layout/card";
import { useAppStore } from "@/store/use-app-store";

export interface BookWithDetails {
  id: string;
  title: string;
  author: string;
  publisher?: string | null;
  isbn?: string | null;
  year?: number | null;
  coverColor: string;
  coverImage: string | null;
  synopsis?: string | null;
  source?: string;
  sourceUrl?: string | null;
  category?: { name: string } | null;
  location?: { name: string; code: string } | null;
  items?: { id?: string; status: string }[];
  available?: number;
  total?: number;
}

export function BookCard({
  book,
  compact = false,
  onOpen,
}: {
  book: BookWithDetails;
  compact?: boolean;
  onOpen?: (id: string) => void;
}) {
  const setView = useAppStore((s) => s.setView);

  const availableCount =
    book.available ?? book.items?.filter((i) => i.status === "AVAILABLE").length ?? 0;
  const totalCount = book.total ?? book.items?.length ?? 0;

  function open() {
    if (onOpen) onOpen(book.id);
    else setView("book-detail", { id: book.id });
  }

  return (
    <Card className="group overflow-hidden p-3 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col border-transparent hover:border-primary/20">
      <button onClick={open} className="text-left flex-1" aria-label={`Lihat detail ${book.title}`}>
        <div className="relative">
          <BookCover
            title={book.title}
            author={book.author}
            color={book.coverColor}
            coverImage={book.coverImage}
            isbn={book.isbn}
            tilt
          />
          {(book.source === "SIBI" || !!book.sourceUrl) && (
            <Badge className="absolute top-2 left-2 bg-sky-500 hover:bg-sky-500 text-white border-0 shadow">
              Digital
            </Badge>
          )}
          {totalCount > 0 &&
            (availableCount > 0 ? (
              <Badge className="absolute top-2 right-2 bg-emerald-500 hover:bg-emerald-500 text-white border-0 shadow">
                {availableCount}/{totalCount}
              </Badge>
            ) : (
              <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-500 text-white border-0 shadow">
                Penuh
              </Badge>
            ))}
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="font-serif font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
          {!compact && (
            <div className="flex items-center gap-2 pt-1">
              {book.category && (
                <Badge variant="outline" className="text-[10px] font-normal py-0">
                  {book.category.name}
                </Badge>
              )}
              {book.year && <span className="text-[10px] text-muted-foreground">{book.year}</span>}
            </div>
          )}
          {book.location && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
              <MapPin className="h-3 w-3" />
              {book.location.code}
            </div>
          )}
        </div>
      </button>
    </Card>
  );
}

export function BookCardSkeleton() {
  return (
    <Card className="overflow-hidden p-3 flex flex-col">
      <div className="aspect-[3/4] w-full rounded-lg bg-muted animate-pulse" />
      <div className="mt-3 space-y-2">
        <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
        <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
      </div>
    </Card>
  );
}
