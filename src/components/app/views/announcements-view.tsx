"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Loader2,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  User,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { Badge } from "@/components/ui/data-display/badge";
import { Card } from "@/components/ui/layout/card";
import { Switch } from "@/components/ui/form/switch";
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
import { formatDate } from "@/lib/constants";

interface AnnouncementAuthor {
  name: string;
}
interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  author: AnnouncementAuthor | null;
}

interface FormState {
  title: string;
  content: string;
  isPinned: boolean;
}

const EMPTY_FORM: FormState = { title: "", content: "", isPinned: false };

function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return "Baru saja";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} minggu lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}

export function AnnouncementsView() {
  const user = useAppStore((s) => s.user);
  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";
  const isFullLibrarian = user?.role === "LIBRARIAN";

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const announcementsUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const qs = params.toString();
    return `/api/announcements${qs ? `?${qs}` : ""}`;
  }, [page]);

  const { data: announcementsResp, loading, error, refetch } = useFetch<{ data: Announcement[]; total: number; page: number; pageSize: number; totalPages: number }>(
    announcementsUrl,
    { deps: [announcementsUrl] }
  );
  const data = announcementsResp?.data ?? [];
  const totalPages = announcementsResp?.totalPages ?? 1;

  // Create/Edit dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle pin
  const [toggling, setToggling] = useState<string | null>(null);

  function openCreateDialog() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  }

  function openEditDialog(a: Announcement) {
    setEditTarget(a);
    setForm({ title: a.title, content: a.content, isPinned: a.isPinned });
    setEditorOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Judul dan isi pengumuman wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await api.put("/api/announcements", {
          id: editTarget.id,
          title: form.title.trim(),
          content: form.content.trim(),
          isPinned: form.isPinned,
        });
        toast.success("Pengumuman diperbarui.");
      } else {
        await api.post("/api/announcements", {
          title: form.title.trim(),
          content: form.content.trim(),
          isPinned: form.isPinned,
        });
        toast.success("Pengumuman dibuat & notifikasi dikirim ke anggota.");
      }
      setEditorOpen(false);
      setForm(EMPTY_FORM);
      setEditTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengumuman");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePin(a: Announcement) {
    setToggling(a.id);
    try {
      await api.put("/api/announcements", {
        id: a.id,
        title: a.title,
        content: a.content,
        isPinned: !a.isPinned,
      });
      toast.success(a.isPinned ? "Pengumuman dilepas dari sematan." : "Pengumuman disematkan.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah sematan");
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/announcements?id=${encodeURIComponent(deleteTarget.id)}`);
      toast.success("Pengumuman dihapus.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pengumuman");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-3xl">
      <PageHeader
        title="Pengumuman"
        description="Berita & info terbaru perpustakaan"
        icon={Megaphone}
        actions={
          isLibrarian ? (
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Pengumuman
            </Button>
          ) : undefined
        }
      />

      {/* Feed */}
      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={Megaphone}
            title="Gagal memuat pengumuman"
            description={error}
            action={{ label: "Coba lagi", onClick: refetch }}
          />
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-20 w-full rounded bg-muted animate-pulse mt-2" />
              </div>
            </Card>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Megaphone}
            title="Belum ada pengumuman"
            description={
              isLibrarian
                ? "Buat pengumuman pertama untuk memberitahukan info terbaru kepada anggota."
                : "Belum ada pengumuman dari perpustakaan saat ini."
            }
            action={
              isLibrarian
                ? { label: "Buat Pengumuman", onClick: openCreateDialog }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4 max-h-[750px] overflow-y-auto scrollbar-thin pr-1">
          {data.map((a) => (
            <Card
              key={a.id}
              className={`p-5 border-l-4 ${
                a.isPinned
                  ? "border-l-primary border-primary/40 bg-primary/5"
                  : "border-l-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    a.isPinned
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <h3 className="font-bold text-lg leading-tight text-foreground">
                      {a.title}
                    </h3>
                    {a.isPinned && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                        <Pin className="h-3 w-3" />
                        Disematkan
                      </Badge>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {a.content}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {a.author && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {a.author.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(a.publishedAt)}
                    </span>
                    <span className="text-muted-foreground/70">
                      · {relativeTime(a.publishedAt)}
                    </span>
                  </div>

                  {isLibrarian && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => openEditDialog(a)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        disabled={toggling === a.id}
                        onClick={() => handleTogglePin(a)}
                      >
                        {toggling === a.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : a.isPinned ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
                        {a.isPinned ? "Lepas Sematan" : "Sematkan"}
                      </Button>
                      {isFullLibrarian && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                          onClick={() => setDeleteTarget(a)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* Pagination (Tahap 16 #26) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 p-4 border-t">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Hal. {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Berikutnya →
          </Button>
        </div>
      )}

      {/* Dialog: Create / Edit */}
      <Dialog
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) {
            setEditTarget(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? "Perbarui judul, isi, atau status sematan pengumuman."
                : "Pengumuman akan dikirim sebagai notifikasi ke semua anggota."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ann-title">Judul *</Label>
              <Input
                id="ann-title"
                required
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Mis. Libur Idul Fitri"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-content">Isi Pengumuman *</Label>
              <Textarea
                id="ann-content"
                required
                value={form.content}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Tulis isi pengumuman di sini..."
                rows={6}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ann-pinned" className="cursor-pointer">
                  Sematkan Pengumuman
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pengumuman disematkan akan tampil paling atas.
                </p>
              </div>
              <Switch
                id="ann-pinned"
                checked={form.isPinned}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, isPinned: v }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditorOpen(false);
                  setEditTarget(null);
                  setForm(EMPTY_FORM);
                }}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving
                  ? "Menyimpan..."
                  : editTarget
                  ? "Simpan Perubahan"
                  : "Publikasikan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Hapus */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengumuman?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Pengumuman{" "}
                  <b className="text-foreground">&ldquo;{deleteTarget.title}&rdquo;</b>{" "}
                  akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
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
