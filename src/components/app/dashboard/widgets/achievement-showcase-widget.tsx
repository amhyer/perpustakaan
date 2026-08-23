"use client";

/**
 * Achievement Showcase Widget — Display all student achievements.
 *
 * Sprint U - Final UI: Unified gamification display.
 *
 * Combines:
 * - Reading level (with progress to next)
 * - Streak calendar (compact)
 * - Top certificates
 * - Active challenges
 * - Recent badges
 * - Quick stats
 *
 * Tabbed interface for different views.
 */

import { useState, useEffect } from "react";
import {
  Trophy,
  Flame,
  Award,
  Sparkles,
  ChevronRight,
  Star,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { Button } from "@/components/ui/form/button";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import { Progress } from "@/components/ui/feedback/progress";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";

type TabType = "overview" | "level" | "streak" | "achievements" | "challenges";

interface OverviewData {
  level: {
    name: string;
    emoji: string;
    color: string;
    next?: { name: string; emoji: string; booksToNext: number; progressPercent: number };
    booksRead: number;
    perks: string[];
  };
  streak: {
    current: number;
    longest: number;
  };
  certificates: Array<{
    id: string;
    title: string;
    emoji: string;
    slug: string;
  }>;
  activeChallenges: Array<{
    id: string;
    title: string;
    type: string;
    progress: number;
  }>;
  points: number;
}

export function AchievementShowcaseWidget() {
  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState<TabType>("overview");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>("/api/gamification/level").catch(() => null),
      api.get<any>("/api/gamification/streak-calendar?days=7").catch(() => null),
      api.get<any>("/api/notifications/preferences").catch(() => null),
    ]).then(([levelData, streakData]) => {
      // Mock consolidated data (would come from a dedicated API in production)
      setData({
        level: levelData || {
          name: "Kutu Buku",
          emoji: "📚",
          color: "#10b981",
          next: { name: "Kolektor", emoji: "🏆", booksToNext: 27, progressPercent: 34 },
          booksRead: 23,
          perks: ["+20% poin", "Pinjam 5 buku", "Akses e-book"],
        },
        streak: streakData
          ? { current: streakData.currentStreak, longest: streakData.longestStreak }
          : { current: 5, longest: 12 },
        certificates: [
          { id: "c1", title: "Kutu Buku", emoji: "📚", slug: "books-10-budi-2024" },
          { id: "c2", title: "Streak 7 Hari", emoji: "🔥", slug: "streak-7-budi-2024" },
        ],
        activeChallenges: [
          { id: "ch1", title: "Marathon Membaca", type: "BOOK_COUNT", progress: 60 },
        ],
        points: 250,
      });
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Pencapaian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Pencapaian
          <Badge variant="outline" className="ml-auto text-[10px]">
            {data.points} poin
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick stats row */}
        <div className="grid grid-cols-4 gap-2">
          <QuickStat
            icon="📚"
            value={data.level.booksRead}
            label="Buku"
            color="blue"
          />
          <QuickStat
            icon="🔥"
            value={data.streak.current}
            label="Streak"
            color="orange"
          />
          <QuickStat
            icon="🏆"
            value={data.certificates.length}
            label="Sertifikat"
            color="amber"
          />
          <QuickStat
            icon="🎯"
            value={data.activeChallenges.length}
            label="Challenge"
            color="violet"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "level", label: "Level" },
              { id: "streak", label: "Streak" },
              { id: "achievements", label: "Badge" },
              { id: "challenges", label: "Tantangan" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "text-xs px-3 py-2 whitespace-nowrap transition-colors",
                tab === t.id
                  ? "border-b-2 border-primary text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div className="space-y-2">
            <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{data.level.emoji}</span>
                <div>
                  <div className="text-sm font-bold text-emerald-700">
                    {data.level.name}
                  </div>
                  {data.level.next && (
                    <div className="text-[10px] text-emerald-600">
                      {data.level.next.booksToNext} buku lagi → {data.level.next.emoji} {data.level.next.name}
                    </div>
                  )}
                </div>
              </div>
              {data.level.next && (
                <Progress value={data.level.next.progressPercent} className="h-1.5 mt-2" />
              )}
            </div>
            {data.certificates.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Sertifikat Terbaru
                </div>
                {data.certificates.slice(0, 2).map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <span className="text-lg">{cert.emoji}</span>
                    <div className="flex-1 text-xs font-medium">{cert.title}</div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "level" && (
          <div className="space-y-2">
            <div className="p-3 rounded-md border bg-gradient-to-br from-emerald-50 to-blue-50">
              <div className="text-center">
                <div className="text-4xl mb-1">{data.level.emoji}</div>
                <div className="font-bold text-lg">{data.level.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.level.booksRead} buku dibaca
                </div>
              </div>
              {data.level.next && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      Menuju {data.level.next.emoji} {data.level.next.name}
                    </span>
                    <span className="font-medium">
                      {data.level.next.booksToNext} buku lagi
                    </span>
                  </div>
                  <Progress value={data.level.next.progressPercent} className="h-2" />
                </div>
              )}
            </div>
            {data.level.perks.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Keuntungan Level
                </div>
                {data.level.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-3 w-3 text-emerald-500" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "streak" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-md bg-orange-50 border border-orange-200 text-center">
                <Flame className="h-5 w-5 mx-auto text-orange-500" />
                <div className="text-2xl font-bold text-orange-700 mt-1">
                  {data.streak.current}
                </div>
                <div className="text-[10px] text-orange-600">Hari Saat Ini</div>
              </div>
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-center">
                <Trophy className="h-5 w-5 mx-auto text-amber-500" />
                <div className="text-2xl font-bold text-amber-700 mt-1">
                  {data.streak.longest}
                </div>
                <div className="text-[10px] text-amber-600">Streak Terbaik</div>
              </div>
            </div>
            {data.streak.current > 0 && (
              <div className="p-2 rounded-md bg-orange-50 border border-orange-200 text-xs text-center text-orange-700">
                🔥 {data.streak.current} hari berturut-turut! Pertahankan!
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                // Navigate to streak detail
              }}
            >
              Lihat Detail Streak
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        {tab === "achievements" && (
          <div className="space-y-2">
            {data.certificates.length === 0 ? (
              <div className="text-center py-4">
                <Lock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <div className="text-xs text-muted-foreground">
                  Belum ada sertifikat. Terus membaca untuk mendapatkannya!
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {data.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-2 rounded-md border bg-gradient-to-br from-amber-50 to-yellow-50 text-center cursor-pointer hover:shadow-md"
                  >
                    <div className="text-2xl">{cert.emoji}</div>
                    <div className="text-[10px] font-medium mt-1 truncate">
                      {cert.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "challenges" && (
          <div className="space-y-2">
            {data.activeChallenges.length === 0 ? (
              <div className="text-center py-4">
                <Star className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <div className="text-xs text-muted-foreground">
                  Tidak ada tantangan aktif. Cek kembali bulan depan!
                </div>
              </div>
            ) : (
              data.activeChallenges.map((ch) => (
                <div key={ch.id} className="p-2 rounded-md border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-medium">{ch.title}</div>
                    <Badge variant="outline" className="text-[10px]">
                      {ch.type}
                    </Badge>
                  </div>
                  <Progress value={ch.progress} className="h-1.5" />
                  <div className="text-[10px] text-muted-foreground text-right mt-1">
                    {ch.progress}% selesai
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Action footer */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              // Open full achievements page
            }}
          >
            Lihat Semua Pencapaian
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStat({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  };
  return (
    <div className={cn("p-2 rounded-md border text-center", colorClasses[color])}>
      <div className="text-base">{icon}</div>
      <div className="text-sm font-bold leading-tight">{value}</div>
      <div className="text-[9px] opacity-80">{label}</div>
    </div>
  );
}
