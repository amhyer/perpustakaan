"use client";

/**
 * Data Export Center — Librarian export hub.
 *
 * Sprint L-Phase 4: Audit log viewer + Data export page.
 *
 * Features:
 * - Choose data type (books/members/loans/fines/reservations/audit)
 * - Date range filter
 * - Anonymize PII for members (GDPR)
 * - Status filter for loans
 * - One-click CSV download
 * - Format preview (column list)
 * - Export history (last 10)
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Calendar,
  Users,
  BookOpen,
  ShoppingCart,
  Receipt,
  Clock,
  ScrollText,
  Eye,
  EyeOff,
  Lock,
  Check,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";

// ===== Types =====

type ExportType = "books" | "members" | "loans" | "fines" | "reservations" | "audit";

interface ExportTypeMeta {
  type: ExportType;
  label: string;
  description: string;
  icon: typeof Download;
  color: string;
  columns: string[];
  supportsDateRange: boolean;
  supportsStatus: boolean;
  supportsAnonymize: boolean;
  statusOptions?: { value: string; label: string }[];
}

const EXPORT_TYPES: ExportTypeMeta[] = [
  {
    type: "books",
    label: "Data Buku",
    description: "Daftar semua buku dengan statistik inventaris (tersedia, dipinjam, rusak)",
    icon: BookOpen,
    color: "blue",
    columns: ["id", "judul", "pengarang", "penerbit", "isbn", "tahun", "kategori", "rak", "total", "tersedia", "dipinjam", "rusak"],
    supportsDateRange: true,
    supportsStatus: false,
    supportsAnonymize: false,
  },
  {
    type: "members",
    label: "Data Anggota",
    description: "Daftar anggota dengan poin, tipe, dan jumlah peminjaman",
    icon: Users,
    color: "emerald",
    columns: ["id", "nama", "email", "telepon", "role", "tipe", "status", "poin", "total pinjam"],
    supportsDateRange: true,
    supportsStatus: false,
    supportsAnonymize: true,
  },
  {
    type: "loans",
    label: "Data Peminjaman",
    description: "Riwayat peminjaman dengan tanggal pinjam, jatuh tempo, dan denda",
    icon: ShoppingCart,
    color: "violet",
    columns: ["id", "anggota", "buku", "eksemplar", "tgl pinjam", "jatuh tempo", "kembali", "status", "denda"],
    supportsDateRange: true,
    supportsStatus: true,
    supportsAnonymize: false,
    statusOptions: [
      { value: "ALL", label: "Semua" },
      { value: "ACTIVE", label: "Aktif" },
      { value: "RETURNED", label: "Dikembalikan" },
      { value: "OVERDUE", label: "Terlambat" },
    ],
  },
  {
    type: "fines",
    label: "Data Denda",
    description: "Daftar denda dengan status pembayaran (lunas/belum)",
    icon: Receipt,
    color: "amber",
    columns: ["id", "anggota", "buku", "jumlah", "dibayar", "sisa", "status", "tanggal", "alasan"],
    supportsDateRange: true,
    supportsStatus: true,
    supportsAnonymize: false,
    statusOptions: [
      { value: "all", label: "Semua" },
      { value: "unpaid", label: "Belum Dibayar" },
    ],
  },
  {
    type: "reservations",
    label: "Data Reservasi",
    description: "Antrian reservasi buku dengan status aktif/selesai",
    icon: Clock,
    color: "indigo",
    columns: ["id", "anggota", "buku", "tgl reservasi", "status", "kadaluarsa", "posisi antrian"],
    supportsDateRange: true,
    supportsStatus: true,
    supportsAnonymize: false,
    statusOptions: [
      { value: "all", label: "Semua" },
      { value: "active", label: "Aktif Saja" },
    ],
  },
  {
    type: "audit",
    label: "Jejak Audit",
    description: "Log aktivitas sistem untuk audit & compliance (maks 50.000 baris)",
    icon: ScrollText,
    color: "red",
    columns: ["id", "tanggal", "user", "aksi", "resource", "resourceId", "detail", "ip"],
    supportsDateRange: true,
    supportsStatus: false,
    supportsAnonymize: false,
  },
];

interface ExportHistoryEntry {
  type: ExportType;
  filename: string;
  rowCount: number;
  timestamp: number;
}

const MAX_HISTORY = 10;
const HISTORY_KEY = "ji-export-history";

function getExportHistory(): ExportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? (JSON.parse(stored) as ExportHistoryEntry[]) : [];
  } catch (e) {
    console.error("Failed to parse export history:", e);
    return [];
  }
}

function saveExportHistory(history: ExportHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (e) {
    console.error("Failed to save export history:", e);
  }
}

function addToHistory(entry: ExportHistoryEntry): void {
  const history = getExportHistory();
  saveExportHistory([entry, ...history.filter((h) => h.filename !== entry.filename)].slice(0, MAX_HISTORY));
}

export function DataExportView() {
  const user = useAppStore((s) => s.user);
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [anonymize, setAnonymize] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);
  const [previewType, setPreviewType] = useState<ExportType | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getExportHistory());
  }, []);

  if (user?.role !== "LIBRARIAN" && user?.role !== "PUSTAKAWAN_JUNIOR") {
    return (
      <Card className="p-6">
        <EmptyState
          icon={Lock}
          title="Akses Ditolak"
          description="Hanya pustakawan yang dapat mengekspor data."
        />
      </Card>
    );
  }

  const selectedMeta = selectedType ? EXPORT_TYPES.find((e) => e.type === selectedType) : null;
  const previewMeta = previewType ? EXPORT_TYPES.find((e) => e.type === previewType) : null;

  const handleExport = async () => {
    if (!selectedType) return;
    setExporting(true);
    setSuccessMsg(null);
    try {
      const params = new URLSearchParams({ type: selectedType });
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (status) params.set("status", status);
      if (anonymize) params.set("anonymize", "true");

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export gagal" }));
        toast.error(`Export gagal: ${err.error || res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
      const filename = filenameMatch?.[1] || `export-${selectedType}.csv`;
      const rowCount = parseInt(res.headers.get("X-Row-Count") || "0", 10);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save to history
      const entry: ExportHistoryEntry = {
        type: selectedType,
        filename,
        rowCount,
        timestamp: Date.now(),
      };
      addToHistory(entry);
      setHistory(getExportHistory());

      setSuccessMsg(`✓ Berhasil mengekspor ${rowCount} baris ke ${filename}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      toast.error(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleQuickExport = async (type: ExportType) => {
    setSelectedType(type);
    setDateFrom("");
    setDateTo("");
    setStatus("");
    setAnonymize(false);
    // Auto-export
    setTimeout(() => {
      handleExport();
    }, 50);
  };

  return (
    <div>
      <PageHeader
        title="Pusat Export Data"
        description="Ekspor data perpustakaan ke format CSV untuk analisis, laporan, atau compliance"
        icon={Download}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Type selection grid */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Pilih Jenis Data
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXPORT_TYPES.map((meta) => {
              const Icon = meta.icon;
              const isSelected = selectedType === meta.type;
              const colorClasses: Record<string, string> = {
                blue: "bg-blue-50 border-blue-200 text-blue-700",
                emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
                violet: "bg-violet-50 border-violet-200 text-violet-700",
                amber: "bg-amber-50 border-amber-200 text-amber-700",
                indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
                red: "bg-red-50 border-red-200 text-red-700",
              };
              return (
                <Card
                  key={meta.type}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:shadow-md",
                    isSelected && "ring-2 ring-primary border-primary"
                  )}
                  onClick={() => setSelectedType(meta.type)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg border flex items-center justify-center shrink-0",
                        colorClasses[meta.color]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{meta.label}</h3>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {meta.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {meta.supportsDateRange && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            <Calendar className="h-2.5 w-2.5 mr-0.5" />
                            Rentang tanggal
                          </Badge>
                        )}
                        {meta.supportsStatus && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            Filter status
                          </Badge>
                        )}
                        {meta.supportsAnonymize && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            <EyeOff className="h-2.5 w-2.5 mr-0.5" />
                            Anonimisasi
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {meta.columns.length} kolom
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Export options (when type selected) */}
          {selectedMeta && (
            <Card className="p-4 mt-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <selectedMeta.icon className="h-4 w-4" />
                Opsi Export: {selectedMeta.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedMeta.supportsDateRange && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Dari Tanggal
                      </label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Sampai Tanggal
                      </label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </>
                )}

                {selectedMeta.supportsStatus && selectedMeta.statusOptions && (
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">
                      Filter Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">— Pilih Status —</option>
                      {selectedMeta.statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedMeta.supportsAnonymize && (
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={anonymize}
                        onChange={(e) => setAnonymize(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          <EyeOff className="h-3.5 w-3.5" />
                          Anonimisasi Data Pribadi (GDPR)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Nama diganti &quot;Member #N&quot;, email di-hash, telepon dihapus
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {successMsg && (
                <div className="mt-3 p-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                  {successMsg}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex-1"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Export {selectedMeta.label}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedType(null)}
                  disabled={exporting}
                >
                  Batal
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Preview & history */}
        <div className="space-y-4">
          {/* Column preview */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Kolom
            </h3>
            {previewMeta ? (
              <div>
                <div className="text-xs text-muted-foreground mb-2">
                  {previewMeta.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {previewMeta.columns.map((col) => (
                    <Badge key={col} variant="secondary" className="text-[10px]">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pilih jenis data di sebelah kiri untuk melihat kolom yang akan di-export
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1">
              {EXPORT_TYPES.slice(0, 3).map((meta) => (
                <button
                  key={meta.type}
                  onClick={() => setPreviewType(meta.type)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-md border",
                    previewType === meta.type
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Quick export */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Cepat
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Export langsung tanpa filter (semua data)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_TYPES.map((meta) => {
                const Icon = meta.icon;
                return (
                  <Button
                    key={meta.type}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickExport(meta.type)}
                    disabled={exporting}
                    className="justify-start text-xs h-8"
                  >
                    <Icon className="h-3 w-3 mr-1.5" />
                    {meta.label.replace("Data ", "")}
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* History */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Riwayat Export
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada export. File yang didownload akan muncul di sini.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((entry, idx) => {
                  const meta = EXPORT_TYPES.find((m) => m.type === entry.type);
                  const Icon = meta?.icon || FileSpreadsheet;
                  return (
                    <div
                      key={`${entry.filename}-${idx}`}
                      className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 text-xs"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{entry.filename}</div>
                        <div className="text-muted-foreground">
                          {entry.rowCount.toLocaleString("id-ID")} baris ·{" "}
                          {new Date(entry.timestamp).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
