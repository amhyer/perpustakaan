"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList,
  ScanLine,
  Keyboard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCcw,
  BookOpen,
  Clock,
  CheckSquare,
  Square,
  ChevronRight,
  PauseCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useQrScanner } from "@/hooks/use-qr-scanner";
import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";
import { Progress } from "@/components/ui/feedback/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlay/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-display/table";
import { formatDate } from "@/lib/constants";

// ===== Types =====
interface StocktakingSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
  status: "ONGOING" | "COMPLETED";
  createdById: string;
  expectedCount: number;
  _count: { scans: number };
}

interface BookItem {
  id: string;
  itemCode: string;
  status: string;
  book: { id: string; title: string; author: string; coverColor: string };
}

interface ScanResult {
  status: "OK" | "DUPLICATE" | "ANOMALY" | "NOT_FOUND";
  message: string;
  bookItem?: BookItem;
}

interface ScanLog {
  id: string;
  itemCode: string;
  status: string;
  bookTitle: string;
  scannedAt: string;
}

interface CloseResult {
  found: number;
  notFound: BookItem[];
  anomalies: BookItem[];
  expectedCount: number;
}

// ===== Phases =====
type Phase = "list" | "active" | "results" | "history-detail";

// ===== Main View =====
export function StocktakingView() {
  return <StocktakingList />;
}

