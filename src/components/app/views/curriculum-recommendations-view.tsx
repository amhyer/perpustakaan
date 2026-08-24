"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  Loader2,
  BookOpen,
  Trash2,
  Filter,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
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
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

interface RecBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  subject: string | null;
}

interface Recommendation {
  id: string;
  subject: string;
  classGrade: string;
  reason: string | null;
  isRequired: boolean;
  createdAt: string;
  book: RecBook;
}

interface FormState {
  subject: string;
  classGrade: string;
  bookId: string;
  reason: string;
  isRequired: boolean;
}

const EMPTY_FORM: FormState = {
  subject: "",
  classGrade: "",
  bookId: "",
  reason: "",
  isRequired: false,
};

const CLASS_GRADES = ["10", "11", "12"];

const SUBJECTS = [
  "Matematika",
  "Fisika",
  "Kimia",
  "Biologi",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Ekonomi",
  "Sejarah",
  "Geografi",
  "Sosiologi",
  "Informatika",
  "Seni Budaya",
  "Pendidikan Jasmani",
  "Lainnya",
];

export function CurriculumRecommendationsView() {
  const user = useAppStore((s) => s.user);
  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";
  const isTeacher = user?.role === "TEACHER";
  const canManage = isLibrarian || isTeacher;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Recommendation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterGrade, setFilterGrade] = useState<string>("ALL");
  const [filterSubject, setFilterSubject] = useState<string>("ALL");

  const recsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterGrade !== "ALL") params.set("classGrade", filterGrade);
    if (filterSubject !== "ALL") params.set("subject", filterSubject);
    const qs = params.toString();
    return `/api/curriculum-recommendations${qs ? `?${qs}` : ""}`;
  }, [filterGrade, filterSubject]);

  const {
    data: recommendations,
    loading,
    error,
    refetch,
  } = useFetch<Recommendation[]>(recsUrl, { deps: [recsUrl] });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject || !form.classGrade || !form.bookId) {
      toast.error("Mata pelajaran, kelas, dan ID buku wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/curriculum-recommendations", {
        subject: form.subject,
        classGrade: form.classGrade,
        bookId: form.bookId,
        reason: form.reason.trim() || undefined,
        isRequired: form.isRequired,
      });
      toast.success("Rekomendasi berhasil ditambahkan");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah rekomendasi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/curriculum-recommendations/${deleteTarget.id}`);
      toast.success("Rekomendasi berhasil dihapus");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  // Group by subject for display
  const grouped = useMemo(() => {
    if (!recommendations) return {};
    const map: Record<string, Recommendation[]> = {};
    for (const r of recommendations) {
      if (!map[r.subject]) map[r.subject] = [];
      map[r.subject].push(r);
    }
    return map;
  }, [recommendations]);

  return (
    <div className="space-y-6 mx-auto w-full max-w-3xl">
      <PageHeader
        title="Rekomendasi Buku per Mapel"
        description="Rekomendasi buku berdasarkan mata pelajaran dan kelas"
        icon={GraduationCap}
        actions={
          canManage ? (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Rekomendasi
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filter</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Kelas</Label>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger size="sm" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                {CLASS_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>Kelas {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mata Pelajaran</Label>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger size="sm" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Mapel</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={GraduationCap}
            title="Gagal memuat rekomendasi"
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
                <div className="h-20 w-full rounded bg-muted animate-pulse mt-2" />
              </div>
            </Card>
          ))}
        </div>
      ) : !recommendations || recommendations.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={GraduationCap}
            title="Belum ada rekomendasi"
            description={
              canManage
                ? "Tambahkan rekomendasi buku untuk membantu siswa menemukan bahan ajar yang tepat."
                : "Belum ada rekomendasi buku untuk kelas Anda."
            }
            action={
              canManage
                ? { label: "Tambah Rekomendasi", onClick: () => setDialogOpen(true) }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-6 max-h-[750px] overflow-y-auto scrollbar-thin pr-1">
          {Object.entries(grouped).map(([subject, recs]) => (
            <div key={subject}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {subject}
              </h3>
              <div className="space-y-3">
                {recs.map((r) => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-foreground leading-tight">
                              {r.book.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {r.book.author}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-sky-100 text-sky-700 border-sky-200">
                              Kelas {r.classGrade}
                            </Badge>
                            {r.isRequired && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Wajib
                              </Badge>
                            )}
                          </div>
                        </div>

                        {r.reason && (
                          <p className="mt-2 text-sm text-foreground/80">{r.reason}</p>
                        )}

                        {canManage && (
                          <div className="mt-3 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Hapus
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Add Recommendation */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setForm(EMPTY_FORM);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Tambah Rekomendasi Buku</DialogTitle>
            <DialogDescription>
              Rekomendasikan buku untuk mata pelajaran dan kelas tertentu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mata Pelajaran *</Label>
                <Select value={form.subject} onValueChange={(v) => setForm((p) => ({ ...p, subject: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kelas *</Label>
                <Select value={form.classGrade} onValueChange={(v) => setForm((p) => ({ ...p, classGrade: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_GRADES.map((g) => (
                      <SelectItem key={g} value={g}>Kelas {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-book">ID Buku *</Label>
              <Input
                id="cr-book"
                required
                value={form.bookId}
                onChange={(e) => setForm((p) => ({ ...p, bookId: e.target.value }))}
                placeholder="ID Buku dari katalog"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-reason">Alasan Rekomendasi</Label>
              <Input
                id="cr-reason"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Mis. Buku referensi utama untuk kurikulum"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cr-required"
                checked={form.isRequired}
                onChange={(e) => setForm((p) => ({ ...p, isRequired: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="cr-required" className="cursor-pointer">
                Buku wajib (bukan hanya direkomendasikan)
              </Label>
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
                {saving ? "Menyimpan..." : "Tambah Rekomendasi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Rekomendasi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Rekomendasi <b className="text-foreground">&ldquo;{deleteTarget.book.title}&rdquo;</b>{" "}
                  untuk {deleteTarget.subject} Kelas {deleteTarget.classGrade} akan dihapus.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
