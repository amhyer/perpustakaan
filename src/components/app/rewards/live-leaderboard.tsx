"use client";

/**
 * LiveLeaderboard — Real-time leaderboard untuk siswa.
 *
 * - Initial load via /api/points/me (current user) + /api/rewards/analytics
 * - Subscribe to SSE events:
 *   - reward:points-earned (own) → increment anim
 *   - reward:leaderboard-updated (global) → refresh rankings
 * - Animasi pulse saat ada perubahan
 */

import { useEffect, useState, useRef } from "react";
import { Trophy, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/layout/card";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useEventStream } from "@/hooks/use-event-stream";

interface LeaderboardEntry {
  rank: number;
  member: {
    id: string;
    fullName: string;
    memberNumber: string;
    classGrade: string | null;
  };
  balance: number;
  delta?: number; // recent change
}

interface LiveLeaderboardProps {
  currentUserId?: string;
  topN?: number;
  className?: string;
}

export function LiveLeaderboard({
  currentUserId,
  topN = 10,
  className,
}: LiveLeaderboardProps) {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [recentChanges, setRecentChanges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  const fetchLeaderboard = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await api.get<{
        leaderboard: LeaderboardEntry[];
        kpis: { totalCirculation: number };
      }>("/api/rewards/analytics");
      const top = data.leaderboard.slice(0, topN);
      setRankings(top);

      // Find current user rank
      if (currentUserId) {
        const myEntry = data.leaderboard.find(
          (e) => e.member.id === currentUserId
        );
        setMyRank(myEntry?.rank ?? null);
      }
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, topN]);

  // Listen to real-time events
  const { addEventListener } = useEventStream();

  useEffect(() => {
    const unsubEarn = addEventListener("reward:points-earned", (data: any) => {
      // Flash animation
      if (data.memberId === currentUserId) {
        setRecentChanges((prev) => new Set(prev).add(data.memberId));
        setTimeout(() => {
          setRecentChanges((prev) => {
            const next = new Set(prev);
            next.delete(data.memberId);
            return next;
          });
        }, 2000);
      }
      // Throttle: only refetch every 5 seconds
      const now = Date.now();
      if (now - lastFetchRef.current > 5000) {
        lastFetchRef.current = now;
        fetchLeaderboard(false);
      }
    });

    const unsubLeaderboard = addEventListener(
      "reward:leaderboard-updated",
      (data: any) => {
        const now = Date.now();
        if (now - lastFetchRef.current > 5000) {
          lastFetchRef.current = now;
          fetchLeaderboard(false);
        }
      }
    );

    return () => {
      unsubEarn();
      unsubLeaderboard();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">Leaderboard</h3>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
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
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">Top {topN} Pembaca</h3>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          {myRank && (
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
              Kamu: #{myRank}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {rankings.map((entry) => {
            const isCurrentUser = entry.member.id === currentUserId;
            const isChanged = recentChanges.has(entry.member.id);
            const rank = entry.rank;

            return (
              <div
                key={entry.member.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-all",
                  rank === 1 && "bg-gradient-to-r from-amber-50 to-yellow-50",
                  rank === 2 && "bg-slate-50",
                  rank === 3 && "bg-orange-50",
                  isCurrentUser && "ring-2 ring-blue-400",
                  isChanged && "ring-2 ring-green-400 animate-pulse"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0",
                    rank === 1 && "bg-amber-400",
                    rank === 2 && "bg-slate-400",
                    rank === 3 && "bg-orange-400",
                    rank > 3 && "bg-slate-200 text-slate-600"
                  )}
                >
                  {rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate flex items-center gap-1">
                    {entry.member.fullName}
                    {isCurrentUser && (
                      <Sparkles className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.member.classGrade || entry.member.memberNumber}
                  </div>
                </div>
                <div className="font-bold text-amber-700 shrink-0 flex items-center gap-1">
                  {entry.balance.toLocaleString()}
                  {entry.delta !== undefined && entry.delta !== 0 && (
                    <span
                      className={cn(
                        "text-xs",
                        entry.delta > 0 ? "text-green-600" : "text-red-500"
                      )}
                    >
                      {entry.delta > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {myRank && myRank > topN && (
          <div className="mt-3 pt-3 border-t text-center text-xs text-slate-500">
            Rank #{myRank} belum masuk top {topN}. Terus membaca! 💪
          </div>
        )}
      </CardContent>
    </Card>
  );
}
