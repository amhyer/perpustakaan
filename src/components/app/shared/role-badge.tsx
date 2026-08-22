"use client";

import { Library, BookMarked, BookmarkCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/data-display/badge";
import { ROLE_LABELS } from "@/lib/constants";
import type { CurrentUser } from "@/lib/api-client";

interface RoleBadgeProps {
  user: CurrentUser | null;
  /** Tampilkan icon di samping label (default true) */
  showIcon?: boolean;
  /** Class tambahan untuk layout */
  className?: string;
}

/**
 * Badge indikator "Tipe Akun" yang ditampilkan di header dashboard
 * dan halaman lain untuk menandakan role user saat ini.
 *
 * Fix #8 dari rencana Sprint 1 — membantu user langsung tahu
 * mereka melihat dashboard untuk role apa.
 */
export function RoleBadge({ user, showIcon = true, className }: RoleBadgeProps) {
  if (!user) return null;

  const role = user.role;
  const isLibrarian = role === "LIBRARIAN" || role === "PUSTAKAWAN_JUNIOR";
  const Icon = isLibrarian
    ? Library
    : role === "TEACHER"
    ? BookMarked
    : role === "STUDENT"
    ? BookmarkCheck
    : ShieldCheck;

  // Variasi warna per role untuk pembeda visual
  const colorClass = isLibrarian
    ? "bg-primary/10 text-primary border-primary/20"
    : role === "TEACHER"
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : role === "STUDENT"
    ? "bg-sky-100 text-sky-700 border-sky-200"
    : "bg-violet-100 text-violet-700 border-violet-200";

  return (
    <Badge
      variant="outline"
      className={`${colorClass} ${className ?? ""} gap-1 font-medium`}
      role="status"
      aria-label={`Tipe akun: ${ROLE_LABELS[role] ?? role}`}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {ROLE_LABELS[role] ?? role}
    </Badge>
  );
}
