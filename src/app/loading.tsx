"use client";

import { SkeletonStatCards, SkeletonChart, SkeletonList } from "@/components/app/shared/skeleton";

/**
 * Global loading state — ditampilkan otomatis oleh Next.js saat navigasi.
 * Hanya untuk route root, untuk sub-route gunakan loading.tsx di folder yang sama.
 */
export default function Loading() {
  return (
    <div className="space-y-6 p-4 lg:p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>

      {/* Stats */}
      <SkeletonStatCards count={4} />

      {/* Chart + content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonChart height={250} />
        <div className="rounded-lg border bg-card p-6">
          <div className="h-5 w-1/3 bg-muted rounded animate-pulse mb-4" />
          <SkeletonList count={5} />
        </div>
      </div>
    </div>
  );
}
