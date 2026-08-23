"use client";

/**
 * Widget Poin Saya — Tampil di dashboard siswa/guru.
 * Real-time refresh on mount. Click untuk buka detail.
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Sparkles, TrendingUp, Flame, BookOpen } from "lucide-react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PointSummary {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  booksRead: number;
  currentStreak: number;
  lastEarn: { amount: number; description: string; createdAt: string } | null;
}

interface PointWidgetProps {
  variant?: "compact" | "expanded";
  className?: string;
}

export function PointWidget({ variant = "compact", className }: PointWidgetProps) {
  const [data, setData] = useState<PointSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PointSummary>("/api/points/me")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={cn("bg-amber-50 border border-amber-200 rounded-xl p-4 animate-pulse", className)}>
        <div className="h-4 w-24 bg-amber-200 rounded mb-2" />
        <div className="h-8 w-16 bg-amber-200 rounded" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (variant === "compact") {
    return (
      <Link href="/rewards">
        <div
          className={cn(
            "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer",
            className
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-2xl">⭐</div>
              <div>
                <div className="text-xs text-slate-600">Poin Saya</div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">
                  {data.balance}
                </div>
              </div>
            </div>
            <button className="text-xs bg-white border border-amber-300 px-2.5 py-1 rounded-md text-amber-700 font-medium hover:bg-amber-50">
              Tukar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/60 rounded-lg p-1.5">
              <div className="text-sm font-bold text-slate-900">{data.booksRead}</div>
              <div className="text-[10px] text-slate-600">Buku tahun ini</div>
            </div>
            <div className="bg-white/60 rounded-lg p-1.5">
              <div className="text-sm font-bold text-orange-600 flex items-center justify-center gap-0.5">
                <Flame className="h-3 w-3" /> {data.currentStreak}
              </div>
              <div className="text-[10px] text-slate-600">Streak hari</div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Expanded variant
  return (
    <Link href="/rewards" className="block">
      <Card
        className={cn(
          "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-amber-200 hover:shadow-lg transition-shadow cursor-pointer",
          className
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="text-3xl">⭐</div>
              <div>
                <div className="text-xs text-slate-600">Poin Saya</div>
                <div className="text-3xl font-bold text-slate-900">{data.balance}</div>
              </div>
            </div>
            <button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-shadow">
              Tukar Poin →
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/60 rounded-lg p-2">
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                <div className="text-lg font-bold text-slate-900">{data.booksRead}</div>
              </div>
              <div className="text-xs text-slate-600">Buku tahun ini</div>
            </div>
            <div className="bg-white/60 rounded-lg p-2">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-3.5 w-3.5 text-orange-600" />
                <div className="text-lg font-bold text-orange-600">{data.currentStreak}</div>
              </div>
              <div className="text-xs text-slate-600">Streak hari</div>
            </div>
            <div className="bg-white/60 rounded-lg p-2">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <div className="text-lg font-bold text-slate-900">
                  +{data.totalEarned}
                </div>
              </div>
              <div className="text-xs text-slate-600">Total masuk</div>
            </div>
          </div>

          {data.lastEarn && (
            <div className="mt-4 pt-3 border-t border-amber-200/60 text-xs text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="line-clamp-1">
                +{data.lastEarn.amount} — {data.lastEarn.description}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
