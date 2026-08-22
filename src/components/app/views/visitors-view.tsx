"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  UserCheck,
  LogIn,
  LogOut,
  Clock,
  Users,
  Search,
  Filter,
  Plus,
  Loader2,
  Activity,
  User,
  CheckCircle2,
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
import { formatDate } from "@/lib/constants";

interface Visitor {
  id: string;
  memberId: string | null;
  name: string;
  purpose: string | null;
  checkIn: string;
  checkOut: string | null;
  member: { fullName: string; memberNumber: string; classGrade: string | null } | null;
}

const PURPOSES = ["Baca Buku", "Pinjam Buku", "Diskusi", "Tugas", "Belajar", "Lainnya"];

export function VisitorsView() {
  const [filter, setFilter] = useState<"today" | "active" | "all">("today");
  const [search, setSearch] = useState("");

  // Build query
  let url = "/api/visitors";
  if (filter === "today") url += `?date=${new Date().toISOString().slice(0, 10)}`;
  if (filter === "active") url += "?active=1";

  const { data: visitors, loading, refetch } = useFetch<Visitor[]>(url);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [form, setForm] = useState({ name: "", memberId: "", purpose: "Baca Buku" });
  const [saving, setSaving] = useState(false);
  const [checkOutId, setCheckOutId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const filtered = visitors?.filter((v) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return v.name.toLowerCase().includes(s) || v.member?.memberNumber.toLowerCase().includes(s);
  });

  // Stats
  const totalToday = visitors?.length || 0;
  const activeNow = visitors?.filter((v) => !v.checkOut).length || 0;
  const members = visitors?.filter((v) => v.memberId).length || 0;
  const guests = totalToday - members;

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/visitors", {
        name: form.name.trim(),
        memberId: form.memberId.trim() || undefined,
        purpose: form.purpose,
      });
      toast.success("Check-in berhasil. Selamat datang!");
      setCheckInOpen(false);
      setForm({ name: "", memberId: "", purpose: "Baca Buku" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckOut() {
    if (!checkOutId) return;
    setCheckingOut(true);
    try {
      await fetch(`/api/visitors/${checkOutId}/checkout`, { method: "PATCH" });
      toast.success("Check-out berhasil. Terima kasih!");
      setCheckOutId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
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
        title="Buku Tamu"
        description="Catat kunjungan ke perpustakaan — berguna untuk akreditasi & statistik"
        icon={UserCheck}
        actions={
          <Button onClick={() => setCheckInOpen(true)} className="gap-2">
            <LogIn className="h-4 w-4" />
            Check-in
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Hari Ini"
          value={totalToday}
          icon={Users}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label="Sedang di Dalam"
          value={activeNow}
          icon={Activity}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Anggota"
          value={members}
          icon={User}
          color="bg-sky-100 text-sky-700"
        />
        <StatCard
          label="Tamu Umum"
          value={guests}
          icon={UserCheck}
          color="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filter === "today" ? "default" : "outline"}
                onClick={() => setFilter("today")}
              >
                Hari Ini
              </Button>
              <Button
                size="sm"
                variant={filter === "active" ? "default" : "outline"}
                onClick={() => setFilter("active")}
              >
                Sedang di Dalam
              </Button>
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                Semua
              </Button>
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau nomor anggota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitors list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filter === "today" && "Kunjungan Hari Ini"}
            {filter === "active" && "Sedang di Dalam"}
            {filter === "all" && "Semua Kunjungan"}
          </CardTitle>
          <CardDescription>{filtered?.length || 0} entri</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Belum ada kunjungan"
              description="Klik tombol Check-in untuk mencatat pengunjung baru."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => {
                const isActive = !v.checkOut;
                return (
                  <div
                    key={v.id}
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
                        <p className="font-medium text-sm truncate">{v.name}</p>
                        {v.member && (
                          <Badge variant="outline" className="text-[10px]">
                            {v.member.memberNumber}
                          </Badge>
                        )}
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
                          In: {new Date(v.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          {v.checkOut && (
                            <> • Out: {new Date(v.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>
                          )}
                        </span>
                        {v.purpose && (
                          <span className="px-1.5 py-0.5 bg-background rounded">{v.purpose}</span>
                        )}
                        <span className="font-medium text-primary">{calcDuration(v.checkIn, v.checkOut)}</span>
                      </div>
                    </div>
                    {isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCheckOutId(v.id)}
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
              Check-in Pengunjung
            </DialogTitle>
            <DialogDescription>Catat kunjungan baru ke perpustakaan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="visitor-name">Nama *</Label>
              <Input
                id="visitor-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nama pengunjung"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visitor-member">Nomor Anggota (opsional)</Label>
              <Input
                id="visitor-member"
                value={form.memberId}
                onChange={(e) => setForm((p) => ({ ...p, memberId: e.target.value }))}
                placeholder="Mis. SIS-2024-001 (kosongkan untuk tamu umum)"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visitor-purpose">Tujuan</Label>
              <div className="grid grid-cols-3 gap-2">
                {PURPOSES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, purpose: p }))}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                      form.purpose === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
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

      {/* Confirm check-out */}
      <Dialog open={!!checkOutId} onOpenChange={(o) => !o && setCheckOutId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check-out Pengunjung?</DialogTitle>
            <DialogDescription>
              Catat waktu keluar pengunjung. Durasi kunjungan akan dihitung otomatis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOutId(null)} disabled={checkingOut}>
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
