"use client";

/**
 * Activity Feed — Real-time feed aktivitas perpustakaan.
 *
 * Menampilkan event-event seperti:
 * - "Andini baru saja membaca 'Laskar Pelangi' (+10 poin)"
 * - "Budi klaim hadiah 'Bookmark'"
 * - "Pustakawan approve klaim Rina"
 *
 * Mirip Twitter timeline — semua event scrolled real-time.
 * Cocok untuk:
 * - Dashboard pustakawan (monitor aktivitas)
 * - Halaman khusus "Aktivitas" untuk siswa
 */

import { useEffect, useState, useRef } from "react";
import {
  BookOpen,
  Gift,
  CheckCircle,
  Package,
  UserPlus,
  Award,
  Megaphone,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/layout/card";
import { api } from "@/lib/api-client";
import { useEventStream } from "@/hooks/use-event-stream";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: string;
  icon: string;
  title: string;
  description: string;
  memberName?: string;
  memberAvatar?: string;
  points?: number;
  rewardName?: string;
  bookTitle?: string;
  timestamp: string;
}

const ICON_MAP: Record<string, any> = {
  BOOK_RETURNED: BookOpen,
  POINTS_EARNED: Award,
  REDEMPTION_CLAIMED: Gift,
  REDEMPTION_APPROVED: CheckCircle,
  REDEMPTION_DELIVERED: Package,
  MEMBER_JOINED: UserPlus,
  BADGE_UNLOCKED: Award,
  ANNOUNCEMENT: Megaphone,
};

const COLOR_MAP: Record<string, string> = {
  BOOK_RETURNED: "bg-blue-100 text-blue-600",
  POINTS_EARNED: "bg-amber-100 text-amber-600",
  REDEMPTION_CLAIMED: "bg-purple-100 text-purple-600",
  REDEMPTION_APPROVED: "bg-green-100 text-green-600",
  REDEMPTION_DELIVERED: "bg-emerald-100 text-emerald-600",
  MEMBER_JOINED: "bg-pink-100 text-pink-600",
  BADGE_UNLOCKED: "bg-yellow-100 text-yellow-600",
  ANNOUNCEMENT: "bg-slate-100 text-slate-600",
};

interface ActivityFeedProps {
  scope?: "all" | "school" | "personal";
  className?: string;
  maxItems?: number;
}

export function ActivityFeed({
  scope = "all",
  className,
  maxItems = 20,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      // For demo: build from various recent items
      const [transactions, redemptions, loans] = await Promise.all([
        api
          .get<{ items: any[] }>("/api/points/transactions?pageSize=10")
          .catch(() => ({ items: [] })),
        api
          .get<{ items: any[] }>("/api/redemptions/me?")
          .catch(() => ({ items: [] })),
        // Loans need a separate endpoint
        Promise.resolve({ items: [] }),
      ]);

      // Build activity list from transactions
      const items: ActivityItem[] = transactions.items
        .filter((txn) => txn.type === "EARN" || txn.type === "REDEEM")
        .slice(0, maxItems)
        .map((txn) => {
          const isEarn = txn.type === "EARN";
          return {
            id: txn.id,
            type: isEarn ? "POINTS_EARNED" : "REDEMPTION_CLAIMED",
            icon: isEarn ? "Award" : "Gift",
            title: isEarn
              ? `+${txn.amount} poin`
              : `Klaim ${txn.reward?.name || "hadiah"}`,
            description: txn.description || "",
            points: txn.amount,
            rewardName: txn.reward?.name,
            timestamp: txn.createdAt,
          };
        });

      setActivities(items);
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, maxItems]);

  // Listen to real-time events
  const handlersRef = useRef<Record<string, (data: any) => void>>({});

  handlersRef.current["reward:points-earned"] = (data: any) => {
    const newItem: ActivityItem = {
      id: `live-${Date.now()}`,
      type: "POINTS_EARNED",
      icon: "Award",
      title: `+${data.amount} poin`,
      description: data.description || "",
      points: data.amount,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newItem, ...prev].slice(0, maxItems));
    setNewCount((c) => c + 1);
  };

  handlersRef.current["reward:claim-pending"] = (data: any) => {
    const newItem: ActivityItem = {
      id: `live-${Date.now()}`,
      type: "REDEMPTION_CLAIMED",
      icon: "Gift",
      title: `Klaim ${data.rewardName}`,
      description: `${data.pointsSpent} poin`,
      rewardName: data.rewardName,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newItem, ...prev].slice(0, maxItems));
    setNewCount((c) => c + 1);
  };

  handlersRef.current["reward:claim-approved"] = (data: any) => {
    const newItem: ActivityItem = {
      id: `live-${Date.now()}`,
      type: "REDEMPTION_APPROVED",
      icon: "CheckCircle",
      title: `Klaim disetujui: ${data.rewardName}`,
      description: `Kode: ${data.pickupCode}`,
      rewardName: data.rewardName,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newItem, ...prev].slice(0, maxItems));
    setNewCount((c) => c + 1);
  };

  useEventStream({
    handlers: {
      "reward:points-earned": (data) => handlersRef.current["reward:points-earned"]?.(data),
      "reward:claim-pending": (data) => handlersRef.current["reward:claim-pending"]?.(data),
      "reward:claim-approved": (data) => handlersRef.current["reward:claim-approved"]?.(data),
    },
  });

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}d lalu`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}j lalu`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}h lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Aktivitas Terkini
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live" />
          </h3>
          {newCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {newCount} baru
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  <div className="h-2 w-1/2 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Belum ada aktivitas terkini
          </div>
        ) : (
          <div ref={containerRef} className="space-y-3 max-h-[500px] overflow-y-auto">
            {activities.map((item, idx) => {
              const Icon = ICON_MAP[item.type] || Clock;
              const colorClass = COLOR_MAP[item.type] || "bg-slate-100 text-slate-600";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex gap-3 items-start transition-all",
                    idx === 0 && "bg-blue-50 -mx-2 px-2 py-1 rounded-lg"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.title}</div>
                    {item.description && (
                      <div className="text-xs text-slate-600 line-clamp-1">
                        {item.description}
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatTime(item.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
