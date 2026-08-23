"use client";

/**
 * EmptyState — Reusable component untuk empty states.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 *
 * Better than just text — includes:
 * - Engaging illustration (Lucide icon)
 * - Clear title + description
 * - Action button (primary CTA)
 * - Secondary action (optional)
 * - Tips untuk next steps
 *
 * Use untuk:
 * - "No data" states
 * - "Search no results"
 * - "First time user" onboarding
 * - "Permission denied"
 *
 * Accessibility:
 * - role="status" untuk screen readers
 * - aria-label
 * - Focus management
 */

import { ReactNode } from "react";
import {
  LucideIcon,
  Inbox,
  Search,
  FileX,
  AlertCircle,
  BookOpen,
  Users,
  Package,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { cn } from "@/lib/utils";

export type EmptyStateVariant =
  | "no-data"
  | "no-search-results"
  | "no-file"
  | "error"
  | "first-time"
  | "no-members"
  | "no-books"
  | "no-rewards"
  | "generic";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  icon?: LucideIcon;
}

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  tips?: string[];
  className?: string;
  children?: ReactNode;
}

const VARIANT_PRESETS: Record<
  EmptyStateVariant,
  {
    icon: LucideIcon;
    title: { id: string; en: string };
    description: { id: string; en: string };
    color: string;
  }
> = {
  "no-data": {
    icon: Inbox,
    title: { id: "Belum ada data", en: "No data yet" },
    description: {
      id: "Mulai tambahkan data untuk melihat statistik di sini.",
      en: "Start adding data to see statistics here.",
    },
    color: "text-muted-foreground",
  },
  "no-search-results": {
    icon: Search,
    title: { id: "Tidak ada hasil", en: "No results found" },
    description: {
      id: "Coba kata kunci lain atau hapus filter untuk melihat lebih banyak.",
      en: "Try different keywords or remove filters to see more.",
    },
    color: "text-muted-foreground",
  },
  "no-file": {
    icon: FileX,
    title: { id: "File tidak ditemukan", en: "No file found" },
    description: {
      id: "File yang Anda cari tidak ada atau telah dihapus.",
      en: "The file you're looking for doesn't exist or has been removed.",
    },
    color: "text-muted-foreground",
  },
  "error": {
    icon: AlertCircle,
    title: { id: "Terjadi kesalahan", en: "Something went wrong" },
    description: {
      id: "Maaf, terjadi kesalahan tak terduga. Coba lagi atau hubungi pustakawan.",
      en: "Sorry, an unexpected error occurred. Try again or contact the librarian.",
    },
    color: "text-red-500",
  },
  "first-time": {
    icon: Sparkles,
    title: { id: "Selamat datang! 🎉", en: "Welcome! 🎉" },
    description: {
      id: "Mulai perjalanan literasi Anda. Cari buku favorit atau ajukan usulan baru.",
      en: "Start your literacy journey. Find favorite books or submit new requests.",
    },
    color: "text-primary",
  },
  "no-members": {
    icon: Users,
    title: { id: "Belum ada anggota", en: "No members yet" },
    description: {
      id: "Tambahkan anggota pertama untuk mulai mengelola sirkulasi perpustakaan.",
      en: "Add the first member to start managing library circulation.",
    },
    color: "text-muted-foreground",
  },
  "no-books": {
    icon: BookOpen,
    title: { id: "Belum ada buku", en: "No books yet" },
    description: {
      id: "Tambahkan buku pertama atau impor dari SIBI untuk memulai katalog.",
      en: "Add the first book or import from SIBI to start the catalog.",
    },
    color: "text-muted-foreground",
  },
  "no-rewards": {
    icon: Package,
    title: { id: "Belum ada hadiah", en: "No rewards yet" },
    description: {
      id: "Tambahkan hadiah pertama untuk mulai memotivasi siswa membaca.",
      en: "Add the first reward to start motivating students to read.",
    },
    color: "text-muted-foreground",
  },
  "generic": {
    icon: Inbox,
    title: { id: "Tidak ada data", en: "Nothing here yet" },
    description: {
      id: "Belum ada yang bisa ditampilkan di sini.",
      en: "There's nothing to show here yet.",
    },
    color: "text-muted-foreground",
  },
};

export function EmptyState({
  variant = "generic",
  title,
  description,
  icon,
  iconColor,
  action,
  secondaryAction,
  tips,
  className,
  children,
}: EmptyStateProps) {
  const preset = VARIANT_PRESETS[variant];
  const Icon = icon || preset.icon;
  const displayTitle = title || preset.title.id;
  const displayDescription = description || preset.description.id;
  const color = iconColor || preset.color;

  return (
    <Card
      className={cn("border-dashed", className)}
      role="status"
      aria-label={displayTitle}
    >
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
        {/* Illustration */}
        <div
          className={cn(
            "h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4",
            "relative"
          )}
        >
          {/* Background ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-muted-foreground/20" />
          <Icon className={cn("h-10 w-10", color)} aria-hidden="true" />
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold mb-1.5">{displayTitle}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {displayDescription}
        </p>

        {/* Tips */}
        {tips && tips.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 max-w-md w-full mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Tips:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 text-left">
              {tips.map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {action && (
              <Button onClick={action.onClick} variant={action.variant || "default"}>
                {action.icon && <action.icon className="h-4 w-4 mr-1" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant || "outline"}
              >
                {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4 mr-1" />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}

        {/* Custom children (untuk additional content) */}
        {children}
      </CardContent>
    </Card>
  );
}

// ===== Preset EmptyStates untuk common cases =====

export function NoSearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      variant="no-search-results"
      title={`Tidak ada hasil untuk "${query}"`}
      action={
        onClear
          ? { label: "Hapus pencarian", onClick: onClear, variant: "outline" }
          : undefined
      }
    />
  );
}

export function FirstTimeUser({
  actionLabel,
  onAction,
}: {
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <EmptyState
      variant="first-time"
      action={{ label: actionLabel, onClick: onAction }}
    />
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      action={
        onRetry ? { label: "Coba lagi", onClick: onRetry } : undefined
      }
    />
  );
}
