"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Wrench,
  AlertTriangle,
  Monitor,
  Projector,
  Mic2,
  Laptop,
  Loader2,
  Box,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { Badge } from "@/components/ui/data-display/badge";
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
import { StatCard } from "@/components/app/shared/stat-card";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

interface Asset {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  condition: string;
  status: string;
  locationId: string | null;
  location: { name: string; code: string } | null;
  notes: string | null;
}

const CATEGORY_ICONS: Record<string, any> = {
  AV: Projector,
  IT: Laptop,
  FURNITURE: Box,
  OTHER: Package,
};

const CATEGORY_LABELS: Record<string, string> = {
  AV: "Audio Visual",
  IT: "IT / Komputer",
  FURNITURE: "Furnitur",
  OTHER: "Lainnya",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Tersedia",
  BORROWED: "Dipinjam",
  MAINTENANCE: "Maintenance",
  LOST: "Hilang",
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  BORROWED: "bg-amber-100 text-amber-700 border-amber-200",
  MAINTENANCE: "bg-blue-100 text-blue-700 border-blue-200",
  LOST: "bg-red-100 text-red-700 border-red-200",
};

const CONDITION_LABELS: Record<string, string> = {
  BAIK: "Baik",
  RUSAK_RINGAN: "Rusak Ringan",
  RUSAK_BERAT: "Rusak Berat",
};

const CONDITION_COLORS: Record<string, string> = {
  BAIK: "bg-emerald-100 text-emerald-700",
  RUSAK_RINGAN: "bg-amber-100 text-amber-700",
  RUSAK_BERAT: "bg-red-100 text-red-700",
};

export function AssetsView() {
  const user = useAppStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const { data: assets, loading, refetch } = useFetch<Asset[]>("/api/assets");

  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "AV",
    serialNumber: "",
    brand: "",
    model: "",
    condition: "BAIK",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (user?.role !== "LIBRARIAN" && user?.role !== "PUSTAKAWAN_JUNIOR") {
    return (
      <div className="space-y-6">
        <PageHeader title="Aset" description="Manajemen aset perpustakaan" icon={Package} />
        <Card className="p-6">
          <EmptyState
            icon={Package}
            title="Akses Ditolak"
            description="Hanya pustakawan yang dapat mengelola aset."
          />
        </Card>
      </div>
    );
  }

  const filtered = assets?.filter((a) => {
    if (filterCategory !== "ALL" && a.category !== filterCategory) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(s) ||
      a.serialNumber?.toLowerCase().includes(s) ||
      a.brand?.toLowerCase().includes(s) ||
      a.model?.toLowerCase().includes(s)
    );
  });

  const total = assets?.length || 0;
  const available = assets?.filter((a) => a.status === "AVAILABLE").length || 0;
  const borrowed = assets?.filter((a) => a.status === "BORROWED").length || 0;
  const damaged = assets?.filter((a) => a.condition !== "BAIK").length || 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama aset wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        serialNumber: form.serialNumber.trim() || null,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        condition: form.condition,
        notes: form.notes.trim() || null,
      };
      if (editAsset) {
        await api.put(`/api/assets/${editAsset.id}`, payload);
        toast.success("Aset diperbarui");
      } else {
        await api.post("/api/assets", payload);
        toast.success("Aset ditambahkan");
      }
      setCreateOpen(false);
      setEditAsset(null);
      setForm({ name: "", category: "AV", serialNumber: "", brand: "", model: "", condition: "BAIK", notes: "" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/assets/${deleteId}`);
      toast.success("Aset dihapus");
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(asset: Asset) {
    setEditAsset(asset);
    setForm({
      name: asset.name,
      category: asset.category,
      serialNumber: asset.serialNumber || "",
      brand: asset.brand || "",
      model: asset.model || "",
      condition: asset.condition,
      notes: asset.notes || "",
    });
    setCreateOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Aset"
        description="Proyektor, laptop, mikrofon, dan aset non-buku lainnya"
        icon={Package}
        actions={
          <Button
            onClick={() => {
              setEditAsset(null);
              setForm({ name: "", category: "AV", serialNumber: "", brand: "", model: "", condition: "BAIK", notes: "" });
              setCreateOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Aset
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Aset" value={total} icon={Package} color="bg-primary/10 text-primary" />
        <StatCard label="Tersedia" value={available} icon={CheckCircle2} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="Dipinjam" value={borrowed} icon={TrendingUp} color="bg-amber-100 text-amber-700" />
        <StatCard label="Rusak" value={damaged} icon={AlertTriangle} color="bg-red-100 text-red-700" />
      </div>

      {/* Filter & search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={filterCategory === "ALL" ? "default" : "outline"}
                onClick={() => setFilterCategory("ALL")}
              >
                Semua
              </Button>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <Button
                  key={k}
                  size="sm"
                  variant={filterCategory === k ? "default" : "outline"}
                  onClick={() => setFilterCategory(k)}
                >
                  {v}
                </Button>
              ))}
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / serial / brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Package}
              title="Belum ada aset"
              description="Tambah aset pertama untuk mulai tracking."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const Icon = CATEGORY_ICONS[a.category] || Package;
            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{a.name}</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {CATEGORY_LABELS[a.category]}
                        </p>
                      </div>
                    </div>
                    {user?.role === "LIBRARIAN" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(a)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(a.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={STATUS_COLORS[a.status]}>
                      {STATUS_LABELS[a.status]}
                    </Badge>
                    <Badge variant="outline" className={CONDITION_COLORS[a.condition]}>
                      {CONDITION_LABELS[a.condition]}
                    </Badge>
                  </div>
                  {a.brand && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Brand:</span> {a.brand} {a.model && `(${a.model})`}
                    </p>
                  )}
                  {a.serialNumber && (
                    <p className="text-muted-foreground font-mono">
                      <span className="font-medium font-sans">SN:</span> {a.serialNumber}
                    </p>
                  )}
                  {a.location && (
                    <p className="text-muted-foreground">
                      📍 {a.location.name} ({a.location.code})
                    </p>
                  )}
                  {a.notes && (
                    <p className="text-muted-foreground line-clamp-2 italic">{a.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Add/Edit */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setEditAsset(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAsset ? "Edit Aset" : "Tambah Aset"}</DialogTitle>
            <DialogDescription>
              Informasi aset non-buku (proyektor, laptop, dll).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="asset-name">Nama Aset *</Label>
                <Input
                  id="asset-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Mis. Proyektor Epson EB-X41"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-category">Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-condition">Kondisi</Label>
                <Select value={form.condition} onValueChange={(v) => setForm((p) => ({ ...p, condition: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-brand">Brand</Label>
                <Input
                  id="asset-brand"
                  value={form.brand}
                  onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="Epson, Acer, Bosch..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-model">Model</Label>
                <Input
                  id="asset-model"
                  value={form.model}
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                  placeholder="EB-X41, Aspire 5..."
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="asset-serial">Serial Number</Label>
                <Input
                  id="asset-serial"
                  value={form.serialNumber}
                  onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))}
                  placeholder="SN/IMEI unik (opsional tapi disarankan)"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="asset-notes">Catatan</Label>
                <Textarea
                  id="asset-notes"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Info tambahan: lokasi penyimpanan, garansi, dll"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setEditAsset(null);
                }}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editAsset ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert: Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Aset?</AlertDialogTitle>
            <AlertDialogDescription>
              Aset akan dihapus permanen. Pastikan tidak ada peminjaman aktif untuk aset ini.
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
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
