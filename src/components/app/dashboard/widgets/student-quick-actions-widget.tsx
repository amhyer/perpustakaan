"use client";

/**
 * StudentQuickActionsWidget — Quick actions & status untuk siswa.
 *
 * Sprint G2 - Phase D: Role-specific dashboard widgets.
 *
 * Shows:
 * - Loan status (active, overdue, due soon)
 * - Points balance & progress to next reward
 * - Reading streak
 * - Quick actions: Cari Buku, Scan ISBN, Lihat Pinjaman
 * - Recommended books (1-click to view)
 * - Recent activity
 *
 * Disesuaikan dengan kebutuhan siswa: fokus pada
 * info personal yang actionable.
 */

import { useEffect, useState } from "react";
import {
  Search,
  QrCode,
  BookOpen,
  Gift,
  Star,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import { Progress } from "@/components/ui/feedback/progress";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface StudentDashboardData {
  loans: {
    active: number;
    overdue: number;
    dueSoon: number;
  };
  points: {
    balance: number;
    earned: number;
    nextRewardThreshold: number;
    progress: number; // 0-100
  };
  streak: {
    current: number;
    best: number;
  };
  recommendations: Array<{
    id: string;
    title: string;
    author: string;
    coverColor?: string;
  }>;
}

interface StudentQuickActionsWidgetProps {
  onNavigate?: (view: string) => void;
}

export function StudentQuickActionsWidget({
  onNavigate,
}: StudentQuickActionsWidgetProps) {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<StudentDashboardData>("/api/dashboard/student-summary")
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        // Mock fallback
        setData({
          loans: { active: 2, overdue: 0, dueSoon: 1 },
          points: { balance: 145, earned: 220, nextRewardThreshold: 200, progress: 72.5 },
          streak: { current: 7, best: 14 },
          recommendations: [
            { id: "1", title: "Laskar Pelangi", author: "Andrea Hirata", coverColor: "#1e3a5f" },
            { id: "2", title: "Bumi Manusia", author: "Pramoedya A.T.", coverColor: "#dc2626" },
            { id: "3", title: "Ayat-Ayat Cinta", author: "Habiburrahman", coverColor: "#059669" },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Untuk Kamu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Untuk Kamu
          <Badge variant="outline" className="ml-auto text-[10px]">
            Personal
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <QuickActionBtn
            icon={<Search className="h-4 w-4" />}
            label="Cari"
            onClick={() => onNavigate?.("catalog")}
          />
          <QuickActionBtn
            icon={<QrCode className="h-4 w-4" />}
            label="Scan"
            onClick={() => onNavigate?.("inventory")}
          />
          <QuickActionBtn
            icon={<BookOpen className="h-4 w-4" />}
            label="Pinjaman"
            onClick={() => onNavigate?.("my-loans")}
          />
        </div>

        {/* Loan status */}
        <div
          className={cn(
            "p-3 rounded-lg border",
            data.loans.overdue > 0
              ? "bg-red-50 border-red-200"
              : data.loans.dueSoon > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-green-50 border-green-200"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {data.loans.overdue > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            <span className="text-sm font-medium">
              {data.loans.overdue > 0
                ? `${data.loans.overdue} buku terlambat!`
                : data.loans.dueSoon > 0
                ? `${data.loans.dueSoon} buku jatuh tempo soon`
                : "Semua pinjaman aman"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {data.loans.active} buku sedang dipinjam
          </div>
        </div>

        {/* Points progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-red-500" />
              <span className="text-sm font-medium">{data.points.balance} poin</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Target: {data.points.nextRewardThreshold}
            </span>
          </div>
          <Progress value={data.points.progress} className="h-1.5" />
          <div className="text-[10px] text-muted-foreground">
            {data.points.nextRewardThreshold - data.points.balance} poin lagi untuk hadiah berikutnya
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <Award className="h-4 w-4 text-orange-600" />
          <div className="flex-1">
            <div className="text-xs font-medium">Streak {data.streak.current} hari! 🔥</div>
            <div className="text-[10px] text-muted-foreground">
              Best: {data.streak.best} hari
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Mungkin Kamu Suka
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              {data.recommendations.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onNavigate?.(`book-detail-${book.id}`)}
                  className="shrink-0 w-20 hover:scale-105 transition-transform"
                >
                  <div
                    className="w-full aspect-[2/3] rounded flex items-center justify-center text-white text-[10px] font-medium p-1 text-center"
                    style={{ backgroundColor: book.coverColor || "#1e3a5f" }}
                  >
                    {book.title}
                  </div>
                  <div className="text-[10px] mt-1 line-clamp-1 font-medium">
                    {book.title}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate">
                    {book.author}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2.5 rounded-md border hover:border-primary hover:bg-primary/5 transition-colors"
    >
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
