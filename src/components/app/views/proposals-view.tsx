"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  BookOpen,
  User,
  CalendarDays,
  CheckCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_COLORS,
  ROLE_LABELS,
  ROLE_COLORS,
  formatDate,
} from "@/lib/constants";

interface ProposalMember {
  id: string;
  fullName: string;
  memberNumber: string;
  category: string;
  classGrade: string | null;
}
interface ProposalReviewer {
  name: string;
}
interface Proposal {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  reason: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  member: ProposalMember;
  reviewer: ProposalReviewer | null;
}

type FilterKey = "all" | "PENDING" | "APPROVED" | "REJECTED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "PENDING", label: "Menunggu" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "REJECTED", label: "Ditolak" },
];

interface SubmitFormState {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  reason: string;
}

const EMPTY_FORM: SubmitFormState = {
  title: "",
  author: "",
  publisher: "",
  isbn: "",
  reason: "",
};

export function ProposalsView() {
  const user = useAppStore((s) => s.user);
  const isLibrarian = user?.role === "LIBRARIAN";

  const [filter, setFilter] = useState<FilterKey>("all");

  // Dialog: ajukan buku (member)
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState<SubmitFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Dialog: tolak usulan (librarian)
  const [rejectTarget, setRejectTarget] = useState<Proposal | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const proposalsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (!isLibrarian) params.set("mine", "1");
    if (filter !== "all") params.set("status", filter);
    const qs = params.toString();
    return `/api/proposals${qs ? `?${qs}` : ""}`;
  }, [isLibrarian, filter]);

  const { data, loading, error, refetch } = useFetch<Proposal[]>(proposalsUrl, {
    deps: [proposalsUrl],
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      pending: list.filter((p) => p.status === "PENDING").length,
      approved: list.filter((p) => p.status === "APPROVED").length,
    };
  }, [data]);

  function openSubmitDialog() {
    setSubmitForm(EMPTY_FORM);
    setSubmitOpen(true);
  }

  async function handleSubmitProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!submitForm.title.trim()) {
      toast.error("Judul buku wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/proposals", {
        title: submitForm.title.trim(),
        author: submitForm.author.trim() || null,
        publisher: submitForm.publisher.trim() || null,
        isbn: submitForm.isbn.trim() || null,
        reason: submitForm.reason.trim() || null,
      });
      toast.success("Usulan buku berhasil dikirim. Pustakawan akan meninjaunya.");
      setSubmitOpen(false);
      setSubmitForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim usulan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(p: Proposal) {
    setActing(p.id);
    try {
      await api.put("/api/proposals", { id: p.id, status: "APPROVED" });
      toast.success(`Usulan "${p.title}" disetujui.`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyetujui usulan");
    } finally {
      setActing(null);
    }
  }

  function openRejectDialog(p: Proposal) {
    setRejectTarget(p);
    setRejectNote("");
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    try {
      await api.put("/api/proposals", {
        id: rejectTarget.id,
        status: "REJECTED",
        reviewNote: rejectNote.trim() || null,
      });
      toast.success(`Usulan "${rejectTarget.title}" ditolak.`);
      setRejectTarget(null);
      setRejectNote("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menolak usulan");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usulan Buku"
        description="Ajukan & kelola usulan pengadaan koleksi"
        icon={Lightbulb}
        actions={
          !isLibrarian ? (
            <Button onClick={openSubmitDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajukan Buku
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Usulan"
          value={loading ? "..." : stats.total}
          icon={Lightbulb}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label="Menunggu Persetujuan"
          value={loading ? "..." : stats.pending}
          icon={Clock}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label="Disetujui"
          value={loading ? "..." : stats.approved}
          icon={CheckCircle2}
          color="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList className="flex-wrap h-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key} className="text-xs">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* List */}
      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={Lightbulb}
            title="Gagal memuat data"
            description={error}
            action={{ label: "Coba lagi", onClick: refetch }}
          />
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-2">
                <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-12 w-full rounded bg-muted animate-pulse mt-2" />
                <div className="h-8 w-40 rounded bg-muted animate-pulse mt-2" />
              </div>
            </Card>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Lightbulb}
            title="Belum ada usulan buku"
            description={
              isLibrarian
                ? "Belum ada usulan pengadaan koleksi yang masuk untuk filter ini."
                : "Anda belum pernah mengajukan usulan buku. Ajukan buku yang ingin Anda tambahkan ke koleksi."
            }
            action={
              !isLibrarian
                ? { label: "Ajukan Buku", onClick: openSubmitDialog }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto scrollbar-thin pr-1">
          {data.map((p) => {
            const isPending = p.status === "PENDING";
            const isReviewed = p.status === "APPROVED" || p.status === "REJECTED";
            return (
              <Card key={p.id} className="p-4 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base leading-tight text-foreground flex items-center gap-2">
                      <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{p.title}</span>
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {p.author && <span>✎ {p.author}</span>}
                      {p.publisher && <span>⌂ {p.publisher}</span>}
                      {p.isbn && <span className="font-mono">#{p.isbn}</span>}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={PROPOSAL_STATUS_COLORS[p.status] ?? ""}
                  >
                    {PROPOSAL_STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </div>

                {/* Reason */}
                {p.reason && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/40 rounded-md p-2.5">
                    &ldquo;{p.reason}&rdquo;
                  </p>
                )}

                {/* Proposer */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {p.member.fullName}
                  </span>
                  <span className="font-mono">· {p.member.memberNumber}</span>
                  <Badge
                    variant="outline"
                    className={`${ROLE_COLORS[p.member.category] ?? ""} text-[10px] py-0`}
                  >
                    {ROLE_LABELS[p.member.category] ?? p.member.category}
                  </Badge>
                </div>

                {/* Created date */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  Diajukan pada {formatDate(p.createdAt)}
                </div>

                {/* Review info */}
                {isReviewed && (
                  <div
                    className={`rounded-md p-2.5 text-xs space-y-1 ${
                      p.status === "APPROVED"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {p.status === "APPROVED" ? (
                        <CheckCheck className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Ditinjau oleh {p.reviewer?.name ?? "Pustakawan"}
                      {p.reviewedAt && (
                        <span className="font-normal opacity-80">
                          · {formatDate(p.reviewedAt)}
                        </span>
                      )}
                    </div>
                    {p.reviewNote && (
                      <p className="italic opacity-90">Catatan: {p.reviewNote}</p>
                    )}
                  </div>
                )}

                {/* Librarian actions */}
                {isLibrarian && isPending && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      disabled={acting === p.id}
                      onClick={() => handleApprove(p)}
                    >
                      {acting === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30 gap-1.5"
                      disabled={acting === p.id}
                      onClick={() => openRejectDialog(p)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Tolak
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Ajukan Buku (member) */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Ajukan Usulan Buku</DialogTitle>
            <DialogDescription>
              Isi detail buku yang ingin Anda usulkan untuk pengadaan. Field bertanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitProposal} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="prop-title">Judul Buku *</Label>
              <Input
                id="prop-title"
                required
                value={submitForm.title}
                onChange={(e) =>
                  setSubmitForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Mis. Laskar Pelangi"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prop-author">Pengarang</Label>
                <Input
                  id="prop-author"
                  value={submitForm.author}
                  onChange={(e) =>
                    setSubmitForm((prev) => ({ ...prev, author: e.target.value }))
                  }
                  placeholder="Mis. Andrea Hirata"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-publisher">Penerbit</Label>
                <Input
                  id="prop-publisher"
                  value={submitForm.publisher}
                  onChange={(e) =>
                    setSubmitForm((prev) => ({ ...prev, publisher: e.target.value }))
                  }
                  placeholder="Mis. Bentang Pustaka"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-isbn">ISBN</Label>
              <Input
                id="prop-isbn"
                value={submitForm.isbn}
                onChange={(e) =>
                  setSubmitForm((prev) => ({ ...prev, isbn: e.target.value }))
                }
                placeholder="978-602-..."
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-reason">Alasan / Catatan</Label>
              <Textarea
                id="prop-reason"
                value={submitForm.reason}
                onChange={(e) =>
                  setSubmitForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Mengapa buku ini perlu diadakan? Untuk siapa? Mendukung pelajaran apa?"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Mengirim..." : "Kirim Usulan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tolak Usulan (librarian) */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Usulan Buku</DialogTitle>
            <DialogDescription>
              {rejectTarget && (
                <>
                  Beri catatan untuk penolakan usulan{" "}
                  <b className="text-foreground">&ldquo;{rejectTarget.title}&rdquo;</b>.
                  Catatan akan dikirim sebagai notifikasi ke pengusul.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reject-note">Catatan Penolakan</Label>
              <Textarea
                id="reject-note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Mis. Buku sudah tersedia di koleksi / tidak sesuai kurikulum..."
                rows={4}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectNote("");
                }}
                disabled={!!rejectTarget && acting === rejectTarget.id}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!!rejectTarget && acting === rejectTarget.id}
                className="gap-2"
              >
                {!!rejectTarget && acting === rejectTarget.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Tolak Usulan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
