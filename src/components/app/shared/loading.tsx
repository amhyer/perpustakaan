"use client";

import { Card } from "@/components/ui/layout/card";
import { cn } from "@/lib/utils";

export function LoadingGrid({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden p-3">
          <div className="aspect-[3/4] w-full rounded-lg bg-muted animate-pulse" />
          <div className="mt-3 space-y-2">
            <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
            <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="h-8 w-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}
