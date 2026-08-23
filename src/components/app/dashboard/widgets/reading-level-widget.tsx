"use client";

/**
 * ReadingLevelWidget — Display member's reading level + progress.
 *
 * Sprint M - Tier 1 #2: Gamification lanjutan.
 *
 * Shows:
 * - Current level with emoji, color, name
 * - Progress bar to next level
 * - Books to next level
 * - Perks (max books, point multiplier)
 * - Overall & class rank
 * - Click → Reading level detail page (future)
 *
 * For students (members). Hidden for librarians.
 */

import { useEffect, useState } from "react";
import {
  Sprout,
  BookOpen,
  BookMarked,
  Library,
  Compass,
  GraduationCap,
  Crown,
  ArrowRight,
  TrendingUp,
  Award,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import { Progress } from "@/components/ui/feedback/progress";
import { Badge } from "@/components/ui/data-display/badge";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface LevelData {
  booksRead: number;
  level: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    description: string;
    pointMultiplier: number;
    perks: string[];
  };
  next: {
    id: string;
    name: string;
    emoji: string;
  } | null;
  progressPercent: number;
  booksToNext: number | null;
  rank: number | null;
  rankInClass: number | null;
  classGrade: string | null;
}

const ICON_MAP: Record<string, typeof Sprout> = {
  Sprout,
  BookOpen,
  BookMarked,
  Library,
  Compass,
  GraduationCap,
  Crown,
};

export function ReadingLevelWidget() {
  const [data, setData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<LevelData>("/api/gamification/level")
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        // Mock fallback
        setData({
          booksRead: 23,
          level: {
            id: "kutu-buku",
            name: "Kutu Buku",
            emoji: "📚",
            color: "emerald",
            bgClass: "bg-emerald-50",
            textClass: "text-emerald-700",
            borderClass: "border-emerald-300",
            description: "Hampir tidak bisa lepas dari buku",
            pointMultiplier: 1.2,
            perks: ["+20% poin", "Pinjam 5 buku", "Akses e-book"],
          },
          next: {
            id: "kolektor",
            name: "Kolektor",
            emoji: "🏆",
          },
          progressPercent: 34,
          booksToNext: 27,
          rank: 12,
          rankInClass: 3,
          classGrade: "10-A",
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Level Membaca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const Icon = ICON_MAP["BookMarked"]; // Default icon since we use emoji for level display
  const LevelIcon = ICON_MAP[data.level.id === "pemula" ? "Sprout" :
                                data.level.id === "pembaca" ? "BookOpen" :
                                data.level.id === "kutu-buku" ? "BookMarked" :
                                data.level.id === "kolektor" ? "Library" :
                                data.level.id === "penjelajah" ? "Compass" :
                                data.level.id === "maestro" ? "GraduationCap" :
                                data.level.id === "legenda" ? "Crown" : "BookOpen"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Level Membaca
          <Badge variant="outline" className="ml-auto text-[10px]">
            {data.booksRead} buku
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current level display */}
        <div
          className={cn(
            "p-3 rounded-lg border-2 flex items-center gap-3",
            data.level.bgClass,
            data.level.borderClass
          )}
        >
          <div className="text-3xl shrink-0">{data.level.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <LevelIcon className={cn("h-4 w-4", data.level.textClass)} />
              <span className={cn("font-bold text-sm", data.level.textClass)}>
                {data.level.name}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
              {data.level.description}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {data.level.pointMultiplier > 1 && (
                <Badge
                  variant="outline"
                  className={cn("text-[9px] h-4 px-1", data.level.textClass)}
                >
                  ×{data.level.pointMultiplier} poin
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Progress to next */}
        {data.next && data.booksToNext !== null ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Menuju {data.next.emoji} {data.next.name}
              </span>
              <span className="font-medium">
                {data.booksToNext} buku lagi
              </span>
            </div>
            <Progress value={data.progressPercent} className="h-2" />
            <div className="text-[10px] text-muted-foreground text-right">
              {data.progressPercent}% tercapai
            </div>
          </div>
        ) : (
          <div className="text-center p-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-md">
            <div className="text-xs font-semibold text-yellow-800">
              🏆 Level Tertinggi!
            </div>
            <div className="text-[10px] text-yellow-700">
              Anda telah mencapai puncak
            </div>
          </div>
        )}

        {/* Ranks */}
        <div className="grid grid-cols-2 gap-2">
          {data.rank && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-center">
              <Users className="h-3 w-3 mx-auto text-blue-600 mb-0.5" />
              <div className="text-sm font-bold text-blue-700">
                #{data.rank}
              </div>
              <div className="text-[9px] text-blue-600">Ranking Sekolah</div>
            </div>
          )}
          {data.rankInClass && data.classGrade && (
            <div className="p-2 bg-violet-50 border border-violet-200 rounded-md text-center">
              <Award className="h-3 w-3 mx-auto text-violet-600 mb-0.5" />
              <div className="text-sm font-bold text-violet-700">
                #{data.rankInClass}
              </div>
              <div className="text-[9px] text-violet-600">
                Kelas {data.classGrade}
              </div>
            </div>
          )}
        </div>

        {/* Perks */}
        {data.level.perks.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Keuntungan Level
            </div>
            <div className="space-y-0.5">
              {data.level.perks.slice(0, 3).map((perk, idx) => (
                <div
                  key={idx}
                  className="text-[11px] flex items-center gap-1.5 text-muted-foreground"
                >
                  <ArrowRight className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
