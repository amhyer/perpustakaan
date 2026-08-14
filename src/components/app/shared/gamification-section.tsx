"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  BookMarked,
  Trophy,
  Clock,
  Compass,
  Target,
  Loader2,
  Crown,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";

interface BadgeData {
  id: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: { current: number; target: number };
}

interface GamificationResult {
  badges: BadgeData[];
  booksRead: number;
  readingGoalTarget: number | null;
  readingGoalProgress: number;
}

interface LeaderboardEntry {
  rank: number;
  memberId: string;
  fullName: string;
  memberNumber: string;
  category: string;
  photo: string | null;
  loanCount: number;
}

interface LeaderboardResult {
  month: string;
  leaderboard: LeaderboardEntry[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  BookMarked,
  Trophy,
  Clock,
  Compass,
};

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w.charAt(0)).join("").toUpperCase();
}

export function GamificationSection({ memberId }: { memberId: string }) {
  const { data: gamif, refetch: refetchGamif } = useFetch<GamificationResult>("/api/gamification");
  const { data: leaderboardData } = useFetch<LeaderboardResult>("/api/gamification/leaderboard");
  const [settingGoal, setSettingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  async function handleSetGoal(e: React.FormEvent) {
    e.preventDefault();
    const target = parseInt(goalInput, 10);
    if (isNaN(target) || target < 1 || target > 100) {
      toast.error("Target harus antara 1-100");
      return;
    }
    setSavingGoal(true);
    try {
      await api.put("/api/gamification/goal", { target });
      toast.success(`Target baca diatur: ${target} buku`);
      setSettingGoal(false);
      setGoalInput("");
      refetchGamif();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan target");
    } finally {
      setSavingGoal(false);
    }
  }

  if (!gamif) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  const goalProgress = gamif.readingGoalTarget
    ? Math.min(100, Math.round((gamif.readingGoalProgress / gamif.readingGoalTarget) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Reading Goal */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Target Baca Tahunan
          </h3>
          {!settingGoal && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setGoalInput(String(gamif.readingGoalTarget ?? 10));
                setSettingGoal(true);
              }}
            >
              {gamif.readingGoalTarget ? "Ubah" : "Set Target"}
            </Button>
          )}
        </div>

        {settingGoal ? (
          <form onSubmit={handleSetGoal} className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={100}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-24"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">buku/tahun</span>
            <Button type="submit" size="sm" disabled={savingGoal} className="gap-1">
              {savingGoal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSettingGoal(false)}>
              Batal
            </Button>
          </form>
        ) : gamif.readingGoalTarget ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {gamif.readingGoalProgress} / {gamif.readingGoalTarget} buku tahun ini
              </span>
              <span className="font-semibold text-primary">{goalProgress}%</span>
            </div>
            <Progress value={goalProgress} className="h-2" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada target. Set target baca tahunan untuk melacak progress Anda!
          </p>
        )}
      </Card>

      {/* Badges */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Badge & Pencapaian
          <Badge variant="secondary" className="ml-1">
            {gamif.badges.filter((b) => b.earned).length}/{gamif.badges.length}
          </Badge>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {gamif.badges.map((badge) => {
            const Icon = ICON_MAP[badge.icon] || Trophy;
            return (
              <div
                key={badge.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  badge.earned
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-border bg-muted/30 opacity-60"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    badge.earned ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${badge.earned ? "text-foreground" : "text-muted-foreground"}`}>
                    {badge.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                  {badge.progress && !badge.earned && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Progress
                        value={(badge.progress.current / badge.progress.target) * 100}
                        className="h-1 flex-1"
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {badge.progress.current}/{badge.progress.target}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Leaderboard */}
      {leaderboardData && leaderboardData.leaderboard.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            Paling Aktif Bulan Ini
            <span className="text-xs font-normal text-muted-foreground">
              · {leaderboardData.month}
            </span>
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {leaderboardData.leaderboard.map((entry) => (
              <div
                key={entry.memberId}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  entry.memberId === memberId ? "border-primary/30 bg-primary/5" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    entry.rank === 1
                      ? "bg-yellow-100 text-yellow-700"
                      : entry.rank === 2
                      ? "bg-gray-100 text-gray-600"
                      : entry.rank === 3
                      ? "bg-orange-100 text-orange-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {entry.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{entry.memberNumber}</span>
                    {" · "}
                    <Badge variant="outline" className={`text-[10px] py-0 ${ROLE_COLORS[entry.category] ?? ""}`}>
                      {ROLE_LABELS[entry.category] ?? entry.category}
                    </Badge>
                  </p>
                </div>
                <span className="text-sm font-bold text-primary shrink-0">{entry.loanCount}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
