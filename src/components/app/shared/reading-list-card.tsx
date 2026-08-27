"use client";

import { BookMarked, GraduationCap } from "lucide-react";
import { BookCover } from "@/components/app/shared/book-cover";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";

export interface ReadingListBook {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverImage: string | null;
  isbn?: string | null;
}

export function ReadingListCard({
  teacherName,
  subject,
  items,
  onOpen,
}: {
  teacherName: string;
  subject?: string | null;
  items: { note?: string | null; book: ReadingListBook }[];
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Daftar bacaan kelas
          </p>
          <h2 className="text-sm font-semibold">
            {teacherName} merekomendasikan
            {subject ? ` untuk ${subject}` : ""}
          </h2>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-1">
        {items.map(({ book, note }) => (
          <button
            key={book.id}
            type="button"
            onClick={() => onOpen(book.id)}
            className="w-28 shrink-0 text-left group"
          >
            <BookCover
              title={book.title}
              author={book.author}
              color={book.coverColor}
              coverImage={book.coverImage}
              isbn={book.isbn}
              size="sm"
              tilt
            />
            <p className="mt-2 text-xs font-semibold line-clamp-2 group-hover:text-primary">{book.title}</p>
            {note && (
              <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                <BookMarked className="h-3 w-3 mr-1" />
                {note}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
