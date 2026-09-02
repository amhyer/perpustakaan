"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ScanLine,
  UserCheck,
  BookPlus,
  BookMinus,
  CheckCircle2,
  XCircle,
  X,
  Keyboard,
  Loader2,
  RotateCcw,
  Lock,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";
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
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  formatDate,
  formatRupiah,
  ROLE_LABELS,
} from "@/lib/constants";

// ===== Types =====
interface ScannedMember {
  id: string;
  memberNumber: string;
  fullName: string;
  category: string;
  classGrade: string | null;
  photo: string | null;
  status: string;
}

interface ActiveLoan {
  id: string;
  dueDate: string;
  status: string;
  fineAmount: number;
  bookItem: {
    id: string;
    itemCode: string;
    book: { id: string; title: string; author: string; coverColor: string };
  };
}

interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  items: { id: string; itemCode: string; status: string }[];
}

type KioskPhase =
  | "scan-member"
  | "member-info"
  | "scan-book"
  | "result"
  | "exit-confirm";

type KioskAction = "borrow" | "return" | null;

// ===== QR Scanner Hook (reused from shared hook) =====
import { useQrScanner } from "@/hooks/use-qr-scanner";

// ===== Main View =====
export function KioskModeView() {
  const { user, setView } = useAppStore();
  const [phase, setPhase] = useState<KioskPhase>("scan-member");
  const [action, setAction] = useState<KioskAction>(null);
  const [member, setMember] = useState<ScannedMember | null>(null);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exitPassword, setExitPassword] = useState("");
  const [exitError, setExitError] = useState("");
  const [exitLoading, setExitLoading] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(true);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== Scan handler =====
  const handleScan = useCallback(async (text: string) => {
    if (!scanEnabled || loading) return;
    setScanEnabled(false);

    try {
      let memberId = "";
      let memberNumber = "";

      try {
        const parsed = JSON.parse(text);
        if (parsed.t === "JENDELA-ILMU-MEMBER" && parsed.id) {
          memberId = parsed.id;
        } else if (parsed.no) {
          memberNumber = parsed.no;
        }
      } catch (e) {
        // Not JSON — treat as member number or item code
        if (phase === "scan-member") {
          memberNumber = text.trim();
        } else {
          // Book item code
          await handleBookScan(text.trim());
          return;
        }
      }

      if (phase === "scan-member") {
        await handleMemberScan(memberId, memberNumber);
      }
    } catch (e) {
      setResult({ success: false, message: e instanceof Error ? e.message : "Terjadi kesalahan" });
      setPhase("result");
      scheduleReset();
    } finally {
      setTimeout(() => setScanEnabled(true), 2000);
    }
  }, [phase, scanEnabled, loading]);

  const { containerId } = useQrScanner(handleScan, phase === "scan-member" || phase === "scan-book");

  // ===== Member scan =====
  async function handleMemberScan(memberId: string, memberNumber: string) {
    setLoading(true);
    try {
      let members: ScannedMember[] = [];
      if (memberId) {
        const detail = await api.get<ScannedMember & { loans: ActiveLoan[] }>(`/api/members/${memberId}`);
        members = [{
          id: detail.id, memberNumber: detail.memberNumber, fullName: detail.fullName,
          category: detail.category, classGrade: detail.classGrade, photo: detail.photo, status: detail.status,
        }];
        setActiveLoans(detail.loans?.filter((l) => l.status === "LOANED" || l.status === "OVERDUE") ?? []);
      } else if (memberNumber) {
        const res = await api.get<ScannedMember[]>(`/api/members?q=${encodeURIComponent(memberNumber)}`);
        members = res.filter((m) => m.memberNumber === memberNumber);
      }

      if (members.length === 0) {
        setResult({ success: false, message: "Anggota tidak ditemukan. Periksa kartu atau coba lagi." });
        setPhase("result");
        scheduleReset();
        return;
      }

      const m = members[0];
      if (m.status !== "ACTIVE") {
        setResult({ success: false, message: "Akun anggota tidak aktif. Hubungi pustakawan." });
        setPhase("result");
        scheduleReset();
        return;
      }

      // Fetch active loans if not already loaded
      if (!memberId || !activeLoans.length) {
        const loansRes = await api.get<ActiveLoan[]>(`/api/loans?memberId=${m.id}`);
        setActiveLoans(loansRes.filter((l) => l.status === "LOANED" || l.status === "OVERDUE"));
      }

      setMember(m);
      setPhase("member-info");
    } catch (e) {
      setResult({ success: false, message: e instanceof Error ? e.message : "Gagal memuat data anggota" });
      setPhase("result");
      scheduleReset();
    } finally {
      setLoading(false);
    }
  }

  // ===== Book scan =====
  async function handleBookScan(itemCode: string) {
    if (!member || !action) return;
    setLoading(true);
    try {
      if (action === "borrow") {
        // Find book item by itemCode
        const books = await api.get<BookSearchResult[]>(`/api/books?q=${encodeURIComponent(itemCode)}`);
        const book = books.find((b) => b.items.some((i) => i.itemCode === itemCode));
        if (!book) {
          setResult({ success: false, message: `Eksemplar dengan kode "${itemCode}" tidak ditemukan.` });
          setPhase("result");
          scheduleReset();
          return;
        }
        const item = book.items.find((i) => i.itemCode === itemCode);
        if (!item) {
          setResult({ success: false, message: "Eksemplar tidak ditemukan." });
          setPhase("result");
          scheduleReset();
          return;
        }
        if (item.status !== "AVAILABLE") {
          const statusLabel: Record<string, string> = {
            BORROWED: "sedang dipinjam orang lain",
            RESERVED: "sedang direservasi",
            DAMAGED: "dalam kondisi rusak",
            LOST: "dilaporkan hilang",
          };
          setResult({ success: false, message: `"${book.title}" ${statusLabel[item.status] ?? "tidak tersedia"}.` });
          setPhase("result");
          scheduleReset();
          return;
        }

        const loan = await api.post<ActiveLoan>("/api/loans", { memberId: member.id, bookItemId: item.id });
        setResult({
          success: true,
          message: `"${book.title}" berhasil dipinjam. Jatuh tempo ${formatDate(loan.dueDate)}.`,
        });
        setPhase("result");
        scheduleReset();
      } else if (action === "return") {
        // Find loan by itemCode
        const loan = activeLoans.find((l) => l.bookItem.itemCode === itemCode);
        if (!loan) {
          setResult({ success: false, message: `Buku dengan kode "${itemCode}" tidak ada di daftar pinjaman anggota ini.` });
          setPhase("result");
          scheduleReset();
          return;
        }

        const res = await api.put<{ loan: ActiveLoan; fine: number }>(`/api/loans/${loan.id}/return`, {});
        const fine = res.fine ?? 0;
        setResult({
          success: true,
          message: fine > 0
            ? `"${loan.bookItem.book.title}" berhasil dikembalikan. Denda keterlambatan: ${formatRupiah(fine)}.`
            : `"${loan.bookItem.book.title}" berhasil dikembalikan. Terima kasih!`,
        });
        setPhase("result");
        scheduleReset();
      }
    } catch (e) {
      setResult({ success: false, message: e instanceof Error ? e.message : "Gagal memproses transaksi" });
      setPhase("result");
      scheduleReset();
    } finally {
      setLoading(false);
    }
  }

  // ===== Auto-reset =====
  function scheduleReset() {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      resetToScanMember();
    }, 5000);
  }

  function resetToScanMember() {
    setPhase("scan-member");
    setMember(null);
    setActiveLoans([]);
    setAction(null);
    setResult(null);
    setManualInput(false);
    setManualValue("");
    setScanEnabled(true);
  }

  // ===== Manual input handler =====
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualValue.trim()) return;
    if (phase === "scan-member") {
      handleMemberScan("", manualValue.trim());
    } else if (phase === "scan-book") {
      handleBookScan(manualValue.trim());
    }
    setManualInput(false);
    setManualValue("");
  }

  // ===== Exit kiosk =====
  async function handleExitKiosk() {
    setExitLoading(true);
    setExitError("");
    try {
      // Verify password by re-login
      await api.post("/api/auth/login", { email: user!.email, password: exitPassword });
      toast.success("Keluar dari Mode Kios");
      setView("circulation");
    } catch (e) {
      console.error("Failed to verify kiosk exit password:", e);
      setExitError("Password salah. Coba lagi.");
    } finally {
      setExitLoading(false);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // ===== Render =====
  const scannerActive = phase === "scan-member" || phase === "scan-book";

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar with exit button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Mode Kios Self-Service — Jendela Ilmu</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => setShowExitDialog(true)}
        >
          <Lock className="h-3.5 w-3.5" />
          Keluar
        </Button>
      </div>

      {/* Main content — centered */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* Phase: Scan Member */}
          {phase === "scan-member" && (
            <div className="text-center space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">Tempelkan Kartu Anggota ke Kamera</h1>
                <p className="text-muted-foreground">Arahkan QR code kartu anggota ke kamera</p>
              </div>

              {/* Scanner container */}
              <div id={containerId} className="mx-auto w-full max-w-sm rounded-xl overflow-hidden border-2 border-primary/30 bg-black aspect-square" />

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi...
                </div>
              )}

              {/* Manual input toggle */}
              <div>
                {!manualInput ? (
                  <Button variant="outline" size="sm" onClick={() => setManualInput(true)}>
                    <Keyboard className="h-4 w-4 mr-2" />
                    Input Manual
                  </Button>
                ) : (
                  <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-xs mx-auto">
                    <Input
                      placeholder="Nomor anggota..."
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      autoFocus
                    />
                    <Button type="submit" size="sm">OK</Button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Phase: Member Info */}
          {phase === "member-info" && member && (
            <div className="space-y-5">
              {/* Member card */}
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xl">
                    {member.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      <span className="font-semibold text-lg truncate">{member.fullName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.memberNumber} · {ROLE_LABELS[member.category] ?? member.category}
                      {member.classGrade ? ` · ${member.classGrade}` : ""}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Active loans */}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Pinjaman Aktif ({activeLoans.length})
                </h3>
                {activeLoans.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {activeLoans.map((loan) => (
                      <div key={loan.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                        <div
                          className="h-10 w-8 shrink-0 rounded"
                          style={{ background: loan.bookItem.book.coverColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{loan.bookItem.book.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Jatuh tempo {formatDate(loan.dueDate)}
                          </div>
                        </div>
                        <Badge className={LOAN_STATUS_COLORS[loan.status] ?? ""} variant="outline">
                          {LOAN_STATUS_LABELS[loan.status] ?? loan.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 text-center bg-muted/50 rounded-lg">
                    Tidak ada pinjaman aktif
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="h-20 text-base"
                  onClick={() => {
                    setAction("borrow");
                    setPhase("scan-book");
                  }}
                >
                  <BookPlus className="h-6 w-6 mr-2" />
                  Pinjam Buku
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-20 text-base"
                  onClick={() => {
                    setAction("return");
                    setPhase("scan-book");
                  }}
                >
                  <BookMinus className="h-6 w-6 mr-2" />
                  Kembalikan Buku
                </Button>
              </div>

              <Button variant="ghost" size="sm" className="w-full" onClick={resetToScanMember}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Selesai — Anggota Berikutnya
              </Button>
            </div>
          )}

          {/* Phase: Scan Book */}
          {phase === "scan-book" && (
            <div className="text-center space-y-6">
              <div>
                <h1 className="text-xl font-bold mb-1">
                  {action === "borrow" ? "Scan Buku untuk Dipinjam" : "Scan Buku untuk Dikembalikan"}
                </h1>
                <p className="text-muted-foreground">Arahkan QR/barcode eksemplar buku ke kamera</p>
              </div>

              <div id={containerId} className="mx-auto w-full max-w-sm rounded-xl overflow-hidden border-2 border-primary/30 bg-black aspect-square" />

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setManualInput(!manualInput)}>
                  <Keyboard className="h-4 w-4 mr-2" />
                  Input Manual
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPhase("member-info")}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Kembali
                </Button>
              </div>

              {manualInput && (
                <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-xs mx-auto">
                  <Input
                    placeholder="Kode eksemplar buku..."
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" size="sm">OK</Button>
                </form>
              )}
            </div>
          )}

          {/* Phase: Result */}
          {phase === "result" && result && (
            <div className="text-center space-y-6 py-12">
              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                  result.success ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                }`}
              >
                {result.success ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">
                  {result.success ? "Berhasil!" : "Gagal"}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">{result.message}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Otomatis kembali ke layar awal dalam 5 detik...
              </p>
              <Button variant="outline" onClick={resetToScanMember}>
                Lanjut — Anggota Berikutnya
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari Mode Kios</AlertDialogTitle>
            <AlertDialogDescription>
              Masukkan password pustakawan untuk keluar dari Mode Kios dan kembali ke halaman Sirkulasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Input
              type="password"
              placeholder="Password pustakawan"
              value={exitPassword}
              onChange={(e) => {
                setExitPassword(e.target.value);
                setExitError("");
              }}
              autoFocus
            />
            {exitError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {exitError}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setExitPassword(""); setExitError(""); }}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={exitLoading || !exitPassword}
              onClick={(e) => {
                e.preventDefault();
                handleExitKiosk();
              }}
            >
              {exitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Keluar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
