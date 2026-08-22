"use client";

import { useState } from "react";
import { LayoutDashboard, Home, Sparkles, GripVertical, Check } from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { useAppStore } from "@/store/use-app-store";
import { api, type CurrentUser } from "@/lib/api-client";
import { DASHBOARD_VIEW_LABELS, DASHBOARD_OPTIONS_BY_ROLE, type Role } from "@/lib/constants";
import { toast } from "sonner";

interface DefaultDashboardSelectorProps {
  /** Compact mode untuk inline use di dashboard card */
  compact?: boolean;
}

const ICONS: Record<string, React.ElementType> = {
  default: Home,
  dashboard: LayoutDashboard,
  "customizable-dashboard": GripVertical,
  "executive-dashboard": Sparkles,
  "my-dashboard": Home,
};

const DESCRIPTIONS: Record<string, string> = {
  default: "Sistem otomatis memilih dashboard sesuai role Anda",
  dashboard: "Tampilan standar dengan 8 stat cards, 2 chart, dan tabel",
  "customizable-dashboard": "Drag & drop widget sesuai kebutuhan Anda",
  "executive-dashboard": "KPI ringkas untuk Kepala Sekolah / Stakeholder",
  "my-dashboard": "Beranda pribadi dengan peminjaman & rekomendasi",
};

/**
 * Komponen untuk memilih default dashboard.
 * Disimpan di tabel UserPreference (1-to-1 dengan User).
 *
 * Sprint 4 — Fix #9.
 *
 * Accessibility:
 * - Group role="radiogroup" + aria-labelledby untuk screen reader
 * - Setiap option role="radio" dengan aria-checked
 * - Decorative icon di-hidden dari screen reader
 *
 * ```tsx
 * <DefaultDashboardSelector />
 * ```
 */
export function DefaultDashboardSelector({ compact = false }: DefaultDashboardSelectorProps) {
  const { user, setUser } = useAppStore();
  const [saving, setSaving] = useState<string | null>(null);

  if (!user) return null;

  const userRole = user.role as Role;
  const options = DASHBOARD_OPTIONS_BY_ROLE[userRole] ?? ["default"];
  const currentDefault = user.defaultDashboard || "default";

  async function selectDefault(value: string) {
    if (!user || value === user.defaultDashboard) return;

    setSaving(value);
    try {
      await api.put("/api/users/me/preferences", { defaultDashboard: value });
      // Update local user state — re-fetch /api/auth/me agar fresh
      const refreshed = await api.get<CurrentUser>("/api/auth/me");
      setUser(refreshed);
      toast.success(
        value === "default"
          ? "Default dashboard direset ke otomatis"
          : `Beranda diubah ke "${DASHBOARD_VIEW_LABELS[value] ?? value}"`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan preferensi");
    } finally {
      setSaving(null);
    }
  }

  const groupId = "default-dashboard-group";
  const groupLabelId = "default-dashboard-group-label";

  const optionsList = (
    <div
      role="radiogroup"
      aria-labelledby={groupLabelId}
      className="space-y-2"
    >
      {options.map((opt) => {
        const Icon = ICONS[opt] ?? LayoutDashboard;
        const active = currentDefault === opt;
        const isSaving = saving === opt;
        const description = DESCRIPTIONS[opt];
        const ariaLabel = active
          ? `${DASHBOARD_VIEW_LABELS[opt] ?? opt} (saat ini dipilih)`
          : `Pilih ${DASHBOARD_VIEW_LABELS[opt] ?? opt} sebagai beranda`;

        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            aria-busy={isSaving}
            aria-label={ariaLabel}
            disabled={saving !== null}
            onClick={() => selectDefault(opt)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:border-primary/30 hover:bg-accent/30"
            } ${saving !== null && !isSaving ? "opacity-50" : ""}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {DASHBOARD_VIEW_LABELS[opt] ?? opt}
              </p>
              {description && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
            {active && (
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <h4 id={groupLabelId} className="sr-only">
          Pilihan Beranda Default
        </h4>
        {optionsList}
      </div>
    );
  }

  return (
    <Card className="p-5" aria-labelledby={groupLabelId}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 id={groupLabelId} className="font-semibold flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" aria-hidden="true" />
            Beranda Pilihan Saya
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pilih dashboard yang muncul saat pertama login. Perubahan langsung diterapkan.
          </p>
        </div>
        {saving && (
          <Badge
            variant="outline"
            className="shrink-0"
            role="status"
            aria-live="polite"
          >
            Menyimpan…
          </Badge>
        )}
      </div>

      {optionsList}

      <p
        className="mt-4 pt-3 border-t text-[11px] text-muted-foreground"
        aria-hidden="true"
      >
        💡 Tips: Klik logo Jendela Ilmu di sidebar untuk langsung ke beranda pilihan Anda.
      </p>
    </Card>
  );
}
