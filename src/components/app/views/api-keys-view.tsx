"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Shield,
  Loader2,
  Power,
  PowerOff,
  Code,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
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
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { formatDate } from "@/lib/constants";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const AVAILABLE_SCOPES = [
  { value: "*", label: "Semua Akses", desc: "Read & write semua resource" },
  { value: "read:books", label: "Read Books", desc: "Baca katalog & detail buku" },
  { value: "read:members", label: "Read Members", desc: "Baca data anggota" },
  { value: "read:loans", label: "Read Loans", desc: "Baca data sirkulasi" },
  { value: "write:loans", label: "Write Loans", desc: "Buat/update sirkulasi" },
  { value: "read:stats", label: "Read Statistics", desc: "Baca statistik & dashboard" },
];

export function ApiKeysView() {
  const user = useAppStore((s) => s.user);
  const { data: keys, loading, refetch } = useFetch<ApiKey[]>("/api/api-keys");

  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formExpiry, setFormExpiry] = useState("365");
  const [saving, setSaving] = useState(false);

  const [newKey, setNewKey] = useState<{ name: string; key: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Guard: hanya pustakawan penuh
  if (user?.role !== "LIBRARIAN") {
    return (
      <div className="space-y-6">
        <PageHeader title="API Keys" description="Manajemen API key untuk integrasi" icon={Key} />
        <Card className="p-6">
          <EmptyState
            icon={Shield}
            title="Akses Ditolak"
            description="Hanya pustakawan penuh yang dapat mengelola API key."
          />
        </Card>
      </div>
    );
  }

  function toggleScope(scope: string) {
    setFormScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (formScopes.length === 0) {
      toast.error("Pilih minimal 1 scope");
      return;
    }
    setSaving(true);
    try {
      const expiresInDays = parseInt(formExpiry);
      const result = await api.post<{ id: string; name: string; key: string; prefix: string }>(
        "/api/api-keys",
        {
          name: formName.trim(),
          scopes: formScopes,
          expiresInDays: isNaN(expiresInDays) ? undefined : expiresInDays,
        }
      );
      setNewKey({ name: result.name, key: result.key, prefix: result.prefix });
      setCreateOpen(false);
      setFormName("");
      setFormScopes([]);
      setFormExpiry("365");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat API key");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/api-keys/${deleteId}`);
      toast.success("API key dinonaktifkan");
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggle(key: ApiKey) {
    try {
      await fetch(`/api/api-keys/${key.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !key.isActive }),
      });
      toast.success(key.isActive ? "API key dinonaktifkan" : "API key diaktifkan");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Disalin ke clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Manajemen API key untuk integrasi dengan sistem eksternal (website sekolah, mobile app, dll)"
        icon={Key}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Buat API Key
          </Button>
        }
      />

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Code className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Cara Pakai API Key</p>
              <p className="mb-2">Sertakan header <code className="bg-white px-1.5 py-0.5 rounded text-xs">Authorization: Bearer ji_live_xxxxx</code> di setiap request.</p>
              <p>Base URL: <code className="bg-white px-1.5 py-0.5 rounded text-xs">{typeof window !== "undefined" ? window.location.origin : "https://perpustakaan.sekolah.sch.id"}/api</code></p>
              <p className="mt-2 text-xs text-blue-700">⚠ API key hanya ditampilkan SEKALI saat dibuat. Simpan di tempat aman (password manager).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keys list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar API Key</CardTitle>
          <CardDescription>
            {keys?.length || 0} key terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !keys || keys.length === 0 ? (
            <EmptyState
              icon={Key}
              title="Belum ada API key"
              description="Buat API key untuk mulai mengintegrasikan dengan sistem eksternal."
            />
          ) : (
            <div className="space-y-2">
              {keys.map((k) => {
                const scopes = JSON.parse(k.scopes) as string[];
                return (
                  <div
                    key={k.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Key className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-foreground">{k.name}</p>
                        {k.isActive ? (
                          <Badge variant="default" className="text-[10px]">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>
                        )}
                      </div>
                      <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">
                        {k.prefix}...
                      </code>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scopes.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Dibuat {formatDate(k.createdAt)}
                        {k.lastUsedAt && ` • Terakhir dipakai ${formatDate(k.lastUsedAt)}`}
                        {k.expiresAt && ` • Expires ${formatDate(k.expiresAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggle(k)}
                        className="h-8 w-8 p-0"
                        title={k.isActive ? "Nonaktifkan" : "Aktifkan"}
                      >
                        {k.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(k.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Create API Key */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat API Key Baru</DialogTitle>
            <DialogDescription>
              API key akan ditampilkan SEKALI. Simpan di tempat aman.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Nama / Tujuan *</Label>
              <Input
                id="key-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Mis. Website Sekolah, Sistem Akademik"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Scope * (pilih satu atau lebih)</Label>
              <div className="space-y-2 border rounded-lg p-3 max-h-64 overflow-y-auto scrollbar-thin">
                {AVAILABLE_SCOPES.map((s) => (
                  <label
                    key={s.value}
                    className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={formScopes.includes(s.value)}
                      onChange={() => toggleScope(s.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="key-expiry">Masa Aktif (hari)</Label>
              <Input
                id="key-expiry"
                type="number"
                min="1"
                max="3650"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Kosongkan untuk tidak ada kadaluwarsa.</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Buat API Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Show new key (only once) */}
      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Check className="h-5 w-5" />
              API Key Berhasil Dibuat!
            </DialogTitle>
            <DialogDescription>
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1 text-amber-600" />
              <span className="text-amber-900 font-medium">
                Key hanya ditampilkan SEKALI. Salin sekarang dan simpan di tempat aman.
              </span>
            </DialogDescription>
          </DialogHeader>

          {newKey && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={newKey.name} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">
                    {newKey.key}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newKey.key)}
                    className="gap-1.5 shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Salin
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Saya Sudah Menyimpan Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              API key akan dinonaktifkan dan tidak bisa dipakai. Sistem eksternal yang
              menggunakan key ini akan mulai gagal. Anda bisa mengaktifkan kembali nanti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
