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
  Bell,
  Mail,
  MessageSquare,
  Shield,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode.react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { Switch } from "@/components/ui/form/switch";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { Separator } from "@/components/ui/layout/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-display/table";
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
import { useOnboarding } from "@/components/app/onboarding/onboarding-wizard";
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
  const onboarding = useOnboarding();

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
    card_back_text: "",
  });
  const [identityReady, setIdentityReady] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Section 2: loan rules overrides
  const [rules, setRules] = useState({
    fine_per_day_student: "",
    fine_per_day_teacher: "",
    loan_days_student: "",
    loan_days_teacher: "",
    max_books_student: "",
    max_books_teacher: "",
    max_renewals_student: "",
    max_renewals_teacher: "",
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

  // Gamifikasi toggle (Tahap 8A)
  const [showGamifikasi, setShowGamifikasi] = useState(true);
  const [savingGamifikasi, setSavingGamifikasi] = useState(false);

  // Notification settings (Tahap 20)
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState("1");
  const [savingNotif, setSavingNotif] = useState(false);

  // Notification channels (Tahap 21)
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifWhatsapp, setNotifWhatsapp] = useState(false);
  const [savingChannels, setSavingChannels] = useState(false);

  // 2FA state (Tahap 17)
  interface TwoFAStatus {
    enabled: boolean;
    enabledAt: string | null;
  }
  const { data: twoFAStatus, refetch: refetchTwoFA } = useFetch<TwoFAStatus>("/api/auth/2fa/status", {});
  const [twoFASetup, setTwoFASetup] = useState<{
    secret: string;
    otpAuthUri: string;
    backupCodes: string[];
  } | null>(null);
  const [twoFAConfirmCode, setTwoFAConfirmCode] = useState("");
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [savingTwoFA, setSavingTwoFA] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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
      card_back_text: settings.card_back_text ?? "",
    });
    setRules({
      fine_per_day_student: settings.fine_per_day_student ?? "",
      fine_per_day_teacher: settings.fine_per_day_teacher ?? "",
      loan_days_student: settings.loan_days_student ?? "",
      loan_days_teacher: settings.loan_days_teacher ?? "",
      max_books_student: settings.max_books_student ?? "",
      max_books_teacher: settings.max_books_teacher ?? "",
      max_renewals_student: settings.max_renewals_student ?? "",
      max_renewals_teacher: settings.max_renewals_teacher ?? "",
    });
    setIdentityReady(true);
    setRulesReady(true);
    setShowGamifikasi(settings.show_gamification !== "false");
    setReminderEnabled(settings.reminder_enabled !== "false");
    setReminderDays(settings.reminder_days_before || "1");
    setNotifInApp(settings.notif_channel_in_app !== "false");
    setNotifEmail(settings.notif_channel_email === "true");
    setNotifWhatsapp(settings.notif_channel_whatsapp === "true");
  }

  // Guard: hanya pustakawan PENUH yang bisa akses (PUSTAKAWAN_JUNIOR ditolak)
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
            description="Hanya pustakawan penuh yang dapat mengakses pengaturan sistem. Hubungi pustakawan penuh jika Anda memerlukan perubahan."
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
        card_back_text: identity.card_back_text,
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
        max_books_student: rules.max_books_student,
        max_books_teacher: rules.max_books_teacher,
        max_renewals_student: rules.max_renewals_student,
        max_renewals_teacher: rules.max_renewals_teacher,
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

  // ===== Gamifikasi toggle handler (Tahap 8A) =====
  async function handleToggleGamifikasi(checked: boolean) {
    setShowGamifikasi(checked);
    setSavingGamifikasi(true);
    try {
      await api.put("/api/settings", { show_gamification: checked ? "true" : "false" });
      toast.success(checked ? "Gamifikasi diaktifkan" : "Gamifikasi dinonaktifkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah pengaturan");
      setShowGamifikasi(!checked); // revert
    } finally {
      setSavingGamifikasi(false);
    }
  }

  // ===== Notification settings handler (Tahap 20) =====
  async function saveNotifSettings() {
    setSavingNotif(true);
    try {
      const days = Math.max(1, Math.min(14, parseInt(reminderDays) || 1));
      await api.put("/api/settings", {
        reminder_enabled: reminderEnabled ? "true" : "false",
        reminder_days_before: String(days),
      });
      setReminderDays(String(days));
      toast.success("Pengaturan notifikasi tersimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengaturan");
    } finally {
      setSavingNotif(false);
    }
  }

  // ===== Notification channels handler (Tahap 21) =====
  async function saveChannels() {
    setSavingChannels(true);
    try {
      await api.put("/api/settings", {
        notif_channel_in_app: notifInApp ? "true" : "false",
        notif_channel_email: notifEmail ? "true" : "false",
        notif_channel_whatsapp: notifWhatsapp ? "true" : "false",
      });
      toast.success("Channel notifikasi disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan channel");
    } finally {
      setSavingChannels(false);
    }
  }

  // ===== 2FA handlers (Tahap 17) =====
  async function startTwoFASetup() {
    setSavingTwoFA(true);
    try {
      const res = await api.post<{ secret: string; otpAuthUri: string; backupCodes: string[] }>(
        "/api/auth/2fa/setup"
      );
      setTwoFASetup(res);
      setShow2FADialog(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulai setup 2FA");
    } finally {
      setSavingTwoFA(false);
    }
  }

  async function confirmTwoFASetup() {
    if (!twoFASetup || twoFAConfirmCode.length !== 6) {
      toast.error("Masukkan kode 6 digit");
      return;
    }
    setSavingTwoFA(true);
    try {
      await api.post("/api/auth/2fa/confirm", {
        code: twoFAConfirmCode,
        backupCodes: twoFASetup.backupCodes,
      });
      toast.success("✅ 2FA berhasil diaktifkan. Simpan backup codes di tempat aman!");
      setShow2FADialog(false);
      setTwoFASetup(null);
      setTwoFAConfirmCode("");
      refetchTwoFA();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verifikasi gagal");
    } finally {
      setSavingTwoFA(false);
    }
  }

  async function disableTwoFA() {
    if (!disablePassword) {
      toast.error("Masukkan password untuk konfirmasi");
      return;
    }
    setSavingTwoFA(true);
    try {
      await fetch("/api/auth/2fa/confirm", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      toast.success("2FA dinonaktifkan");
      setShowDisable2FADialog(false);
      setDisablePassword("");
      refetchTwoFA();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menonaktifkan 2FA");
    } finally {
      setSavingTwoFA(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Disalin ke clipboard");
    setTimeout(() => setCopied(null), 2000);
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
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="set-card-back">Teks Sisi Belakang Kartu</Label>
                <Textarea
                  id="set-card-back"
                  value={identity.card_back_text}
                  onChange={(e) =>
                    setIdentity((prev) => ({ ...prev, card_back_text: e.target.value }))
                  }
                  placeholder="Aturan penggunaan kartu anggota..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Teks ini tampil di sisi belakang kartu anggota. Kosongkan untuk pakai teks default.
                </p>
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

          {/* SECTION 1b: Toggle Gamifikasi (Tahap 8A) */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-sm text-foreground">Gamifikasi & Minat Baca</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tampilkan section badge, target baca, dan leaderboard di beranda anggota.
                </p>
              </div>
              <Switch
                checked={showGamifikasi}
                onCheckedChange={handleToggleGamifikasi}
                disabled={savingGamifikasi}
              />
            </div>
          </Card>

          {/* SECTION 1c: Pengaturan Notifikasi (Tahap 20) */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Notifikasi</h2>
                <p className="text-xs text-muted-foreground">
                  Konfigurasi pengingat jatuh tempo dan notifikasi otomatis.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Toggle reminder */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Pengingat Jatuh Tempo</p>
                  <p className="text-xs text-muted-foreground">
                    Kirim notifikasi in-app sebelum jatuh tempo.
                  </p>
                </div>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={setReminderEnabled}
                />
              </div>

              {/* Days before */}
              {reminderEnabled && (
                <div className="flex items-center gap-3">
                  <Label htmlFor="reminder-days" className="text-xs whitespace-nowrap">
                    Kirim sebelum jatuh tempo
                  </Label>
                  <Input
                    id="reminder-days"
                    type="number"
                    min={1}
                    max={14}
                    value={reminderDays}
                    onChange={(e) => setReminderDays(e.target.value)}
                    className="w-20 h-8 text-center"
                  />
                  <span className="text-xs text-muted-foreground">hari</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={saveNotifSettings} disabled={savingNotif} className="gap-2" size="sm">
                  {savingNotif ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingNotif ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          </Card>

          {/* SECTION 1d: Channel Notifikasi (Tahap 21) */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Channel Notifikasi</h2>
                <p className="text-xs text-muted-foreground">
                  Pilih channel untuk mengirim notifikasi (in-app, email, WhatsApp).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* In-app (always) */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <Bell className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">In-App (di dalam aplikasi)</p>
                    <p className="text-xs text-muted-foreground">Selalu aktif. Muncul di menu notifikasi.</p>
                  </div>
                </div>
                <Switch checked={notifInApp} onCheckedChange={setNotifInApp} />
              </div>

              {/* Email */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">
                      Kirim via Gmail SMTP. Butuh env: GMAIL_USER, GMAIL_APP_PASSWORD.
                    </p>
                    {notifEmail && !process.env.NEXT_PUBLIC_DEMO && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        ⚠ Pastikan SMTP sudah dikonfigurasi
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">WhatsApp (Fonnte)</p>
                    <p className="text-xs text-muted-foreground">
                      Kirim via Fonnte gateway. Butuh env: FONNTE_TOKEN.
                    </p>
                  </div>
                </div>
                <Switch checked={notifWhatsapp} onCheckedChange={setNotifWhatsapp} />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={saveChannels} disabled={savingChannels} size="sm" className="gap-2">
                {savingChannels ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingChannels ? "Menyimpan..." : "Simpan Channel"}
              </Button>
            </div>
          </Card>

          {/* SECTION 1e: Keamanan / 2FA (Tahap 17) */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Keamanan Akun</h2>
                <p className="text-xs text-muted-foreground">
                  Two-Factor Authentication (2FA) untuk perlindungan ekstra akun Anda.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border">
              <div className="flex items-center gap-3 min-w-0">
                <KeyRound className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">2FA (TOTP Authenticator)</p>
                  <p className="text-xs text-muted-foreground">
                    {twoFAStatus?.enabled
                      ? `Aktif sejak ${twoFAStatus.enabledAt ? formatDate(twoFAStatus.enabledAt) : "-"}`
                      : "Tidak aktif. Sangat disarankan untuk pustakawan."}
                  </p>
                </div>
              </div>
              {twoFAStatus?.enabled ? (
                <Button variant="outline" size="sm" onClick={() => setShowDisable2FADialog(true)}>
                  Nonaktifkan
                </Button>
              ) : (
                <Button onClick={startTwoFASetup} disabled={savingTwoFA} size="sm" className="gap-2">
                  {savingTwoFA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  Aktifkan 2FA
                </Button>
              )}
            </div>

            {!twoFAStatus?.enabled && (
              <p className="text-xs text-muted-foreground mt-3 italic">
                💡 2FA menggunakan Google Authenticator, Authy, atau app TOTP lainnya. Setelah aktif, Anda akan
                diminta kode 6 digit setiap login.
              </p>
            )}
          </Card>

          {/* SECTION 1f: Bantuan & Onboarding (Tahap 23) */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Bantuan & Onboarding</h2>
                <p className="text-xs text-muted-foreground">
                  Akses tur singkat dan dokumentasi kapan saja.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Tur Onboarding</p>
                  <p className="text-xs text-muted-foreground">
                    Pelajari fitur-fitur utama perpustakaan dalam 10 langkah singkat.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onboarding.start();
                    window.location.reload();
                  }}
                  className="gap-2 shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                  Mulai Tur
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Reset Status Onboarding</p>
                  <p className="text-xs text-muted-foreground">
                    Tandai tur sebagai belum selesai (untuk testing).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onboarding.reset();
                    toast.success("Status on-boarding direset");
                  }}
                  className="gap-2 shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                  Reset
                </Button>
              </div>
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
              <div className="space-y-1.5">
                <Label htmlFor="set-mbs">Maks Buku Siswa</Label>
                <Input
                  id="set-mbs"
                  type="number"
                  inputMode="numeric"
                  value={rules.max_books_student}
                  onChange={(e) =>
                    setRules((prev) => ({ ...prev, max_books_student: e.target.value }))
                  }
                  placeholder="3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-mbt">Maks Buku Guru</Label>
                <Input
                  id="set-mbt"
                  type="number"
                  inputMode="numeric"
                  value={rules.max_books_teacher}
                  onChange={(e) =>
                    setRules((prev) => ({ ...prev, max_books_teacher: e.target.value }))
                  }
                  placeholder="5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-mrs">Maks Perpanjangan Siswa</Label>
                <Input
                  id="set-mrs"
                  type="number"
                  inputMode="numeric"
                  value={rules.max_renewals_student}
                  onChange={(e) =>
                    setRules((prev) => ({ ...prev, max_renewals_student: e.target.value }))
                  }
                  placeholder="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-mrt">Maks Perpanjangan Guru</Label>
                <Input
                  id="set-mrt"
                  type="number"
                  inputMode="numeric"
                  value={rules.max_renewals_teacher}
                  onChange={(e) =>
                    setRules((prev) => ({ ...prev, max_renewals_teacher: e.target.value }))
                  }
                  placeholder="2"
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
         