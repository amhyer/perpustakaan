"use client";

import { BookOpen, MapPin } from "lucide-react";
import { BookCover } from "@/components/app/shared/book-cover";
import { Badge } from "@/components/ui/data-display/badge";
import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { useAppStore } from "@/store/use-app-store";
import { ITEM_STATUS_COLORS, ITEM_STATUS_LABELS } from "@/lib/constants";

export interface BookWithDetails {
  id: string;
  title: string;
  author: string;
  publisher: string | null;
  year: number | null;
  coverColor: string;
  coverImage: string | null;
  synopsis: string | null;
  category?: { name: string } | null;
  location?: { name: string; code: string } | null;
  items?: { id: string; status: string }[];
}

export function BookCard({ book }: { book: BookWithDetails }) {
  const setView = useAppStore((s) => s.setView);

  const availableCount = book.items?.filter((i) => i.status === "AVAILABLE").length ?? 0;
  const totalCount = book.items?.length ?? 0;

  return (
    <Card className="group overflow-hidden p-3 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer flex flex-col">
      <button
        onClick={() => setView("book-detail", { id: book.id })}
        className="text-left flex-1"
        aria-label={`Lihat detail ${book.title}`}
      >
        <div className="relative">
          <BookCover title={book.title} author={book.author} color={book.coverColor} />
          {availableCount > 0 ? (
            <Badge className="absolute top-2 right-2 bg-emerald-500 hover:bg-emerald-500 text-white border-0 shadow">
              {availableCount} Tersedia
            </Badge>
          ) : (
            <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-500 text-white border-0 shadow">
              Penuh
            </Badge>
          )}
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
          <div className="flex items-center gap-2 pt-1">
            {book.category && (
              <Badge variant="outline" className="text-[10px] font-normal py-0">
                {book.category.name}
              </Badge>
            )}
            {book.year && (
              <span className="text-[10px] text-muted-foreground">{book.year}</span>
            )}
          </div>
          {book.location && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
              <MapPin className="h-3 w-3" />
              {book.location.code}
            </div>
          )}
        </div>
      </button>
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-3 h-8 text-xs"
        onClick={() => setView("book-detail", { id: book.id })}
      >
        <BookOpen className="h-3.5 w-3.5 mr-1.5" />
        Lihat Detail
      </Button>
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
