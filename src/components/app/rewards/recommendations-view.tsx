"use client";

/**
 * RecommendationsView — Personalized book recommendations.
 *
 * Tampilan: grid kartu buku dengan:
 * - Cover, judul, author
 * - Score badge (%)
 * - Reason ("Trending", "Karena kamu pinjam fiksi")
 * - Tombol "Lihat Buku" / "Pinjam"
 */

import { useEffect, useState } from "react";
import { Sparkles, BookOpen, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Recommendation {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string | null;
  category: string | null;
  score: number;
  reason: string;
}

interface RecommendationsViewProps {
  className?: string;
  topN?: number;
  compact?: boolean;
}

export function RecommendationsView({
  className,
  topN = 6,
  compact = false,
}: RecommendationsViewProps) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.get<{ recommendations: Recommendation[] }>(
        `/api/recommendations?topN=${topN}${refresh ? "&refresh=true" : ""}`
      );
      setRecs(data.recommendations);
    } catch (err) {
      toast.error("Gagal memuat rekomendasi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topN]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold">Rekomendasi Untukmu</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: topN }).map((_, i) => (
              <div key={i} className="h-40 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recs.length === 0) {
    return null; // No recommendations yet (user baru)
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Mungkin Kamu Suka
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetch(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recs.map((r) => (
              <div
                key={r.bookId}
                className="shrink-0 w-32 border rounded-lg p-2 hover:shadow-md transition-shadow"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-purple-100 to-pink-100 rounded mb-2 flex items-center justify-center text-3xl">
                  {r.bookCover ? (
                    <img
                      src={r.bookCover}
                      alt={r.bookTitle}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <BookOpen className="h-8 w-8 text-purple-400" />
                  )}
                </div>
                <div className="text-xs font-semibold line-clamp-2">{r.bookTitle}</div>
                <div className="text-[10px] text-slate-500 line-clamp-1">
                  {r.bookAuthor}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Rekomendasi Untukmu
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetch(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {recs.map((r) => (
            <div
              key={r.bookId}
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="aspect-[3/4] bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative">
                {r.bookCover ? (
                  <img
                    src={r.bookCover}
                    alt={r.bookTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-12 w-12 text-purple-400" />
                )}
                <div className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {Math.round(r.score * 100)}%
                </div>
              </div>
              <div className="p-2">
                <div className="text-xs font-semibold line-clamp-2 min-h-[2rem]">
                  {r.bookTitle}
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1 mb-1">
                  {r.bookAuthor}
                </div>
                <div className="text-[10px] text-purple-600 flex items-start gap-0.5">
                  <TrendingUp className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{r.reason}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
