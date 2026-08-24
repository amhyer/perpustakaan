"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
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

interface OverdueLoan {
  id: string;
  memberId: string;
  dueDate: string;
  status: string;
  daysOverdue: number;
  member: { id: string; fullName: string; memberNumber: string; phone: string | null; classGrade: string | null };
  bookItem: { book: { title: string; author: string } };
  lastNotification: { sentAt: string; status: string } | null;
}

interface NotificationLog {
  id: string;
  loanId: string;
  memberId: string;
  phone: string;
  message: string;
  status: string;
  sentAt: string;
}

export function WhatsappOverdueView() {
  const [tab, setTab] = useState<"overdue" | "history">("overdue");

  const { data: overdueLoans, loading: loadingOverdue, refetch: refetchOverdue } = useFetch<OverdueLoan[]>(
    "/api/notifications/whatsapp-overdue"
  );
  const { data: history, loading: loadingHistory } = useFetch<NotificationLog[]>(
    "/api/notifications/whatsapp-overdue?mode=history",
    { skip: tab !== "history" }
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = overdueLoans?.filter((l) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      l.member.fullName.toLowerCase().includes(s) ||
      l.member.memberNumber.toLowerCase().includes(s) ||
      l.bookItem.book.title.toLowerCase().includes(s)
    );
  });

  const totalOverdue = overdueLoans?.length || 0;
  const totalUnnotified = overdueLoans?.filter((l) => !l.lastNotification).length || 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (!filtered) return;
    const unnotified = filtered.filter((l) => !l.lastNotification).map((l) => l.id);
    setSelected(new Set(unnotified));
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const result = await api.post<{ sent: number; failed: number; skipped: number }>(
        "/api/notifications/whatsapp-overdue",
        { loanIds: Array.from(selected) }
      );
      toast.success(`Berhasil mengirim ${result.sent} notifikasi WhatsApp.`);
      setSelected(new Set());
      refetchOverdue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim notifikasi");
    } finally {
      setSending(false);
      setConfirmSend(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifikasi WhatsApp Terlambat"
        description="Kirim pengingat WhatsApp ke anggota yang terlambat mengembalikan buku"
        icon={MessageSquare}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Terlambat" value={totalOverdue} icon={AlertTriangle} color="bg-red-100 text-red-700" />
        <StatCard label="Belum Dikirim" value={totalUnnotified} icon={Send} color="bg-amber-100 text-amber-700" />
        <StatCard label="Sudah Dikirim" value={totalOverdue - totalUnnotified} icon={CheckCircle2} color="bg-emerald-100 text-emerald-700" />
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant={tab === "overdue" ? "default" : "outline"} onClick={() => setTab("overdue")}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Terlambat
              </Button>
              <Button size="sm" variant={tab === "history" ? "default" : "outline"} onClick={() => setTab("history")}>
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Riwayat
              </Button>
            </div>
            <div className="flex-1 relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, nomor anggota, atau judul buku..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue List */}
      {tab === "overdue" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Peminjaman Terlambat</CardTitle>
                <CardDescription>{filtered?.length || 0} peminjaman</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll} className="gap-1.5">
                  Pilih Belum Dikirim
                </Button>
                <Button
                  size="sm"
                  disabled={selected.size === 0 || sending}
                  onClick={() => setConfirmSend(true)}
                  className="gap-1.5"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Kirim ({selected.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingOverdue ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : !filtered || filtered.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Tidak ada peminjaman terlambat"
                description="Semua buku dikembalikan tepat waktu. Bagus!"
              />
            ) : (
              <div className="space-y-2">
                {filtered.map((loan) => {
                  const hasNotified = !!loan.lastNotification;
                  return (
                    <div
                      key={loan.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selected.has(loan.id) ? "border-primary bg-primary/5" : hasNotified ? "opacity-60" : ""
                      }`}
                    >
                      {!hasNotified && (
                        <input
                          type="checkbox"
                          checked={selected.has(loan.id)}
                          onChange={() => toggleSelect(loan.id)}
                          className="h-4 w-4 rounded border-gray-300 shrink-0"
                        />
                      )}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700 shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm truncate">{loan.member.fullName}</p>
                          <Badge variant="outline" className="text-[10px]">{loan.member.memberNumber}</Badge>
                          <Badge variant="destructive" className="text-[10px]">{loan.daysOverdue} hari terlambat</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          &ldquo;{loan.bookItem.book.title}&rdquo; — jatuh tempo:{" "}
                          {new Date(loan.dueDate).toLocaleDateString("id-ID")}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {loan.member.phone && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Phone className="h-3 w-3" /> {loan.member.phone}
                            </span>
                          )}
                          {hasNotified && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Dikirim {new Date(loan.lastNotification!.sentAt).toLocaleDateString("id-ID")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {tab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat Pengiriman</CardTitle>
            <CardDescription>100 pengiriman terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <EmptyState icon={Clock} title="Belum ada riwayat" description="Belum ada notifikasi WhatsApp terkirim." />
            ) : (
              <div className="space-y-2">
                {history.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                      log.status === "SENT" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {log.status === "SENT" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Phone className="h-3 w-3" /> {log.phone}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.sentAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Send Dialog */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim Notifikasi WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Akan mengirim pengingat ke <b>{selected.size}</b> anggota terlambat. Pastikan nomor WhatsApp benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending} className="gap-2">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Kirim Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
