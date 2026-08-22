"use client";

import { Clock, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { RoleEmptyState, type UserRole } from "@/components/app/shared/role-empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-display/table";
import { LOAN_STATUS_LABELS, LOAN_STATUS_COLORS, formatDateShort } from "@/lib/constants";
import type { DashboardLoan } from "./types";

interface RecentLoansTableProps {
  loans: DashboardLoan[];
  limit?: number;
  title?: string;
  description?: string;
  onSelectMember?: (memberId: string) => void;
  onSelectBook?: (bookId: string) => void;
  onViewAll?: () => void;
  viewAllLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  /** Optional role untuk role-specific empty state (Fix #7) */
  userRole?: UserRole;
}

/**
 * Tabel peminjaman terbaru.
 *
 * Dipakai oleh:
 * - DashboardView
 */
export function RecentLoansTable({
  loans,
  limit = 5,
  title = "Peminjaman Terbaru",
  description,
  onSelectMember,
  onSelectBook,
  onViewAll,
  viewAllLabel = "Lihat Semua",
  emptyTitle,
  emptyDescription,
  className,
  userRole,
}: RecentLoansTableProps) {
  const sliced = loans.slice(0, limit);

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs">{description}</CardDescription>
            )}
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
        {sliced.length === 0 ? (
          userRole ? (
            <RoleEmptyState
              context="no-recent-loans"
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
              {emptyTitle ?? "Belum ada peminjaman"}
              {emptyDescription && (
                <p className="text-xs mt-1">{emptyDescription}</p>
              )}
            </div>
          )
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table aria-label={title}>
              <caption className="sr-only">
                {description ?? `${sliced.length} transaksi peminjaman terbaru`}
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Anggota</TableHead>
                  <TableHead scope="col">Buku</TableHead>
                  <TableHead scope="col" className="hidden sm:table-cell">Tanggal</TableHead>
                  <TableHead scope="col" className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sliced.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <button
                        onClick={() => onSelectMember?.(loan.member.id)}
                        aria-label={`Lihat detail anggota ${loan.member.fullName} (${loan.member.memberNumber})`}
                        className="text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        <span className="block text-sm font-medium line-clamp-1">
                          {loan.member.fullName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {loan.member.memberNumber}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => onSelectBook?.(loan.bookItem.book.id)}
                        aria-label={`Lihat detail buku ${loan.bookItem.book.title} oleh ${loan.bookItem.book.author}`}
                        className="text-left hover:underline max-w-[240px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        <span className="block text-sm font-medium line-clamp-1">
                          {loan.bookItem.book.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          {loan.bookItem.book.author}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      <time dateTime={loan.loanDate}>
                        {formatDateShort(loan.loanDate)}
                      </time>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={LOAN_STATUS_COLORS[loan.status] ?? ""}
                        variant="outline"
                        aria-label={`Status: ${LOAN_STATUS_LABELS[loan.status] ?? loan.status}`}
                      >
                        {LOAN_STATUS_LABELS[loan.status] ?? loan.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
