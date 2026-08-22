"use client";

import { useState } from "react";
import { Home, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { useAppStore } from "@/store/use-app-store";
import { api, type CurrentUser } from "@/lib/api-client";
import { toast } from "sonner";

interface SetAsHomeButtonProps {
  /** View key yang akan di-set sebagai default */
  viewKey: string;
  /** Label untuk toast confirmation */
  label?: string;
  /** Variant button */
  variant?: "default" | "outline" | "ghost";
  /** Size */
  size?: "sm" | "default" | "lg" | "icon";
  /** Optional className override */
  className?: string;
}

/**
 * Tombol "Set sebagai Beranda" untuk memilih current dashboard sebagai default.
 *
 * Sprint 4 — Fix #9. Tampil tombol berbeda saat dashboard ini sudah jadi default.
 *
 * Accessibility:
 * - Icon-only/sm-hidden state pakai aria-label eksplisit
 * - Loading state diumumkan via aria-live
 * - Decorative icon di-hidden dari screen reader
 *
 * ```tsx
 * <SetAsHomeButton viewKey="customizable-dashboard" label="Dashboard Kustom" />
 * ```
 */
export function SetAsHomeButton({
  viewKey,
  label,
  variant = "outline",
  size = "sm",
  className,
}: SetAsHomeButtonProps) {
  const { user, setUser } = useAppStore();
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  // Sembunyikan jika ini sudah default
  const currentDefault = user.defaultDashboard || "default";
  const isCurrentDefault = currentDefault === viewKey;

  if (isCurrentDefault) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={`gap-1.5 text-emerald-600 ${className ?? ""}`}
        aria-label={`${label ?? "Dashboard"} sudah menjadi beranda Anda`}
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Beranda Aktif</span>
      </Button>
    );
  }

  async function setAsHome() {
    if (!user) return;
    setSaving(true);
    try {
      await api.put("/api/users/me/preferences", { defaultDashboard: viewKey });
      const refreshed = await api.get<CurrentUser>("/api/auth/me");
      setUser(refreshed);
      toast.success(
        label
          ? `"${label}" dijadikan beranda. Akan muncul saat login berikutnya.`
          : "Beranda berhasil diubah"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan preferensi");
    } finally {
      setSaving(false);
    }
  }

  const ariaLabel = label
    ? `Jadikan ${label} sebagai beranda utama`
    : "Jadikan dashboard ini sebagai beranda utama";

  return (
    <Button
      onClick={setAsHome}
      disabled={saving}
      variant={variant}
      size={size}
      className={`gap-1.5 ${className ?? ""}`}
      aria-label={ariaLabel}
      aria-busy={saving}
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="hidden sm:inline" aria-live="polite">
        {saving ? "Menyimpan…" : "Set sebagai Beranda"}
      </span>
    </Button>
  );
}
