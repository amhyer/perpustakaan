"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Trophy,
  Plus,
  Loader2,
  Target,
  Users,
  CheckCircle2,
  Flame,
  BookOpen,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { Badge } from "@/components/ui/data-display/badge";
import { Card } from "@/components/ui/layout/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

interface ChallengeParticipant {
  id: string;
  memberId: string;
  currentValue: number;
  isCompleted: boolean;
  completedAt: string | null;
  member: { id: string; fullName: string; memberNumber: string };
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  month: number;
  year: number;
  goalType: string;
  goalValue: number;
  rewardPoints: number;
  badgeName: string | null;
  isActive: boolean;
  participants: ChallengeParticipant[];
}

interface MyProgress {
  id: string;
  currentValue: number;
  isCompleted: boolean;
  completedAt: string | null;
}

interface LeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  memberNumber: string;
  currentValue: number;
  isCompleted: boolean;
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  BOOKS_COUNT: "Buku",
  PAGES_COUNT: "Halaman",
  STREAK: "Hari Berturut-turut",
};

const GOAL_TYPE_ICONS: Record<string, React.ElementType> = {
  BOOKS_COUNT: BookOpen,
  PAGES_COUNT: Target,
  STREAK: Flame,
};

const MONTH_NAMES = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function ReadingChallengesView() {
  const user = useAppStore((s) => s.user);
  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    goalType: "BOOKS_COUNT",
    goalValue: 3,
    rewardPoints: 100,
    badgeName: "",
  });

  const { data: resp, loading, error, refetch } = useFetch<{
    challenge: Challenge | null;
    myProgress: MyProgress | null;
    leaderboard: LeaderboardEntry[];
  }>("/api/reading-challenges");

  const challenge = resp?.challenge;
  const myProgress = resp?.myProgress;
  const leaderboard = resp?.leaderboard ?? [];

  async function handleCreate() {
    if (!form.title.trim() || form.goalValue < 1) {
      toast.error("Judul dan target wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/reading-challenges", {
        title: form.title.trim(),
        description: form.description.trim(),
        goalType: form.goalType,
        goalValue: form.goalValue,
        rewardPoints: form.rewardPoints,
        badgeName: form.badgeName.trim() || undefined,
      });
      toast.success("Reading Challenge berhasil dibuat!");
      setCreateOpen(false);
      setForm({ title: "", description: "", goalType: "BOOKS_COUNT", goalValue: 3, rewardPoints: 100, badgeName: "" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat challenge");
    } finally {
      setSaving(false);
    }
  }

  async function handleJoin() {
    if (!challenge) return;
    setJoining(true);
    try {
      await api.post(`/api/reading-challenges/${challenge.id}/join`);
      toast.success("Berhasil bergabung!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal bergabung");
    } finally {
      setJoining(false);
    }
  }

  async function handleUpdateProgress() {
    if (!challenge) return;
    const val = parseInt(progressValue);
    if (isNaN(val) || val < 0) {
      toast.error("Masukkan angka yang valid");
      return;
    }
    setUpdatingProgress(true);
    try {
      await api.put(`/api/reading-challenges/${challenge.id}/progress`, {
        currentValue: val,
      });
      toast.success("Progress diperbarui!");
      setProgressValue("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update progress");
    } finally {
      setUpdatingProgress(false);
    }
  }

  const GoalIcon = GOAL_TYPE_ICONS[challenge?.goalType || "BOOKS_COUNT"] || Target;
  const progressPercent = challenge && myProgress
    ? Math.min(100, Math.round((myProgress.currentValue / challenge.goalValue) * 100))
    : 0;

  return (
    <div className="space-y-6 mx-auto w-full max-w-3xl">
      <PageHeader
        title="Reading Challenge"
        description="Tantangan membaca bulanan"
        icon={Trophy}
        actions={
          isLibrarian ? (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Challenge
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={Trophy}
            title="Gagal memuat data"
            description={error}
            action={{ label: "Coba lagi", onClick: refetch }}
          />
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="space-y-3">
              <div className="h-6 w-2/3 rounded bg-muted animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
              <div className="h-24 w-full rounded bg-muted animate-pulse mt-2" />
            </div>
          </Card>
        </div>
      ) : !challenge ? (
        <Card className="p-6">
          <EmptyState
            icon={Trophy}
            title="Belum ada Challenge aktif"
            description={
              isLibrarian
                ? "Buat reading challenge bulanan untuk memotivasi siswa."
                : "Belum ada tantangan membaca untuk bulan ini."
            }
            action={
              isLibrarian
                ? { label: "Buat Challenge", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <GoalIcon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-lg text-foreground">{challenge.title}</h2>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    {MONTH_NAMES[challenge.month]} {challenge.year}
                  </Badge>
                </div>
                {challenge.description && (
                  <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Target: {challenge.goalValue} {GOAL_TYPE_LABELS[challenge.goalType] || challenge.goalType}
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <TrendingUp className="h-4 w-4" />
                    +{challenge.rewardPoints} poin
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {challenge.participants.length} peserta
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {myProgress ? (
            <Card className="p-5">
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Progress Saya
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {myProgress.currentValue} / {challenge.goalValue} {GOAL_TYPE_LABELS[challenge.goalType]}
                  </span>
                  <span className="font-medium text-foreground">{progressPercent}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {myProgress.isCompleted ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Selesai! +{challenge.rewardPoints} poin
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={progressValue}
                      onChange={(e) => setProgressValue(e.target.value)}
                      placeholder="Jumlah terbaru"
                      className="w-32"
                    />
                    <Button
                      size="sm"
                      onClick={handleUpdateProgress}
                      disabled={updatingProgress || !progressValue}
                      className="gap-1.5"
                    >
                      {updatingProgress && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Update
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Bergabung untuk mulai tantangan membaca bulan ini!
                </p>
                <Button onClick={handleJoin} disabled={joining} className="gap-2">
                  {joining && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Plus className="h-4 w-4" />
                  Bergabung
                </Button>
              </div>
            </Card>
          )}

          {leaderboard.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Leaderboard
              </h3>
              <Card className="divide-y">
                {leaderboard.map((entry) => {
                  const pct = Math.min(100, Math.round((entry.currentValue / challenge.goalValue) * 100));
                  return (
                    <div key={entry.memberId} className="flex items-center gap-3 p-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        entry.rank === 1
                          ? "bg-amber-100 text-amber-700"
                          : entry.rank === 2
                          ? "bg-gray-100 text-gray-600"
                          : entry.rank === 3
                          ? "bg-orange-100 text-orange-700"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {entry.memberName}
                          {entry.memberId === user?.member?.id && (
                            <span className="ml-1.5 text-xs text-primary">(Kamu)</span>
                          )}
                        </p>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-foreground">
                          {entry.currentValue}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {GOAL_TYPE_LABELS[challenge.goalType]}
                        </p>
                      </div>
                      {entry.isCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Buat Reading Challenge Baru</DialogTitle>
            <DialogDescription>
              Buat tantangan membaca bulanan untuk siswa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rc-title">Judul Challenge *</Label>
              <Input
                id="rc-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Mis. Baca 3 Buku September"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-desc">Deskripsi</Label>
              <Textarea
                id="rc-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Jelaskan tantangan ini..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rc-goalType">Tipe Target</Label>
                <select
                  id="rc-goalType"
                  value={form.goalType}
                  onChange={(e) => setForm((p) => ({ ...p, goalType: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="BOOKS_COUNT">Jumlah Buku</option>
                  <option value="PAGES_COUNT">Jumlah Halaman</option>
                  <option value="STREAK">Streak Hari</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc-goalValue">Target *</Label>
                <Input
                  id="rc-goalValue"
                  type="number"
                  min={1}
                  value={form.goalValue}
                  onChange={(e) => setForm((p) => ({ ...p, goalValue: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rc-points">Poin Hadiah</Label>
                <Input
                  id="rc-points"
                  type="number"
                  min={0}
                  value={form.rewardPoints}
                  onChange={(e) => setForm((p) => ({ ...p, rewardPoints: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc-badge">Nama Badge</Label>
                <Input
                  id="rc-badge"
                  value={form.badgeName}
                  onChange={(e) => setForm((p) => ({ ...p, badgeName: e.target.value }))}
                  placeholder="Opsional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Buat Challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
