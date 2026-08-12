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
  CalendarDays,
  Trash2,
  CalendarX,
  Users,
  Building2,
  PenTool,
  Database,
  Download,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  formatDate,
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
interface Holiday {
  id: string;
  date: string;
  description: string;
  createdAt: string;
}
interface MasterEntry {
  id: string;
  name: string;
  createdAt: string;
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
  const { data: holidays, refetch: refetchHolidays } =
    useFetch<Holiday[]>("/api/holidays", {});
  const { data: publishers, refetch: refetchPublishers } =
    useFetch<MasterEntry[]>("/api/publishers", {});
  const { data: authors, refetch: refetchAuthors } =
    useFetch<MasterEntry[]>("/api/authors", {});

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

  // Section 5: holidays
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: "", description: "" });
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState(false);

  // Section 6: master publisher & author (autocomplete sources)
  const [publisherOpen, setPublisherOpen] = useState(false);
  const [publisherName, setPublisherName] = useState("");
  const [savingPublisher, setSavingPublisher] = useState(false);
  const [deletePublisherId, setDeletePublisherId] = useState<string | null>(null);
  const [deletingPublisher, setDeletingPublisher] = useState(false);

  const [authorOpen, setAuthorOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [savingAuthor, setSavingAuthor] = useState(false);
  const [deleteAuthorId, setDeleteAuthorId] = useState<string | null>(null);
  const [deletingAuthor, setDeletingAuthor] = useState(false);

  // Backup database
  const [downloadingBackup, setDownloadingBackup] = useState(false);

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

  async function saveHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!holidayForm.date) {
      toast.error("Tanggal wajib diisi");
      return;
    }
    if (!holidayForm.description.trim()) {
      toast.error("Keterangan wajib diisi");
      return;
    }
    setSavingHoliday(true);
    try {
      await api.post("/api/holidays", {
        date: holidayForm.date,
        description: holidayForm.description.trim(),
      });
      toast.success("Hari libur ditambahkan.");
      setHolidayOpen(false);
      setHolidayForm({ date: "", description: "" });
      refetchHolidays();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah hari libur");
    } finally {
      setSavingHoliday(false);
    }
  }

  async function deleteHoliday() {
    if (!deleteHolidayId) return;
    setDeletingHoliday(true);
    try {
      await api.delete(`/api/holidays/${deleteHolidayId}`);
      toast.success("Hari libur dihapus.");
      setDeleteHolidayId(null);
      refetchHolidays();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus hari libur");
    } finally {
      setDeletingHoliday(false);
    }
  }

  // ===== Master Publisher handlers =====
  async function savePublisher(e: React.FormEvent) {
    e.preventDefault();
    if (!publisherName.trim()) {
      toast.error("Nama penerbit wajib diisi");
      return;
    }
    setSavingPublisher(true);
    try {
      await api.post("/api/publishers", { name: publisherName.trim() });
      toast.success("Penerbit ditambahkan.");
      setPublisherOpen(false);
      setPublisherName("");
      refetchPublishers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah penerbit");
    } finally {
      setSavingPublisher(false);
    }
  }

  async function deletePublisher() {
    if (!deletePublisherId) return;
    setDeletingPublisher(true);
    try {
      await api.delete(`/api/publishers/${deletePublisherId}`);
      toast.success("Penerbit dihapus dari master.");
      setDeletePublisherId(null);
      refetchPublishers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus penerbit");
    } finally {
      setDeletingPublisher(false);
    }
  }

  // ===== Master Author handlers =====
  async function saveAuthor(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim()) {
      toast.error("Nama pengarang wajib diisi");
      return;
    }
    setSavingAuthor(true);
    try {
      await api.post("/api/authors", { name: authorName.trim() });
      toast.success("Pengarang ditambahkan.");
      setAuthorOpen(false);
      setAuthorName("");
      refetchAuthors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah pengarang");
    } finally {
      setSavingAuthor(false);
    }
  }

  async function deleteAuthor() {
    if (!deleteAuthorId) return;
    setDeletingAuthor(true);
    try {
      await api.delete(`/api/authors/${deleteAuthorId}`);
      toast.success("Pengarang dihapus dari master.");
      setDeleteAuthorId(null);
      refetchAuthors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pengarang");
    } finally {
      setDeletingAuthor(false);
    }
  }

  // ===== Backup database handler =====
  async function handleDownloadBackup() {
    setDownloadingBackup(true);
    try {
      const res = await fetch("/api/admin/backup", { method: "GET" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Gagal mengunduh backup (${res.status})`);
      }
      // Dapatkan nama file dari header Content-Disposition
      const contentDisp = res.headers.get("content-disposition") || "";
      const fileNameMatch = contentDisp.match(/filename="([^"]+)"/);
      const fileName = fileNameMatch
        ? fileNameMatch[1]
        : `jendela-ilmu-backup-${new Date().toISOString().slice(0, 10)}.db`;

      // Convert response ke blob dan trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Backup "${fileName}" berhasil diunduh.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh backup");
    } finally {
      setDownloadingBackup(false);
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

          {/* SECTION 5: Hari Libur */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">Hari Libur</h2>
                  <p className="text-xs text-muted-foreground">
                    Tanggal libur perpustakaan. Jatuh tempo yang jatuh di tanggal
                    ini akan otomatis digeser ke hari kerja berikutnya.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setHolidayForm({ date: "", description: "" });
                  setHolidayOpen(true);
                }}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Hari Libur
              </Button>
            </div>

            {!holidays || holidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada hari libur terdaftar.</p>
                <p className="text-xs mt-1">
                  Tambahkan tanggal libur untuk menyesuaikan jatuh tempo peminjaman.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {formatDate(h.date)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {h.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteHolidayId(h.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      aria-label="Hapus hari libur"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {holidays && holidays.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3 italic">
                Catatan: menghapus hari libur tidak memengaruhi peminjaman yang
                sudah terlanjur dibuat sebelumnya.
              </p>
            )}
          </Card>

          {/* SECTION 6: Master Penerbit & Pengarang */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Master Penerbit & Pengarang</h2>
                <p className="text-xs text-muted-foreground">
                  Sumber saran autocomplete di form buku. Field di buku tetap teks bebas —
                  tabel ini hanya daftar nilai unik.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Penerbit */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Penerbit
                    {publishers && publishers.length > 0 && (
                      <Badge variant="secondary">{publishers.length}</Badge>
                    )}
                  </h3>
                  <Button
                    onClick={() => {
                      setPublisherName("");
                      setPublisherOpen(true);
                    }}
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah
                  </Button>
                </div>
                {!publishers || publishers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">
                    Belum ada penerbit. Daftar akan terisi otomatis dari data buku saat dibuka.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                    {publishers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 hover:shadow-sm transition-shadow"
                      >
                        <span className="flex-1 text-sm text-foreground truncate">{p.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletePublisherId(p.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                          aria-label="Hapus penerbit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pengarang */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-muted-foreground" />
                    Pengarang
                    {authors && authors.length > 0 && (
                      <Badge variant="secondary">{authors.length}</Badge>
                    )}
                  </h3>
                  <Button
                    onClick={() => {
                      setAuthorName("");
                      setAuthorOpen(true);
                    }}
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah
                  </Button>
                </div>
                {!authors || authors.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">
                    Belum ada pengarang. Daftar akan terisi otomatis dari data buku saat dibuka.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                    {authors.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 hover:shadow-sm transition-shadow"
                      >
                        <span className="flex-1 text-sm text-foreground truncate">{a.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteAuthorId(a.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                          aria-label="Hapus pengarang"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Catatan: menghapus dari master tidak menghapus data di buku. Daftar ini
              otomatis terisi dari nilai unik yang ada di data buku saat halaman dibuka.
            </p>
          </Card>

          {/* SECTION 7: Backup Database */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Backup & Pemulihan</h2>
                <p className="text-xs text-muted-foreground">
                  Unduh snapshot database SQLite untuk cadangan atau migrasi.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Download className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Unduh Backup Database
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    File <code className="text-[11px] bg-background px-1 py-0.5 rounded">.db</code> berisi
                    seluruh data perpustakaan (anggota, buku, peminjaman, dst.).
                    Nama file menyertakan tanggal unduhan. Bisa dibuka dengan
                    tool SQLite (DB Browser, sqlite3 CLI, dll).
                  </p>
                </div>
                <Button
                  onClick={handleDownloadBackup}
                  disabled={downloadingBackup}
                  className="gap-2 shrink-0"
                >
                  {downloadingBackup ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloadingBackup ? "Mengunduh..." : "Unduh Backup"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Disarankan mengunduh backup secara berkala (mis. mingguan) dan
              menyimpannya di tempat terpisah. Backup otomatis harian dengan
              rotasi 7 hari tersedia via cron job (konfigurasi admin server).
            </p>
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

      {/* Dialog: Tambah Hari Libur */}
      <Dialog
        open={holidayOpen}
        onOpenChange={(o) => {
          setHolidayOpen(o);
          if (!o) setHolidayForm({ date: "", description: "" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Hari Libur</DialogTitle>
            <DialogDescription>
              Tanggal libur perpustakaan. Peminjaman dengan jatuh tempo yang jatuh
              di tanggal ini akan otomatis digeser ke hari kerja berikutnya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveHoliday} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-date">Tanggal *</Label>
              <Input
                id="holiday-date"
                type="date"
                required
                value={holidayForm.date}
                onChange={(e) =>
                  setHolidayForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holiday-desc">Keterangan *</Label>
              <Input
                id="holiday-desc"
                required
                value={holidayForm.description}
                onChange={(e) =>
                  setHolidayForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Mis. Hari Raya, Libur Nasional, Libur Semester..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setHolidayOpen(false);
                  setHolidayForm({ date: "", description: "" });
                }}
                disabled={savingHoliday}
              >
                Batal
              </Button>
              <Button type="submit" disabled={savingHoliday} className="gap-2">
                {savingHoliday && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingHoliday ? "Menyimpan..." : "Tambah Hari Libur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Konfirmasi Hapus Hari Libur */}
      <AlertDialog
        open={!!deleteHolidayId}
        onOpenChange={(o) => {
          if (!o) setDeleteHolidayId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Hari Libur?</AlertDialogTitle>
            <AlertDialogDescription>
              Hari libur akan dihapus dari daftar. Peminjaman yang sudah dibuat
              sebelumnya TIDAK akan terpengaruh — due date mereka tetap seperti
              yang sudah ditetapkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingHoliday}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingHoliday}
              onClick={(e) => {
                e.preventDefault();
                deleteHoliday();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deletingHoliday && <Loader2 className="h-4 w-4 animate-spin" />}
              {deletingHoliday ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Tambah Penerbit */}
      <Dialog
        open={publisherOpen}
        onOpenChange={(o) => {
          setPublisherOpen(o);
          if (!o) setPublisherName("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Penerbit</DialogTitle>
            <DialogDescription>
              Tambah penerbit ke daftar master untuk autocomplete di form buku.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={savePublisher} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="publisher-name">Nama Penerbit *</Label>
              <Input
                id="publisher-name"
                required
                value={publisherName}
                onChange={(e) => setPublisherName(e.target.value)}
                placeholder="Mis. Bentang Pustaka"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPublisherOpen(false);
                  setPublisherName("");
                }}
                disabled={savingPublisher}
              >
                Batal
              </Button>
              <Button type="submit" disabled={savingPublisher} className="gap-2">
                {savingPublisher && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingPublisher ? "Menyimpan..." : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Konfirmasi Hapus Penerbit */}
      <AlertDialog
        open={!!deletePublisherId}
        onOpenChange={(o) => { if (!o) setDeletePublisherId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Penerbit dari Master?</AlertDialogTitle>
            <AlertDialogDescription>
              Penerbit akan dihapus dari daftar master autocomplete. Data penerbit
              di buku yang sudah ada TIDAK akan terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPublisher}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingPublisher}
              onClick={(e) => { e.preventDefault(); deletePublisher(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deletingPublisher && <Loader2 className="h-4 w-4 animate-spin" />}
              {deletingPublisher ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Tambah Pengarang */}
      <Dialog
        open={authorOpen}
        onOpenChange={(o) => {
          setAuthorOpen(o);
          if (!o) setAuthorName("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pengarang</DialogTitle>
            <DialogDescription>
              Tambah pengarang ke daftar master untuk autocomplete di form buku.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveAuthor} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="author-name">Nama Pengarang *</Label>
              <Input
                id="author-name"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Mis. Andrea Hirata"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAuthorOpen(false);
                  setAuthorName("");
                }}
                disabled={savingAuthor}
              >
                Batal
              </Button>
              <Button type="submit" disabled={savingAuthor} className="gap-2">
                {savingAuthor && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingAuthor ? "Menyimpan..." : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Konfirmasi Hapus Pengarang */}
      <AlertDialog
        open={!!deleteAuthorId}
        onOpenChange={(o) => { if (!o) setDeleteAuthorId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengarang dari Master?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengarang akan dihapus dari daftar master autocomplete. Data pengarang
              di buku yang sudah ada TIDAK akan terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAuthor}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingAuthor}
              onClick={(e) => { e.preventDefault(); deleteAuthor(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deletingAuthor && <Loader2 className="h-4 w-4 animate-spin" />}
              {deletingAuthor ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
