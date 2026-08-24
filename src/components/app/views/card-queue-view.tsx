"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Loader2,
  Printer,
  X,
  Clock,
  CheckCircle2,
  Hash,
  User,
  Search,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/overlay/alert-dialog";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

interface QueueEntry {
  id: string;
  memberId: string;
  cardType: string;
  status: string;
  queueNumber: number;
  printedBy: string | null;
  printedAt: string | null;
  notes: string | null;
  createdAt: string;
  member: { fullName: string; memberNumber: string; category: string; phone: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  QUEUED: { label: "Antri", color: "bg-amber-100 text-amber-700", icon: Clock },
  PRINTING: { label: "Dicetak", color: "bg-blue-100 text-blue-700", icon: Printer },
  COMPLETED: { label: "Selesai", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  CANCELLED: { label: "Dibatalkan", color: "bg-red-100 text-red-700", icon: X },
};

export function CardQueueView() {
  const user = useAppStore((s) => s.user);
  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";

  const { data: queue, loading, refetch } = useFetch<QueueEntry[]>("/api/card-queue");

  const [requestOpen, setRequestOpen] = useState(false);
  const [form, setForm] = useState({ cardType: "MEMBER", notes: "" });
  const [saving, setSaving] = useState(false);

  const [actionTarget, setActionTarget] = useState<QueueEntry | null>(null);
  const [actionType, setActionType] = useState<"print" | "cancel">("print");
  const [acting, setActing] = useState(false);

  const [search, setSearch] = useState("");

  const filtered = queue?.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      q.member.fullName.toLowerCase().includes(s) ||
      q.member.memberNumber.toLowerCase().includes(s) ||
      String(q.queueNumber).includes(s)
    );
  });

  const stats = {
    total: queue?.length || 0,
    queued: queue?.filter((q) => q.status === "QUEUED").length || 0,
    printing: queue?.filter((q) => q.status === "PRINTING").length || 0,
    completed: queue?.filter((q) => q.status === "COMPLETED").length || 0,
  };

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/card-queue", {
        cardType: form.cardType,
        notes: form.notes || undefined,
      });
      toast.success("Berhasil masuk antrian cetak kartu.");
      setRequestOpen(false);
      setForm({ cardType: "MEMBER", notes: "" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction() {
    if (!actionTarget) return;
    setActing(true);
    try {
      const newStatus = actionType === "print" ? "COMPLETED" : "CANCELLED";
      await api.put(`/api/card-queue/${actionTarget.id}`, { status: newStatus });
      toast.success(actionType === "print" ? "Kartu ditandai sudah dicetak." : "Antrian dibatalkan.");
      setActionTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Antrian Cetak Kartu"
        description="Kelola antrian pencetakan kartu anggota perpustakaan"
        icon={CreditCard}
        actions={
          <Button onClick={() => setRequestOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajukan Cetak
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Antrian" value={stats.total} icon={Hash} color="bg-primary/10 text-primary" />
        <StatCard label="Menunggu" value={stats.queued} icon={Clock} color="bg-amber-100 text-amber-700" />
        <StatCard label="Dicetak" value={stats.printing} icon={Printer} color="bg-blue-100 text-blue-700" />
        <StatCard label="Selesai" value={stats.completed} icon={CheckCircle2} color="bg-emerald-100 text-emerald-700" />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, nomor anggota, atau nomor antrian..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Antrian</CardTitle>
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
              icon={CreditCard}
              title="Belum ada antrian"
              description="Klik tombol Ajukan Cetak untuk membuat antrian baru."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((entry) => {
                const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.QUEUED;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      entry.status === "QUEUED" ? "border-amber-200 bg-amber-50/50" : ""
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 font-bold text-lg ${cfg.color}`}>
                      {entry.queueNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">{entry.member.fullName}</p>
                        <Badge variant="outline" className="text-[10px]">{entry.member.memberNumber}</Badge>
                        <Badge className={`text-[10px] gap-1 ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Tipe: {entry.cardType}</span>
                        {entry.printedAt && (
                          <span>Dicetak: {new Date(entry.printedAt).toLocaleString("id-ID")}</span>
                        )}
                        {entry.notes && <span className="truncate max-w-[200px]">Catatan: {entry.notes}</span>}
                      </div>
                    </div>
                    {isLibrarian && entry.status === "QUEUED" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => { setActionTarget(entry); setActionType("print"); }}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Cetak
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => { setActionTarget(entry); setActionType("cancel"); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Request */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Ajukan Cetak Kartu
            </DialogTitle>
            <DialogDescription>Masuk antrian untuk pencetakan kartu anggota.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Jenis Kartu</Label>
              <div className="grid grid-cols-2 gap-2">
                {["MEMBER", "GUEST"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, cardType: t }))}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                      form.cardType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {t === "MEMBER" ? "Kartu Anggota" : "Kartu Tamu"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-notes">Catatan (opsional)</Label>
              <Input
                id="q-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Catatan tambahan..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Ajukan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Action */}
      <AlertDialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "print" ? "Tandai Sudah Dicetak?" : "Batalkan Antrian?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget && (
                <>
                  Antrian <b className="text-foreground">#{actionTarget.queueNumber}</b> untuk{" "}
                  <b className="text-foreground">{actionTarget.member.fullName}</b>{" "}
                  {actionType === "print"
                    ? "akan ditandai sebagai sudah dicetak."
                    : "akan dibatalkan."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={acting} className="gap-2">
              {acting && <Loader2 className="h-4 w-4 animate-spin" />}
              {actionType === "print" ? "Ya, Cetak" : "Ya, Batalkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
