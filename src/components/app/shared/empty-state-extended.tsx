/**
 * Reusable UI components untuk mengurangi duplikasi kode.
 * Semua komponen ini 100% controlled, no business logic.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2, Inbox, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/layout/card";

// ============================================================
// Empty State
// ============================================================
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================================
// Loading State
// ============================================================
interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({ message = "Memuat...", className, size = "md" }: LoadingStateProps) {
  const sizeClass = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  }[size];
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClass)} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

// ============================================================
// Error State
// ============================================================
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center gap-3", className)}>
      <div className="text-5xl">⚠️</div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline font-medium"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: string;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, color, trend, subtitle, className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", color || "bg-primary/10 text-primary")}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        {trend && (
          <div className={cn("text-xs font-medium", trend.isPositive ? "text-emerald-600" : "text-red-600")}>
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
    </Card>
  );
}

// ============================================================
// Badge Variants
// ============================================================
interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  label?: string;
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<StatusBadgeProps["variant"]>, string> = {
  default: "bg-zinc-100 text-zinc-700 border-zinc-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-red-100 text-red-700 border-red-200",
  info: "bg-sky-100 text-sky-700 border-sky-200",
};

export function StatusBadge({ status, variant = "default", label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {label || status}
    </span>
  );
}

// ============================================================
// Container / Page wrapper
// ============================================================
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "full";
}

export function PageContainer({ children, className, size = "lg" }: PageContainerProps) {
  const sizeClass = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-7xl",
    full: "max-w-full",
  }[size];
  return <div className={cn("mx-auto w-full p-4 lg:p-6", sizeClass, className)}>{children}</div>;
}

// ============================================================
// Section Header
// ============================================================
interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-4 flex-wrap", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ============================================================
// Data list (reusable empty/loading/data wrapper)
// ============================================================
interface DataStateProps<T> {
  loading?: boolean;
  error?: string | null;
  data?: T;
  isEmpty?: (data: T) => boolean;
  onRetry?: () => void;
  emptyState?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

export function DataState<T>({
  loading,
  error,
  data,
  isEmpty,
  onRetry,
  emptyState,
  children,
}: DataStateProps<T>) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (data === undefined || data === null) return <LoadingState />;
  if (isEmpty?.(data)) return <>{emptyState}</>;
  return <>{children(data)}</>;
}
