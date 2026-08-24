"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Footprints,
  LogIn,
  LogOut,
  Clock,
  Users,
  Search,
  Loader2,
  Activity,
  CheckCircle2,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Badge } from "@/components/ui/data-display/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

interface Attendance {
  id: string;
  memberId: string;
  checkIn: string;
  checkOut: string | null;
  purpose: string | null;
  room: string | null;
  member: { fullName: string; memberNumber: string; category: string; classGrade: string | null };
}

interface AttendanceResponse {
  attendances: Attendance[];
  stats: { total: number; checkedIn: number; checkedOut: number };
}

const PURPOSES = [
  { value: "MEMBER", label: "Anggota", icon: Users },
  { value: "READING", label: "Membaca", icon: BookOpen },
  { value: "STUDY_GROUP", label: "Belajar Kelompok", icon: GraduationCap },
  { value: "EVENT", label: "Acara", icon: Activity },
];

export function AttendanceView() {
  const user = useAppStore((s) => s.user);
  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";

  const { data: response, loading, refetch } = useFetch<AttendanceResponse>("/api/attendance");
  const attendances = response?.attendances || [];
  const stats = response?.stats || { total: 0, checkedIn: 0, checkedOut: 0 };

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [form, setForm] = useState({ purpose: "READING", room: "" });
  const [saving, setSaving] = useState(false);

  const [checkOutTarget, setCheckOutTarget] = useState<Attendance | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const [search, setSearch] = useState("");

  const filtered = attendances.filter((a) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      a.member.fullName.toLowerCase().includes(s) ||
      a.member.memberNumber.toLowerCase().includes(s)
    );
  });

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/attendance", {
        purpose: form.purpose || undefined,
        room: form.room || undefined,
      });
      toast.success("Check-in berhasil. Selamat datang di perpustakaan!");
      setCheckInOpen(false);
      setForm({ purpose: "READING", room: "" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal check-in");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckOut() {
    if (!checkOutTarget) return;
    setCheckingOut(true);
    try {
      await api.put(`/api/attendance/${checkOutTarget.id}`, {});
      toast.success("Check-out berhasil. Sampai jumpa!");
      setCheckOutTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal check-out");
    } finally {
      setCheckingOut(false);
    }
  }

  function calcDuration(checkIn: string, checkOut: string | null): string {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : new Date();
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    if (minutes < 60) return `${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi Perpustakaan"
        description="Catat kehadiran siswa saat masuk dan keluar perpustakaan"
        icon={Footprints}
        actions={
          <Button onClick={() => setCheckInOpen(true)} className="gap-2">
            <LogIn className="h-4 w-4" />
            Check-in
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Hari Ini" value={stats.total} icon={Users} color="bg-primary/10 text-primary" />
        <StatCard label="Sedang di Dalam" value={stats.checkedIn} icon={Activity} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="Sudah Check-out" value={stats.checkedOut} icon={CheckCircle2} color="bg-sky-100 text-sky-700" />
      </div>

      {/* Current visitors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Pengunjung Saat Ini</CardTitle>
              <CardDescription>{attendances.filter((a) => !a.checkOut).length} orang sedang di perpustakaan</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Footprints}
              title="Belum ada pengunjung hari ini"
              description="Klik tombol Check-in untuk mencatat kehadiran."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => {
                const isActive = !a.checkOut;
                const purposeObj = PURPOSES.find((p) => p.value === a.purpose);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isActive ? "border-emerald-200 bg-emerald-50/50" : ""
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                        isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isActive ? <Activity className="h-5 w-5 animate-pulse" /> : <CheckCircle2 className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">{a.member.fullName}</p>
                        <Badge variant="outline" className="text-[10px]">{a.member.memberNumber}</Badge>
                        {isActive && (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <Activity className="h-3 w-3" />
                            Aktif
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          <Clock className="inline h-3 w-3 mr-0.5" />
                          In: {new Date(a.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          {a.checkOut && (
                            <> • Out: {new Date(a.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>
                          )}
                        </span>
                        {purposeObj && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-background rounded">
                            <purposeObj.icon className="h-3 w-3" />
                            {purposeObj.label}
                          </span>
                        )}
                        {a.room && <span className="px-1.5 py-0.5 bg-background rounded">{a.room}</span>}
                        <span className="font-medium text-primary">{calcDuration(a.checkIn, a.checkOut)}</span>
                      </div>
                    </div>
                    {isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCheckOutTarget(a)}
                        className="gap-1.5 shrink-0"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Check-out
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Check-in */}
      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Check-in Perpustakaan
            </DialogTitle>
            <DialogDescription>Catat kehadiran saat masuk perpustakaan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tujuan</Label>
              <div className="grid grid-cols-2 gap-2">
                {PURPOSES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, purpose: p.value }))}
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors ${
                      form.purpose === p.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    <p.icon className="h-3.5 w-3.5" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-room">Ruang (opsional)</Label>
              <Input
                id="att-room"
                value={form.room}
                onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
                placeholder="Mis. Ruang Baca Utama"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCheckInOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <LogIn className="h-4 w-4" />
                Check-in
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Check-out */}
      <Dialog open={!!checkOutTarget} onOpenChange={(o) => !o && setCheckOutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check-out dari Perpustakaan?</DialogTitle>
            <DialogDescription>
              {checkOutTarget && (
                <>
                  Catat waktu keluar untuk <b className="text-foreground">{checkOutTarget.member.fullName}</b>.
                  Durasi kunjungan akan dihitung otomatis.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOutTarget(null)} disabled={checkingOut}>
              Batal
            </Button>
            <Button onClick={handleCheckOut} disabled={checkingOut} className="gap-2">
              {checkingOut && <Loader2 className="h-4 w-4 animate-spin" />}
              <LogOut className="h-4 w-4" />
              Check-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
