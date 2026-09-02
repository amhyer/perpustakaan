"use client";

/**
 * Notification Preferences UI.
 *
 * Sprint N - Tier 1 #3: User-facing preferences panel for smart notifications.
 *
 * Features:
 * - Master switch (enable/disable all)
 * - Per-trigger toggles (12 triggers)
 * - Daily rate limit slider
 * - Quiet hours config
 * - Persisted to localStorage (client-side)
 *
 * Design:
 * - Card-based layout
 * - Toggle switches
 * - Grouped by category (Engagement, Reminders, Achievements)
 */

import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Clock,
  BookOpen,
  Trophy,
  Sparkles,
  Flame,
  Heart,
  TrendingUp,
  Users,
  Loader2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface SmartNotificationPreferences {
  enabled: boolean;
  triggers: Record<string, boolean>;
  maxPerDay: number;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}

const DEFAULT_PREFS: SmartNotificationPreferences = {
  enabled: true,
  triggers: {
    BOOK_AVAILABLE: true,
    NEW_FAVORITE_AUTHOR: true,
    WISHLIST_AVAILABLE: true,
    SIMILAR_USERS_LIKE: true,
    DUE_SOON_REMINDER: true,
    OVERDUE_NUDGE: true,
    STREAK_REMINDER: true,
    LEVEL_UP: true,
    BADGE_EARNED: true,
    CHALLENGE_COMPLETE: true,
    POPULAR_NOW: false,
    RECOMMENDATION: true,
  },
  maxPerDay: 10,
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 7,
};

const TRIGGER_META: Record<string, { label: string; description: string; icon: typeof Bell; group: string }> = {
  BOOK_AVAILABLE: { label: "Buku Reservasi Tersedia", description: "Buku yang Anda reservasi sudah bisa dipinjam", icon: BookOpen, group: "Koleksi" },
  WISHLIST_AVAILABLE: { label: "Wishlist Tersedia", description: "Buku di wishlist Anda sekarang tersedia", icon: Heart, group: "Koleksi" },
  NEW_FAVORITE_AUTHOR: { label: "Pengarang Favorit", description: "Pengarang favorit merilis buku baru", icon: BookOpen, group: "Koleksi" },
  SIMILAR_USERS_LIKE: { label: "Rekomendasi Teman", description: "Siswa dengan profil mirip menyukai buku", icon: Users, group: "Saran" },
  RECOMMENDATION: { label: "Rekomendasi Personal", description: "Saran buku yang cocok untuk Anda", icon: Sparkles, group: "Saran" },
  POPULAR_NOW: { label: "Sedang Populer", description: "Buku yang sedang tren di sekolah", icon: TrendingUp, group: "Saran" },
  DUE_SOON_REMINDER: { label: "Pengingat Jatuh Tempo", description: "Buku akan jatuh tempo besok/lusa", icon: Clock, group: "Pengingat" },
  OVERDUE_NUDGE: { label: "Buku Terlambat", description: "Sudah terlambat, kembalikan sekarang", icon: Bell, group: "Pengingat" },
  STREAK_REMINDER: { label: "Pertahankan Streak", description: "Jangan sampai streak Anda putus", icon: Flame, group: "Prestasi" },
  LEVEL_UP: { label: "Naik Level", description: "Anda mencapai level membaca baru", icon: Trophy, group: "Prestasi" },
  BADGE_EARNED: { label: "Badge Baru", description: "Anda mendapatkan achievement", icon: Trophy, group: "Prestasi" },
  CHALLENGE_COMPLETE: { label: "Challenge Selesai", description: "Target baca bulanan tercapai", icon: Trophy, group: "Prestasi" },
};

const STORAGE_KEY = "ji-smart-notif-prefs";

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<SmartNotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage first
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPrefs({ ...DEFAULT_PREFS, ...parsed });
        }
      } catch (e) {
        console.error("Failed to load notification preferences from storage:", e);
      }
    }

    // Then try API
    api
      .get<{ preferences: SmartNotificationPreferences }>("/api/notifications/preferences")
      .then((data) => {
        if (data.preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
        }
      })
      .catch(() => {
        // fallback to localStorage
      })
      .finally(() => setLoading(false));
  }, []);

  const updatePref = <K extends keyof SmartNotificationPreferences>(
    key: K,
    value: SmartNotificationPreferences[K]
  ) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const updateTrigger = (key: string, value: boolean) => {
    setPrefs((p) => ({
      ...p,
      triggers: { ...p.triggers, [key]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Save to API
      await api.put("/api/notifications/preferences", { preferences: prefs });
    } catch (e) {
      console.error("Failed to save notification preferences to API:", e);
    }
    // Always save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error("Failed to save notification preferences to storage:", e);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Group triggers
  const groups: Record<string, string[]> = {};
  Object.entries(TRIGGER_META).forEach(([key, meta]) => {
    if (!groups[meta.group]) groups[meta.group] = [];
    groups[meta.group].push(key);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {prefs.enabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          Notifikasi Pintar
          {saved && (
            <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
              ✓ Tersimpan
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master switch */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div>
            <div className="font-medium text-sm">Aktifkan Notifikasi</div>
            <div className="text-xs text-muted-foreground">
              Master switch untuk semua notifikasi pintar
            </div>
          </div>
          <ToggleSwitch
            checked={prefs.enabled}
            onChange={(v) => updatePref("enabled", v)}
          />
        </div>

        {prefs.enabled && (
          <>
            {/* Daily limit */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Batas Harian</div>
                  <div className="text-xs text-muted-foreground">
                    Maksimal notifikasi per hari
                  </div>
                </div>
                <Badge variant="outline" className="text-sm h-7">
                  {prefs.maxPerDay}
                </Badge>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={prefs.maxPerDay}
                onChange={(e) => updatePref("maxPerDay", parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>

            {/* Quiet hours */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Jam Tenang</div>
                  <div className="text-xs text-muted-foreground">
                    Tidak kirim notifikasi di jam tertentu
                  </div>
                </div>
                <ToggleSwitch
                  checked={prefs.quietHoursEnabled}
                  onChange={(v) => updatePref("quietHoursEnabled", v)}
                />
              </div>
              {prefs.quietHoursEnabled && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Dari</span>
                  <select
                    value={prefs.quietHoursStart}
                    onChange={(e) => updatePref("quietHoursStart", parseInt(e.target.value, 10))}
                    className="h-8 rounded border bg-background px-2 text-sm"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">sampai</span>
                  <select
                    value={prefs.quietHoursEnd}
                    onChange={(e) => updatePref("quietHoursEnd", parseInt(e.target.value, 10))}
                    className="h-8 rounded border bg-background px-2 text-sm"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Triggers grouped by category */}
            {Object.entries(groups).map(([group, keys]) => (
              <div key={group} className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {group}
                </div>
                {keys.map((key) => {
                  const meta = TRIGGER_META[key];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{meta.label}</div>
                          <div className="text-[11px] text-muted-foreground leading-tight">
                            {meta.description}
                          </div>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={prefs.triggers[key] ?? true}
                        onChange={(v) => updateTrigger(key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Simpan Preferensi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted"
      )}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
