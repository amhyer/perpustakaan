"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  BookMarked,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { Badge } from "@/components/ui/data-display/badge";
import { Card } from "@/components/ui/layout/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
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

interface AssignmentBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
}

interface ProgressEntry {
  id: string;
  status: string;
  currentPage: number;
  totalPages: number;
  completedAt: string | null;
  member: { id: string; fullName: string; memberNumber: string };
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  classGrade: string;
  subject: string | null;
  dueDate: string;
  isActive: boolean;
  createdAt: string;
  book: AssignmentBook;
  progress: ProgressEntry[];
}

interface FormState {
  title: string;
  description: string;
  bookId: string;
  classGrade: string;
  subject: string;
  dueDate: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  bookId: "",
  classGrade: "",
  subject: "",
  dueDate: "",
};

const CLASS_GRADES = [
  "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  NOT_STARTED: { label: "Belum Mulai", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
  READING: { label: "Sedang Dibaca", color: "bg-blue-100 text-blue-700 border-blue-200", icon: BookOpen },
  COMPLETED: { label: "Selesai", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

export function ReadingAssignmentsView() {
  const user = useAppStore((s) => s.user);
  const isTeacher = user?.role === "TEACHER";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);

  const assignmentsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (user?.member?.classGrade && !isTeacher) {
      params.set("classGrade", user.member.classGrade);
    }
    const qs = params.toString();
    return `/api/reading-assignments${qs ? `?${qs}` : ""}`;
  }, [user, isTeacher]);

  const {
    data: assignments,
    loading,
    error,
    refetch,
  } = useFetch<Assignment[]>(assignmentsUrl, { deps: [assignmentsUrl] });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.bookId || !form.classGrade || !form.dueDate) {
      toast.error("Lengkapi semua field wajib");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/reading-assignments", {
        ...form,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        subject: form.subject.trim() || undefined,
      });
      toast.success("Tugas baca berhasil dibuat");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat tugas");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProgress(assignmentId: string, memberId: string, status: string) {
    setUpdatingProgress(`${assignmentId}-${memberId}`);
    try {
      await api.put(`/api/reading-assignments/${assignmentId}/progress`, { memberId, status });
      toast.success("Progress diperbarui");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui progress");
    } finally {
      setUpdatingProgress(null);
    }
  }

  const now = new Date();

  function getStatusBadge(assignment: Assignment) {
    if (!assignment.progress || assignment.progress.length === 0) return null;
    const completed = assignment.progress.filter((p) => p.status === "COMPLETED").length;
    const total = assignment.progress.length;
    return { completed, total };
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-3xl">
      <PageHeader
        title="Program Baca di Kelas"
        description="Tugas bacaan untuk siswa berdasarkan kelas"
        icon={BookOpen}
        actions={
          isTeacher ? (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Tugas Baca
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={BookOpen}
            title="Gagal memuat data"
            description={error}
            action={{ label: "Coba lagi", onClick: refetch }}
          />
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="space-y-2.5">
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-20 w-full rounded bg-muted animate-pulse mt-2" />
              </div>
            </Card>
          ))}
        </div>
      ) : !assignments || assignments.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={BookOpen}
            title="Belum ada tugas baca"
            description={
              isTeacher
                ? "Buat tugas bacaan pertama untuk siswa di kelas Anda."
                : "Belum ada tugas baca untuk kelas Anda saat ini."
            }
            action={
              isTeacher
                ? { label: "Buat Tugas Baca", onClick: () => setDialogOpen(true) }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4 max-h-[750px] overflow-y-auto scrollbar-thin pr-1">
          {assignments.map((a) => {
            const stats = getStatusBadge(a);
            const isExpanded = expandedId === a.id;
            const isOverdue = new Date(a.dueDate) < now && a.isActive;

            return (
              <Card key={a.id} className={`p-5 border-l-4 ${isOverdue ? "border-l-red-500" : "border-l-primary/40"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookMarked className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-bold text-lg leading-tight text-foreground">
                          {a.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {a.book.title} &middot; {a.book.author}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {stats && (
                          <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {stats.completed}/{stats.total}
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            Terlambat
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Kelas {a.classGrade}
                      </span>
                      {a.subject && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {a.subject}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Tenggat: {formatDate(a.dueDate)}
                      </span>
                    </div>

                    {a.description && (
                      <p className="mt-2 text-sm text-foreground/80">{a.description}</p>
                    )}

                    {/* Student progress section */}
                    {isTeacher && a.progress.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : a.id)}
                          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          Progress Siswa ({a.progress.length})
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {isExpanded && (
                          <div className="mt-3 space-y-2">
                            {a.progress.map((p) => {
                              const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.NOT_STARTED;
                              const Icon = cfg.icon;
                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/50"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{p.member.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{p.member.memberNumber}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge className={`${cfg.color} gap-1`}>
                                      <Icon className="h-3 w-3" />
                                      {cfg.label}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      disabled={updatingProgress === `${a.id}-${p.member.id}`}
                                      onClick={() => {
                                        const nextStatus =
                                          p.status === "NOT_STARTED"
                                            ? "READING"
                                            : p.status === "READING"
                                            ? "COMPLETED"
                                            : "NOT_STARTED";
                                        handleUpdateProgress(a.id, p.member.id, nextStatus);
                                      }}
                                    >
                                      {updatingProgress === `${a.id}-${p.member.id}` ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        "Ubah Status"
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Student: my progress */}
                    {!isTeacher && a.progress.length > 0 && a.progress[0] && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const p = a.progress[0];
                            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.NOT_STARTED;
                            const Icon = cfg.icon;
                            return (
                              <>
                                <Badge className={`${cfg.color} gap-1`}>
                                  <Icon className="h-3 w-3" />
                                  {cfg.label}
                                </Badge>
                                {p.status !== "COMPLETED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={updatingProgress === `${a.id}-${p.id}`}
                                    onClick={() => {
                                      const nextStatus = p.status === "NOT_STARTED" ? "READING" : "COMPLETED";
                                      handleUpdateProgress(a.id, p.id, nextStatus);
                                    }}
                                  >
                                    {updatingProgress === `${a.id}-${p.id}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : p.status === "NOT_STARTED" ? (
                                      "Mulai Membaca"
                                    ) : (
                                      "Tandai Selesai"
                                    )}
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Create Assignment */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setForm(EMPTY_FORM);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Buat Tugas Baca Baru</DialogTitle>
            <DialogDescription>
              Buat tugas bacaan untuk siswa di kelas tertentu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ra-title">Judul Tugas *</Label>
              <Input
                id="ra-title"
                required
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Mis. Baca Bab 1-3 Laskar Pelangi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ra-desc">Deskripsi</Label>
              <Textarea
                id="ra-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Instruksi tambahan untuk siswa..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ra-book">Buku *</Label>
              <Input
                id="ra-book"
                required
                value={form.bookId}
                onChange={(e) => setForm((p) => ({ ...p, bookId: e.target.value }))}
                placeholder="ID Buku dari katalog"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kelas *</Label>
                <Select value={form.classGrade} onValueChange={(v) => setForm((p) => ({ ...p, classGrade: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_GRADES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tenggat Waktu *</Label>
                <Input
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ra-subject">Mata Pelajaran</Label>
              <Input
                id="ra-subject"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Mis. Bahasa Indonesia"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); setForm(EMPTY_FORM); }}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Menyimpan..." : "Buat Tugas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
