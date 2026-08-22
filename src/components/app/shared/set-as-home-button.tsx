"use client";

import { useState } from "react";
import { Home, Check } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { useAppStore } from "@/store/use-app-store";
import { api } from "@/lib/api-client";
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
 * Sprint 4 — Fix #9. Tersembunyi otomatis jika dashboard ini sudah jadi default.
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
  const isCurrentDefault =
    currentDefault === viewKey ||
    // Untuk role dengan auto-route, tampilkan jika user pilih explicit
    (currentDefault === "default" && false);

  if (isCurrentDefault) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={`gap-1.5 text-emerald-600 ${className ?? ""}`}
        title="Ini sudah menjadi beranda Anda"
      >
        <Check className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Beranda Aktif</span>
      </Button>
    );
  }

  async function setAsHome() {
    if (!user) return;
    setSaving(true);
    try {
      await api.put("/api/users/me/preferences", { defaultDashboard: viewKey });
      const refreshed = await api.get<typeof user>("/api/auth/me");
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

  return (
    <Button
      onClick={setAsHome}
      disabled={saving}
      variant={variant}
      size={size}
      className={`gap-1.5 ${className ?? ""}`}
    >
      <Home className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">
        {saving ? "Menyimpan…" : "Set sebagai Beranda"}
      </span>
    </Button>
  );
}
