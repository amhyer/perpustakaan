"use client";

/**
 * LibrarianActivityWidget — Today's activity for pustakawan.
 *
 * Sprint G2 - Phase D: Role-specific dashboard widgets.
 *
 * Shows:
 * - Today's loan count
 * - Pending returns
 * - Books needing cataloging
 * - New members today
 * - Pending announcements
 * - Recent critical actions
 *
 * Data fetched from /api/dashboard/librarian-stats (graceful fallback if 500)
 */

import { useEffect, useState } from "react";
import {
  BookOpen,
  Clock,
  UserPlus,
  Megaphone,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowRight,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface LibrarianStats {
  today: {
    loansCreated: number;
    returns: number;
    newMembers: number;
    overdueCount: number;
    pendingApprovals: number;
  };
  weekly: {
    loansThisWeek: number;
    loansLastWeek: number;
    trendPercent: number;
  };
  alerts: Array<{
    type: "info" | "warning" | "critical";
    title: string;
    description: string;
    action?: string;
  }>;
}

export function LibrarianActivityWidget() {
  const [stats, setStats] = useState<LibrarianStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<LibrarianStats>("/api/dashboard/librarian-stats")
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading || error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Aktivitas Pustakawan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Aktivitas Pustakawan
          <Badge variant="outline" className="ml-auto text-[10px]">
            Hari ini
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatBox
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Pinjam Baru"
            value={stats.today.loansCreated}
            color="blue"
          />
          <StatBox
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Pengembalian"
            value={stats.today.returns}
            color="green"
          />
          <StatBox
            icon={<UserPlus className="h-3.5 w-3.5" />}
            label="Anggota Baru"
            value={stats.today.newMembers}
            color="purple"
          />
          <StatBox
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            label="Terlambat"
            value={stats.today.overdueCount}
            color="red"
            pulse={stats.today.overdueCount > 0}
          />
        </div>

        {/* Weekly trend */}
        <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
          <TrendingUp
            className={cn(
              "h-4 w-4",
              stats.weekly.trendPercent >= 0 ? "text-green-600" : "text-red-600"
            )}
          />
          <div className="flex-1 text-xs">
            <div className="font-medium">
              {stats.weekly.loansThisWeek} peminjaman minggu ini
            </div>
            <div className="text-muted-foreground">
              {stats.weekly.trendPercent >= 0 ? "+" : ""}
              {stats.weekly.trendPercent.toFixed(1)}% dari minggu lalu
            </div>
          </div>
        </div>

        {/* Alerts */}
        {stats.alerts.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Perhatian
            </div>
            {stats.alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md border text-xs",
                  alert.type === "critical" && "bg-red-50 border-red-200",
                  alert.type === "warning" && "bg-amber-50 border-amber-200",
                  alert.type === "info" && "bg-blue-50 border-blue-200"
                )}
              >
                <AlertCircle
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 mt-0.5",
                    alert.type === "critical" && "text-red-600",
                    alert.type === "warning" && "text-amber-600",
                    alert.type === "info" && "text-blue-600"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{alert.title}</div>
                  <div className="text-muted-foreground line-clamp-1">
                    {alert.description}
                  </div>
                </div>
                {alert.action && (
                  <button className="text-primary hover:underline shrink-0 flex items-center gap-0.5">
                    {alert.action}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "green" | "purple" | "red";
  pulse?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    purple: "text-purple-600 bg-purple-50",
    red: "text-red-600 bg-red-50",
  };
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-md border bg-background",
        pulse && "animate-pulse"
      )}
    >
      <div className={cn("h-7 w-7 rounded flex items-center justify-center", colorMap[color])}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}