// ===== List: Daftar sesi =====
function StocktakingList() {
  const [sessions, setSessions] = useState<StocktakingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    try {
      const data = await api.get<StocktakingSession[]>("/api/stocktaking");
      setSessions(data);
    } catch (e) {
      toast.error("Gagal memuat sesi stock opname");
    } finally {
      setLoading(false);
    }
  }

  async function startSession() {
    try {
      await api.post("/api/stocktaking");
      toast.success("Sesi stock opname baru dimulai");
      await fetchSessions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai sesi");
    }
  }

  const activeSession = sessions.find((s) => s.status === "ONGOING");
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stock Opname</h1>
          <p className="text-sm text-muted-foreground">
            Pantau keberadaan eksemplar buku di rak
          </p>
        </div>
        <Button
          onClick={startSession}
          disabled={!!activeSession}
          className="gap-2"
        >
          <ClipboardList className="h-4 w-4" />
          {activeSession ? "Sedang Berjalan" : "Mulai Sesi Baru"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada sesi stock opname</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active Sessions */}
          {activeSession && (
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-primary">Sesi Sedang Berlangsung</h3>
                  <p className="text-sm text-muted-foreground">
                    Dimulai {formatDate(activeSession.startedAt)} · {activeSession.expectedCount} eksemplar diperkirakan
                  </p>
                </div>
                <Badge>ONGOING</Badge>
              </div>
            </Card>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground mt-4 mb-2">
                Riwayat Sesi
              </h3>
              <div className="space-y-2">
                {completedSessions.map((session) => (
                  <CompletedSessionCard key={session.id} session={session} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ===== List item for completed sessions =====
function CompletedSessionCard({ session }: { session: StocktakingSession }) {
  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{formatDate(session.startedAt)}</h3>
          <p className="text-sm text-muted-foreground">
            {session._count.scans} dari {session.expectedCount} eksemplar discan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">COMPLETED</Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

// ===== Active: Scan view =====
function StocktakingActive({ session }: { session: StocktakingSession }) {
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [closing, setClosing] = useState(false);

  const { containerId } = useQrScanner(handleScan, scanning, "stocktaking-scanner");

  useEffect(() => {
    return () => {
      setScanning(false);
    };
  }, []);

  function handleScan(text: string) {
    const trimmed = text.trim();
    if (trimmed) {
      submitScan(trimmed);
    }
  }

  async function submitScan(itemCode: string) {
    try {
      const result = await api.post<ScanResult>(`/api/stocktaking/${session.id}/scan`, { itemCode });
      setScanResult(result);

      const log: ScanLog = {
        id: Date.now().toString(),
        itemCode,
        status: result.status,
        bookTitle: result.bookItem?.book.title ?? "-",
        scannedAt: new Date().toISOString(),
      };
      setScanLogs((prev) => [log, ...prev.slice(0, 9)]);

      if (result.status === "OK") {
        toast.success(`Eksemplar ${result.bookItem?.book.title} berhasil discan`);
      } else {
        toast.warning(result.message, {
          icon: result.status === "DUPLICATE" ? <RotateCcw className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal scan");
    }
  }

  async function closeSession() {
    setClosing(true);
    try {
      const result = await api.post<CloseResult>(`/api/stocktaking/${session.id}/close`, {});
      toast.success("Sesi stock opname selesai");
      window.dispatchEvent(new CustomEvent("stocktaking-closed", { detail: result }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menutup sesi");
    } finally {
      setClosing(false);
    }
  }

  const progress = (session._count.scans / session.expectedCount) * 100;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stock Opname - Aktif</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(session.startedAt)} · Sesi #{session.id.substring(0, 8)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">
            {session._count.scans} / {session.expectedCount} eksemplar
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Scanner */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Scanner Kamera</h3>
          <Button
            variant={scanning ? "default" : "outline"}
            size="sm"
            onClick={() => setScanning(!scanning)}
          >
            {scanning ? "Matikan" : "Nyalakan"} Scanner
          </Button>
        </div>

        {scanning && (
          <>
            <div
              id={containerId}
              className="mx-auto w-full max-w-sm rounded-xl overflow-hidden border-2 border-primary/30 bg-black aspect-square"
            />
            <p className="text-center text-sm text-muted-foreground mt-3">
              Arahkan QR/barcode eksemplar ke kamera
            </p>
          </>
        )}

        {/* Manual Input */}
        <div className="mt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) {
                submitScan(manualInput.trim());
                setManualInput("");
              }
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Masukkan kode eksemplar..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
            <Button type="submit" size="sm" variant="outline">
              <Keyboard className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>

      {/* Last Scan Result */}
      {scanResult && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-3">
            {scanResult.status === "OK" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : scanResult.status === "DUPLICATE" ? (
              <RotateCcw className="h-5 w-5 text-amber-500" />
            ) : scanResult.status === "ANOMALY" ? (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="font-medium">{scanResult.message}</p>
              {scanResult.bookItem && (
                <p className="text-sm text-muted-foreground">
                  {scanResult.bookItem.book.title} (kode: {scanResult.bookItem.itemCode})
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Scan Log */}
      <Card className="p-4 mb-6">
        <h3 className="font-semibold mb-3">Log Scan Terbaru</h3>
        {scanLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada scan</p>
        ) : (
          <div className="space-y-2">
            {scanLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm">
                <span>{log.itemCode}</span>
                <Badge
                  variant={log.status === "OK" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Close Session */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => window.history.back()}>
          Batal
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={closing}>
              <PauseCircle className="h-4 w-4 mr-2" />
              Selesaikan Sesi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Selesaikan Sesi Stock Opname?</DialogTitle>
              <DialogDescription>
                Sesi akan ditutup dan hasil otomatis dihitung. Eksemplar yang tidak
                discan akan muncul di daftar "Tidak Ditemukan".
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={closeSession}
                disabled={closing}
              >
                {closing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Selesaikan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ===== Results: Hasil penutupan sesi =====
function StocktakingResults({
  session,
  result,
  onSelectLost,
}: {
  session: StocktakingSession;
  result: CloseResult;
  onSelectLost: () => void;
}) {
  const [selectedNotFound, setSelectedNotFound] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  function toggleNotFound(id: string) {
    setSelectedNotFound((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllNotFound() {
    if (selectedNotFound.size === result.notFound.length) {
      setSelectedNotFound(new Set());
    } else {
      setSelectedNotFound(new Set(result.notFound.map((i) => i.id)));
    }
  }

  async function confirmLost() {
    if (selectedNotFound.size === 0) {
      toast.warning("Pilih setidaknya satu eksemplar");
      return;
    }
    setConfirming(true);
    try {
      await api.post(`/api/stocktaking/${session.id}/confirm-lost`, {
        bookItemIds: Array.from(selectedNotFound),
      });
      toast.success(`${selectedNotFound.size} eksemplar ditandai hilang`);
      onSelectLost();
    } catch (e) {
      toast.error("Gagal memperbarui status");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stock Opname - Hasil</h1>
          <p className="text-sm text-muted-foreground">
            Sesi #{session.id.substring(0, 8)}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{result.found}</div>
          <p className="text-sm text-muted-foreground">Ditemukan</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{result.notFound.length}</div>
          <p className="text-sm text-muted-foreground">Tidak Ditemukan</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-orange-600">{result.anomalies.length}</div>
          <p className="text-sm text-muted-foreground">Anomali</p>
        </Card>
      </div>

      {/* Not Found Table */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Eksemplar Tidak Ditemukan</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAllNotFound}
          >
            {selectedNotFound.size === result.notFound.length ? (
              <CheckSquare className="h-4 w-4 mr-2" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            {selectedNotFound.size === result.notFound.length ? "Batalkan Pilih" : "Pilih Semua"}
          </Button>
        </div>

        {result.notFound.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Semua eksemplar ditemukan
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Buku</TableHead>
                <TableHead>Penulis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.notFound.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedNotFound.has(item.id)}
                      onChange={() => toggleNotFound(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                  <TableCell>{item.book.title}</TableCell>
                  <TableCell className="text-muted-foreground">{item.book.author}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {selectedNotFound.size > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="destructive"
              onClick={confirmLost}
              disabled={confirming}
            >
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Tandai {selectedNotFound.size} Terpilih sebagai Hilang
            </Button>
          </div>
        )}
      </Card>

      {/* Anomalies */}
      {result.anomalies.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-orange-600">Anomali</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Buku</TableHead>
                <TableHead>Status Saat Ini</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.anomalies.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                  <TableCell>{item.book.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ===== History Detail (read-only) =====
function StocktakingHistoryDetail({ session }: { session: StocktakingSession }) {
  const [detail, setDetail] = useState<{
    scans: { bookItemId: string; bookItem: BookItem }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{
        id: string;
        startedAt: string;
        endedAt: string | null;
        status: string;
        expectedCount: number;
        note: string | null;
        scans: { bookItemId: string; bookItem: BookItem }[];
      }>(`/api/stocktaking/${session.id}`)
      .then((data) => setDetail({ scans: data.scans }))
      .finally(() => setLoading(false));
  }, [session.id]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Detail Sesi Stock Opname</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(session.startedAt)} → {session.endedAt ? formatDate(session.endedAt) : "-"}
        </p>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Eksemplar Discan ({detail?.scans.length ?? 0})</h3>
        {detail?.scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada scan</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Buku</TableHead>
                <TableHead>Penulis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail?.scans.map((s) => (
                <TableRow key={s.bookItemId}>
                  <TableCell className="font-mono text-sm">{s.bookItem.itemCode}</TableCell>
                  <TableCell>{s.bookItem.book.title}</TableCell>
                  <TableCell className="text-muted-foreground">{s.bookItem.book.author}</TableCell>
                </TableRow>
              )) ?? []}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
