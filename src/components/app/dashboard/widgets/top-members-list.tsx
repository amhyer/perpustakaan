"use client";

import { Users, ChevronRight } from "lucide-react";
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
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import type { TopMember } from "./types";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

interface TopMembersListProps {
  members: TopMember[];
  title?: string;
  description?: string;
  onSelectMember?: (memberId: string) => void;
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
 * Daftar anggota paling aktif.
 *
 * Dipakai oleh:
 * - DashboardView
 * - CustomizableDashboardView (widget 'list-active-members')
 */
export function TopMembersList({
  members,
  title = "Anggota Paling Aktif",
  description = "Berdasarkan jumlah peminjaman",
  onSelectMember,
  onViewAll,
  viewAllLabel = "Lihat Semua",
  emptyTitle,
  emptyDescription,
  maxHeightClass = "max-h-96",
  className,
  userRole,
}: TopMembersListProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            {viewAllLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          userRole ? (
            <RoleEmptyState
              context="no-top-members"
              userRole={userRole}
              title={emptyTitle}
              description={emptyDescription}
              compact
            />
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {emptyTitle ?? "Belum ada data"}
              {emptyDescription && (
                <p className="text-xs mt-1">{emptyDescription}</p>
              )}
            </div>
          )
        ) : (
          <ul className={`${maxHeightClass} overflow-y-auto scrollbar-thin divide-y divide-border`}>
            {members.map((m, i) => (
              <li key={m.id}>
                <button
                  onClick={() => onSelectMember?.(m.id)}
                  className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-accent/50 rounded-lg transition-colors text-left"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                    {initials(m.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-1">{m.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.memberNumber}
                      {m.classGrade ? ` · ${m.classGrade}` : ""}
                    </p>
                  </div>
                  <Badge
                    className={`${ROLE_COLORS[m.category] ?? ""} shrink-0`}
                    variant="outline"
                  >
                    {ROLE_LABELS[m.category] ?? m.category}
                  </Badge>
                  <Badge className="bg-sky-50 text-sky-700 border-0 shrink-0" variant="secondary">
                    {m.loanCount}×
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
