"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Plus,
  Loader2,
  School,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  BookOpen,
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
import { formatDate } from "@/lib/constants";

interface SchoolLibrary {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface InterLibraryLoan {
  id: string;
  fromSchoolId: string;
  toSchoolId: string;
  memberId: string;
  bookTitle: string;
  bookAuthor: string | null;
  status: string;
  requestNote: string | null;
  dueDate: string | null;
  returnedAt: string | null;
  createdAt: string;
  fromSchool: SchoolLibrary;
  toSchool: SchoolLibrary;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  REQUESTED: { label: "Diminta", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  APPROVED: { label: "Disetujui", color: "bg-amber-100 text-amber-700 border-amber-200", icon: CheckCircle2 },
  SHIPPED: { label: "Dikirim", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Truck },
  RECEIVED: { label: "Diterima", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Package },
  RETURNED: { label: "Dikembalikan", color: "bg-gray-100 text-gray-700 border-gray-200", icon: CheckCircle2 },
  CANCELLED: { label: "Dibatalkan", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export function InterLibraryView() {
  const user = useAppStore((s) => s.user);
  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";

  const [requestOpen, setRequestOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [form, setForm] = useState({
    toSchoolId: "",
    bookTitle: "",
    bookAuthor: "",
    requestNote: "",
  });

  const requestsUrl = `/api/inter-library${statusFilter ? `?status=${statusFilter}` : ""}`;
  const { data: requestsResp, loading, error, refetch } = useFetch<{ data: InterLibraryLoan[]; total: number }>(requestsUrl);
  const { data: schools } = useFetch<SchoolLibrary[]>("/api/inter-library/schools");

  const requests = requestsResp?.data ?? [];

  async function handleCreateRequest() {
    if (!form.toSchoolId || !form.bookTitle.trim()) {
      toast.error("Sekolah tujuan dan judul buku wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/inter-library", {
        toSchoolId: form.toSchoolId,
        bookTitle: form.bookTitle.trim(),
        bookAuthor: form.bookAuthor.trim() || undefined,
        requestNote: form.requestNote.trim() || undefined,
      });
      toast.success("Request peminjaman silang berhasil dibuat!");
      setRequestOpen(false);
      setForm({ toSchoolId: "", bookTitle: "", bookAuthor: "", requestNote: "" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat request");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(id: string, newStatus: string) {
    setUpdatingId(id);
    try {
      await api.put(`/api/inter-library/${id}`, { status: newStatus });
      toast.success(`Status berhasil diubah ke ${STATUS_CONFIG[newStatus]?.label}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    } finally {
      setUpdatingId(null);
    }
  }

  function getNextActions(status: string, isOwn: boolean, isLib: boolean) {
    const actions: { label: string; status: string; variant: "default" | "outline" | "destructive" }[] = [];
    if (status === "REQUESTED" && isLib) {
      actions.push({ label: "Setujui", status: "APPROVED", variant: "default" });
      actions.push({ label: "Tolak", status: "CANCELLED", variant: "destructive" });
    }
    if (status === "APPROVED" && isLib) {
      actions.push({ label: "Kirim", status: "SHIPPED", variant: "default" });
    }
    if (status === "SHIPPED" && isOwn) {
      actions.push({ label: "Terima", status: "RECEIVED", variant: "default" });
    }
    if (status === "RECEIVED" && isOwn) {
      actions.push({ label: "Kembalikan", status: "RETURNED", variant: "default" });
    }
    if (["REQUESTED", "APPROVED"].includes(status) && (isOwn || isLib)) {
      actions.push({ label: "Batalkan", status: "CANCELLED", variant: "destructive" });
    }
    return actions;
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-3xl">
      <PageHeader
        title="Peminjaman Silang Antar Sekolah"
        description="Pinjam buku dari perpustakaan sekolah lain"
        icon={ArrowLeftRight}
        actions={
          <Button onClick={() => setRequestOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Buat Request
          </Button>
        }
      />

      {schools && schools.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <School className="h-4 w-4 text-muted-foreground" />
            Sekolah Partner
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {schools.map((school) => (
              <Card key={school.id} className="p-3">
                <p className="font-medium text-sm text-foreground">{school.name}</p>
                {school.address && (
                  <p className="text-xs text-muted-foreground mt-0.5">{school.address}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={statusFilter === "" ? "default" : "outline"}
          onClick={() => setStatusFilter("")}
        >
          Semua
        </Button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Button
            key={key}
            size="sm"
            variant={statusFilter === key ? "default" : "outline"}
            onClick={() => setStatusFilter(key)}
          >
            {cfg.label}
          </Button>
        ))}
      </div>

      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={ArrowLeftRight}
            title="Gagal memuat data"
            description={error}
            action={{ label: "Coba lagi", onClick: refetch }}
          />
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-2">
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-8 w-1/3 rounded bg-muted animate-pulse mt-2" />
              </div>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={ArrowLeftRight}
            title="Belum ada request"
            description="Buat request peminjaman buku dari sekolah partner."
            action={{ label: "Buat Request", onClick: () => setRequestOpen(true) }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.REQUESTED;
            const StatusIcon = cfg.icon;
            const isOwn = user?.member?.id === req.memberId;
            const actions = getNextActions(req.status, isOwn, isLibrarian);

            return (
              <Card key={req.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-foreground">{req.bookTitle}</h3>
                      <Badge className={cfg.color + " gap-1"}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                    {req.bookAuthor && (
                      <p className="text-xs text-muted-foreground mt-0.5">oleh {req.bookAuthor}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>Dari: {req.fromSchool.name}</span>
                      <span>→ Ke: {req.toSchool.name}</span>
                      <span>{formatDate(req.createdAt)}</span>
                    </div>
                    {req.requestNote && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        &ldquo;{req.requestNote}&rdquo;
                      </p>
                    )}
                    {req.dueDate && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Jatuh tempo: {formatDate(req.dueDate)}
                      </p>
                    )}
                    {actions.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap pt-2 border-t">
                        {actions.map((action) => (
                          <Button
                            key={action.status}
                            size="sm"
                            variant={action.variant === "destructive" ? "outline" : action.variant}
                            disabled={updatingId === req.id}
                            onClick={() => handleUpdateStatus(req.id, action.status)}
                            className={`gap-1.5 ${
                              action.variant === "destructive"
                                ? "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                                : ""
                            }`}
                          >
                            {updatingId === req.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Request Peminjaman Silang</DialogTitle>
            <DialogDescription>
              Ajukan permintaan peminjaman buku dari perpustakaan sekolah lain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="il-school">Sekolah Tujuan *</Label>
              <select
                id="il-school"
                value={form.toSchoolId}
                onChange={(e) => setForm((p) => ({ ...p, toSchoolId: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih sekolah...</option>
                {schools?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="il-book">Judul Buku *</Label>
              <Input
                id="il-book"
                value={form.bookTitle}
                onChange={(e) => setForm((p) => ({ ...p, bookTitle: e.target.value }))}
                placeholder="Judul buku yang ingin dipinjam"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="il-author">Pengarang</Label>
              <Input
                id="il-author"
                value={form.bookAuthor}
                onChange={(e) => setForm((p) => ({ ...p, bookAuthor: e.target.value }))}
                placeholder="Nama pengarang (opsional)"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="il-note">Catatan</Label>
              <Textarea
                id="il-note"
                value={form.requestNote}
                onChange={(e) => setForm((p) => ({ ...p, requestNote: e.target.value }))}
                placeholder="Alasan atau catatan tambahan..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleCreateRequest} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
