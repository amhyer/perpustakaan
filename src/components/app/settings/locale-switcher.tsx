"use client";

/**
 * Locale Switcher — Pilih bahasa (id/en/ar).
 *
 * Save preference ke localStorage + (kalau login) ke UserPreference table.
 * Untuk sekarang, simpan ke localStorage dulu (client-only).
 *
 * Future: integrate ke server-side locale detection & SSR.
 */

import { useState, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { toast } from "sonner";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

type Locale = "id" | "en" | "ar";

const LOCALES: Array<{ code: Locale; name: string; flag: string }> = [
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ar", name: "العربية (Arabic)", flag: "🇸🇦" },
];

interface LocaleSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const [locale, setLocale] = useLocalStorage<Locale>("app-locale", "id");
  const [open, setOpen] = useState(false);

  // Apply locale ke document (untuk RTL support)
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-sm hover:bg-slate-100 px-2 py-1 rounded-md"
        >
          <span>{current.flag}</span>
          <span className="hidden md:inline">{current.code.toUpperCase()}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                  toast.success(`Bahasa diganti ke ${l.name}`);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <span>{l.flag}</span>
                <span className="flex-1 text-left">{l.name}</span>
                {locale === l.code && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Globe className="h-4 w-4" />
        Bahasa / Language
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            onClick={() => {
              setLocale(l.code);
              toast.success(`Bahasa diganti ke ${l.name}`);
            }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
              locale === l.code
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <span className="text-2xl">{l.flag}</span>
            <div className="flex-1">
              <div className="font-medium text-sm">{l.name}</div>
              <div className="text-xs text-slate-500">{l.code.toUpperCase()}</div>
            </div>
            {locale === l.code && <Check className="h-4 w-4 text-blue-600" />}
          </button>
        ))}
      </div>
      {locale === "ar" && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          ℹ️ Mode RTL aktif. Layout mirror ke kanan-ke-kiri.
        </div>
      )}
    </div>
  );
}
