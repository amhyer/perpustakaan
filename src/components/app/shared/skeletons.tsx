"use client";

/**
 * Skeleton loaders — Better UX during data fetching.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 *
 * Reusable skeleton components untuk various layouts:
 * - CardSkeleton
 * - ListSkeleton
 * - TableSkeleton
 * - StatCardSkeleton
 * - ProfileSkeleton
 * - DetailSkeleton
 *
 * Features:
 * - Pulsing animation
 * - Matches actual layout (avoid shift)
 * - ARIA loading="lazy" untuk screen readers
 * - Customizable rows/columns
 */

import { Skeleton } from "@/components/ui/feedback/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/layout/card";
import { cn } from "@/lib/utils";

interface BaseSkeletonProps {
  count?: number;
  className?: string;
  /** Show as "live region" for accessibility (announce to screen readers) */
  announce?: boolean;
}

// ===== Card Skeleton =====

export function CardSkeleton({ count = 1, className, announce }: BaseSkeletonProps) {
  return (
    <div
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-busy="true"
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===== List Skeleton =====

export function ListSkeleton({
  count = 5,
  className,
  announce,
  withAvatar = true,
}: BaseSkeletonProps & { withAvatar?: boolean }) {
  return (
    <div
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-busy="true"
      className={cn("space-y-2", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-md">
          {withAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

// ===== Table Skeleton =====

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
  announce,
}: BaseSkeletonProps & { rows?: number; columns?: number }) {
  return (
    <div
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-busy="true"
      className={cn("border rounded-lg overflow-hidden", className)}
    >
      {/* Header row */}
      <div className="flex gap-2 p-3 bg-muted/30 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-2 p-3 border-b last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={cn(
                "h-3 flex-1",
                colIdx === 0 && "w-1/4" // First column narrower
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ===== Stat Card Skeleton =====

export function StatCardSkeleton({
  count = 4,
  className,
  announce,
}: BaseSkeletonProps) {
  return (
    <div
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-busy="true"
      className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-7 w-2/3" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===== Profile Skeleton =====

export function ProfileSkeleton({ className, announce }: BaseSkeletonProps) {
  return (
    <div
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-busy="true"
      className={cn("space-y-4", className)}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

// ===== Detail Page Skeleton =====

export function DetailSkeleton({ className, announce }: BaseSkeletonProps) {
  return (
    <div
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-busy="true"
      className={cn("space-y-6", className)}
    >
      {/* Hero section */}
      <div className="flex gap-6">
        <Skeleton className="h-48 w-32 rounded-md shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-9/12" />
        <Skeleton className="h-4 w-11/12" />
      </div>
    </div>
  );
}

// ===== Grid Skeleton (for card grids) =====

export function GridSkeleton({
  count = 8,
  columns = 4,
  className,
  announce,
}: BaseSkeletonProps & { count?: number; columns?: number }) {
  return (
    <div
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-busy="true"
      className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 md:grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        columns === 5 && "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-3 space-y-2">
            <Skeleton className="aspect-[3/4] w-full rounded" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
