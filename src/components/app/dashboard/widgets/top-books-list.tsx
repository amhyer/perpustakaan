"use client";

import { Trophy, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { BookCover } from "@/components/app/shared/book-cover";
import { RoleEmptyState, type UserRole } from "@/components/app/shared/role-empty-state";
import type { PopularBook } from "./types";

interface TopBooksListProps {
  books: PopularBook[];
  title?: string;
  description?: string;
  onSelectBook?: (bookId: string) => void;
  onViewAll?: () => void;
  viewAllLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxHeightClass?: string;
  className?: string;
  /** Optional role untuk role-specific empty state (Fix #7) */
  userRole?: UserRole;
}

/**
 * Daftar buku terpopuler.
 *
 * Dipakai oleh:
 * - DashboardView
 * - CustomizableDashboardView (widget 'list-popular-books')
 */
export function TopBooksList({
  books,
  title = "Buku Terpopuler",
  description = "Paling sering dipinjam",
  onSelectBook,
  onViewAll,
  viewAllLabel = "Lihat Semua",
  emptyTitle,
  emptyDescription,
  maxHeightClass = "max-h-96",
  className,
  userRole,
}: TopBooksListProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700"
            aria-hidden="true"
          >
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            aria-label={`Lihat semua ${title.toLowerCase()}`}
          >
            {viewAllLabel}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {books.length === 0 ? (
          userRole ? (
            <RoleEmptyState
              context="no-loans"
              userRole={userRole}
              title={emptyTitle}
              description={emptyDescription}
              compact
            />
          ) : (
            <div
              className="py-10 text-center text-sm text-muted-foreground"
              role="status"
            >
              {emptyTitle ?? "Belum ada data"}
              {emptyDescription && (
                <p className="text-xs mt-1">{emptyDescription}</p>
              )}
            </div>
          )
        ) : (
          <ul
            className={`${maxHeightClass} overflow-y-auto scrollbar-thin divide-y divide-border`}
            aria-label={title}
          >
            {books.map((book, i) => (
              <li key={book.id}>
                <button
                  onClick={() => onSelectBook?.(book.id)}
                  aria-label={`Lihat detail ${book.title} oleh ${book.author}, dipinjam ${book.loanCount} kali`}
                  className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-accent/50 rounded-lg transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="w-10 shrink-0">
                    <BookCover
                      title={book.title}
                      author={book.author}
                      color={book.coverColor}
                      coverImage={book.coverImage}
                      size="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-1">{book.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                  </div>
                  <Badge
                    className="bg-primary/10 text-primary border-0 shrink-0"
                    variant="secondary"
                    aria-label={`${book.loanCount} kali dipinjam`}
                  >
                    {book.loanCount}× pinjam
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
