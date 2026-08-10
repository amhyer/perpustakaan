"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  ShieldAlert,
  Loader2,
  Save,
  Plus,
  BookMarked,
  Library,
  Ruler,
  MapPin,
  Tag,
  Hash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import {
  LOAN_RULES,
  ROLE_LABELS,
  formatRupiah,
} from "@/lib/constants";

interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
}
interface Location {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

type SettingsMap = Record<string, string>;

interface SimpleEntryForm {
  name: string;
  code: string;
  description: string;
}
const EMPTY_ENTRY: SimpleEntryForm = { name: "", code: "", description: "" };

export function SettingsView() {
  const user = useAppStore((s) => s.user);

  const { data: settings, loading: loadingSettings, refetch: refetchSettings } =
    useFetch<SettingsMap>("/api/settings", {});
  const { data: categories, refetch: refetchCategories } =
    useFetch<Category[]>("/api/categories", {});
  const { data: locations, refetch: refetchLocations } =
    useFetch<Location[]>("/api/locations", {});

  // Section 1: identity
  const [identity, setIdentity] = useState({
    library_name: "",
    head_librarian: "",
    library_address: "",
  });
  const [identityReady, setIdentityReady] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Section 2: loan rules overrides
  const [rules, setRules] = useState({
    fine_per_day_student: "",
    fine_per_day_teacher: "",
    loan_days_student: "",
    loan_days_teacher: "",
  });
  const [rulesReady, setRulesReady] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  // Section 3: categories dialog
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState<SimpleEntryForm>(EMPTY_ENTRY);
  const [savingCat, setSavingCat] = useState(false);

  // Section 4: locations dialog
  const [locOpen, setLocOpen] = useState(false);
  const [locForm, setLocForm] = useState<SimpleEntryForm>(EMPTY_ENTRY);
  const [savingLoc, setSavingLoc] = useState(false);

  // Sync settings → form state when settings load (one-shot via flag)
  if (
    !identityReady &&
    !loadingSettings &&
    settings
  ) {
    setIdentity({
      library_name: settings.library_name ?? "",
      head_librarian: settings.head_librarian ?? "",
      library_address: settings.library_address ?? "",
    });
    setRules({
      fine_per_day_student: settings.fine_per_day_student ?? "",
      fine_per_day_teacher: settings.fine_per_day_teacher ?? "",
      loan_days_student: settings.loan_days_student ?? "",
      loan_days_teacher: settings.loan_days_teacher ?? "",
    });
    setIdentityReady(true);
    setRulesReady(true);
  }

  // Guard
  if (user?.role !== "LIBRARIAN") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pengaturan"
          description="Konfigurasi sistem perpustakaan"
          icon={SettingsIcon}
        />
        <Card className="p-6">
          <EmptyState
            icon={ShieldAlert}
            title="Akses Ditolak"
            description="Hanya pustakawan yang dapat mengakses pengaturan sistem. Hubungi pustakawan jika Anda memerlukan perubahan."
          />
        </Card>
      </div>
    );
  }

  async function saveIdentity() {
    setSavingIdentity(true);
    try {
      await api.put("/api/settings", {
        library_name: identity.library_name,
        head_librarian: identity.head_librarian,
        library_address: identity.library_address,
      });
      toast.success("Identitas perpustakaan disimpan.");
      refetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan identitas");
    } finally {
      setSavingIdentity(false);
    }
  }

  async function saveRules() {
    setSavingRules(true);
    try {
      await api.put("/api/settings", {
        fine_per_day_student: rules.fine_per_day_student,
        fine_per_day_teacher: rules.fine_per_day_teacher,
        loan_days_student: rules.loan_days_student,
        loan_days_teacher: rules.loan_days_teacher,
      });
      toast.success("Aturan peminjaman disimpan.");
      refetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan aturan");
    } finally {
      setSavingRules(false);
    }
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catForm.name.trim() || !catForm.code.trim()) {
      toast.error("Nama dan kode kategori wajib diisi");
      return;
    }
    setSavingCat(true);
    try {
      await api.post("/api/categories", {
        name: catForm.name.trim(),
        code: catForm.code.trim().toUpperCase(),
        description: catForm.description.trim() || null,
      });
      toast.success("Kategori baru ditambahkan.");
      setCatOpen(false);
      setCatForm(EMPTY_ENTRY);
      refetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah kategori");
    } finally {
      setSavingCat(false);
    }
  }

  async function saveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!locForm.name.trim() || !locForm.code.trim()) {
      toast.error("Nama dan kode rak wajib diisi");
      return;
    }
    setSavingLoc(true);
    try {
      await api.post("/api/locations", {
        name: locForm.name.trim(),
        code: locForm.code.trim().toUpperCase(),
        description: locForm.description.trim() || null,
      });
      toast.success("Rak/lokasi baru ditambahkan.");
      setLocOpen(false);
      setLocForm(EMPTY_ENTRY);
      refetchLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah rak");
    } finally {
      setSavingLoc(false);
    }
  }

  const loadingAll = loadingSettings;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi sistem perpustakaan"
        icon={SettingsIcon}
      />

      {loadingAll ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <div className="h-5 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-10 w-full rounded bg-muted animate-pulse" />
                <div className="h-10 w-full rounded bg-muted animate-pulse" />
                <div className="h-9 w-32 rounded bg-muted animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* SECTION 1: Identitas Perpustakaan */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Library className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Identitas Perpustakaan</h2>
                <p className="text-xs text-muted-foreground">
                  Informasi dasar yang tampil di kartu anggota & laporan.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="set-libname">Nama Perpustakaan</Label>
                <Input
                  id="set-libname"
                  value={identity.library_name}
                  onChange={(e) =>
                    setIdentity((prev) => ({ ...prev, library_name: e.target.value }))
                  }
                  placeholder="Perpustakaan Jendela Ilmu"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-headlib">Kepala Perpustakaan</Label>
                <Input
                  id="set-headlib"
                  value={identity.head_librarian}
                  onChange={(e) =>
                    setIdentity((prev) => ({ ...prev, head_librarian: e.target.value }))
                  }
                  placeholder="Dra. Siti Rahmawati, M.Pd."
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="set-address">Alamat</Label>
                <Textarea
                  id="set-address"
                  value={identity.library_address}
                  onChange={(e) =>
                    setIdentity((prev) => ({ ...prev, library_address: e.target.value }))
                  }
                  placeholder="Jl. Pendidikan No. 1, Kota..."
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={saveIdentity}
                disabled={savingIdentity}
                className="gap-2"
              >
                {savingIdentity ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {savingIdentity ? "Menyimpan..." : "Simpan Identitas"}
              </Button>
            </div>
          </Card>

          {/* SECTION 2: Aturan Peminjaman */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Ruler className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Aturan Peminjaman</h2>
                <p className="text-xs text-muted-foreground">
                  Tabel default berlaku untuk seluruh anggota. Override di bawah mengubah
                  nilai konfigurasi tambahan.
                </p>
              </div>
            </div>

            {/* Default loan rules table */}
            <div className="rounded-md border overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Maks. Buku</TableHead>
                    <TableHead className="text-center">Lama Pinjam (hari)</TableHead>
                    <TableHead className="text-right">Denda / Hari</TableHead>
                    <TableHead className="text-center">Maks. Perpanjang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(["STUDENT", "TEACHER", "LIBRARIAN"] as const).map((cat) => {
                    const r = LOAN_RULES[cat];
                    return (
                      <TableRow key={cat}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              cat === "LIBRARIAN"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : cat === "TEACHER"
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : "bg-sky-100 text-sky-700 border-sky-200"
                            }
                          >
                            {ROLE_LABELS[cat]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{r.maxBooks}</TableCell>
                        <TableCell className="text-center font-medium">{r.loanDays}</TableCell>
                        <TableCell className="text-right font-medium">
                          {r.finePerDay === 0 ? "Gratis" : formatRupiah(r.finePerDay)}
                        </TableCell>
                        <TableCell className="text-center font-medium">{r.maxRenewals}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Separator className="my-4" />

            <p className="text-sm text-muted-foreground mb-3">
              Aturan denda aktual mengikuti tabel di atas (default). Anda dapat
              menyimpan catatan override berikut untuk referensi konfigurasi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="set-fps">Denda/Hari Siswa (Rp)</Label>
                <Input
                  id="set-fps"
                  type="number"
                  inputMode="numeric"
                  value={rules.fine_per_day_student}
                  onChange={(e) =>
                    setRules((prev) => ({ ...prev, fine_per_day_student: e.target.value }))
                  }
                  placeholder="1000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-fpt">Denda/Hari Guru (Rp)</Label>
                <Input
                  id="set-fpt"
                  type="number"
                  inputMode="numeric"
                  value={rules.fine_per_day_teacher}
                  onChange={(e) =>
                    setRules((prev) => ({ ...prev, fine_per_day_teacher: e.target.value }))
                  }
                  placeholder="500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-lds">Lama Pinjam Siswa (hari)</Label>
                <Input
                  id="set-lds"
                  type="number"
                  inputMode="numeric"
                  value={rules.loan_days_student}
                  onChange={(e) =>
                    setRules((prev) => ({ ...prev, loan_days_student: e.target.value }))
                  }
                  placeholder="7"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-ldt">Lama Pinjam Guru (hari)</Label>
                <Input
                  id="set-ldt"
                  type="number"
                  inputMode="numeric"
                  value={rules.loan_days_teacher}
                  onChange={(e) =>
                    setRules((prev) => ({ ...prev, loan_days_teacher: e.target.value }))
                  }
                  placeholder="14"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={saveRules} disabled={savingRules} className="gap-2">
                {savingRules ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {savingRules ? "Menyimpan..." : "Simpan Aturan"}
              </Button>
            </div>
          </Card>

          {/* SECTION 3: Manajemen Kategori */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Tag className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">Manajemen Kategori</h2>
                  <p className="text-xs text-muted-foreground">
                    Klasifikasi subjek koleksi buku.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setCatForm(EMPTY_ENTRY);
                  setCatOpen(true);
                }}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Kategori
              </Button>
            </div>

            {!categories || categories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Belum ada kategori.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                          <Hash className="h-3 w-3" />
                          {c.code}
                        </p>
                      </div>
                      <BookMarked className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* SECTION 4: Manajemen Rak/Lokasi */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">Manajemen Rak / Lokasi</h2>
                  <p className="text-xs text-muted-foreground">
                    Penempatan fisik koleksi di perpustakaan.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setLocForm(EMPTY_ENTRY);
                  setLocOpen(true);
                }}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Rak
              </Button>
            </div>

            {!locations || locations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Belum ada rak/lokasi.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                {locations.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {l.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                          <Hash className="h-3 w-3" />
                          {l.code}
                        </p>
                      </div>
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    {l.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {l.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Dialog: Tambah Kategori */}
      <Dialog
        open={catOpen}
        onOpenChange={(o) => {
          setCatOpen(o);
          if (!o) setCatForm(EMPTY_ENTRY);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Kategori</DialogTitle>
            <DialogDescription>
              Klasifikasi baru untuk koleksi buku. Field bertanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nama Kategori *</Label>
              <Input
                id="cat-name"
                required
                value={catForm.name}
                onChange={(e) =>
                  setCatForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Mis. Fiksi Remaja"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-code">Kode *</Label>
              <Input
                id="cat-code"
                required
                value={catForm.code}
                onChange={(e) =>
                  setCatForm((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="Mis. FIK-01"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Deskripsi</Label>
              <Textarea
                id="cat-desc"
                value={catForm.description}
                onChange={(e) =>
                  setCatForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Kategori untuk buku fiksi remaja..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCatOpen(false);
                  setCatForm(EMPTY_ENTRY);
                }}
                disabled={savingCat}
              >
                Batal
              </Button>
              <Button type="submit" disabled={savingCat} className="gap-2">
                {savingCat && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingCat ? "Menyimpan..." : "Tambah Kategori"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tambah Rak */}
      <Dialog
        open={locOpen}
        onOpenChange={(o) => {
          setLocOpen(o);
          if (!o) setLocForm(EMPTY_ENTRY);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Rak / Lokasi</DialogTitle>
            <DialogDescription>
              Rak fisik untuk penempatan koleksi. Field bertanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveLocation} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Nama Rak *</Label>
              <Input
                id="loc-name"
                required
                value={locForm.name}
                onChange={(e) =>
                  setLocForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Mis. Rak A - Fiksi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-code">Kode *</Label>
              <Input
                id="loc-code"
                required
                value={locForm.code}
                onChange={(e) =>
                  setLocForm((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="Mis. A-01"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-desc">Deskripsi</Label>
              <Textarea
                id="loc-desc"
                value={locForm.description}
                onChange={(e) =>
                  setLocForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Rak dekat pintu masuk, baris atas..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLocOpen(false);
                  setLocForm(EMPTY_ENTRY);
                }}
                disabled={savingLoc}
              >
                Batal
              </Button>
              <Button type="submit" disabled={savingLoc} className="gap-2">
                {savingLoc && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingLoc ? "Menyimpan..." : "Tambah Rak"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
