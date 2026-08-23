"use client";

/**
 * StreakCalendar — Visualisasi streak membaca 30 hari terakhir.
 * Mirip Duolingo/medium heatmap.
 *
 * - 🟧 = hari dengan poin (baca buku)
 * - ⬜ = hari tanpa poin
 * - 🔥 = hari ini (kalau streak aktif)
 */

import { useEffect, useState } from "react";
import { Flame, Calendar } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/layout/card";
import { cn } from "@/lib/utils";

interface PointSummary {
  currentStreak: number;
  streakHistory: { date: string; points: number }[];
}

interface StreakCalendarProps {
  className?: string;
}

export function StreakCalendar({ className }: StreakCalendarProps) {
  const [data, setData] = useState<PointSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PointSummary>("/api/points/me")
      .then((d) => setData({ currentStreak: d.currentStreak, streakHistory: d.streakHistory }))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 animate-pulse">
          <div className="h-4 w-32 bg-slate-100 rounded mb-3" />
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Build calendar grid (last 30 days)
  const days: { date: string; active: boolean; points: number; isToday: boolean }[] = [];
  const today = new Date().toISOString().split("T")[0];
  const historyMap = new Map(data.streakHistory.map((h) => [h.date, h.points]));

  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const date = d.toISOString().split("T")[0];
    const points = historyMap.get(date) || 0;
    days.push({
      date,
      active: points > 0,
      points,
      isToday: date === today,
    });
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">Streak Membaca</h3>
          </div>
          {data.currentStreak > 0 && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" />
              {data.currentStreak} hari
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-3">
          {data.currentStreak > 0
            ? `Pertahankan streak dengan membaca setiap hari!`
            : `Mulai streak hari ini dengan membaca buku`}
        </p>

        {/* Heatmap */}
        <div className="grid grid-cols-10 gap-1.5">
          {days.map((day) => (
            <div
              key={day.date}
              title={`${day.date}${day.active ? ` (+${day.points} poin)` : ""}`}
              className={cn(
                "aspect-square rounded transition-all",
                day.active
                  ? "bg-gradient-to-br from-orange-400 to-red-500 shadow-sm"
                  : "bg-slate-100",
                day.isToday && "ring-2 ring-blue-500 ring-offset-1"
              )}
            >
              {day.isToday && (
                <div className="w-full h-full flex items-center justify-center text-xs">
                  📍
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-slate-100 rounded" />
            <span>Tidak baca</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gradient-to-br from-orange-400 to-red-500 rounded" />
            <span>Membaca</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Calendar className="h-3 w-3" />
            <span>30 hari terakhir</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
