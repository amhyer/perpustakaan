"use client";

/**
 * RFID Simulator — Web-based virtual RFID reader.
 *
 * Untuk testing tanpa hardware. Mensimulasikan physical reader:
 * - Pilih reader (entrance, exit, circulation desk)
 * - Klik "Tap Card" untuk simulate scan
 * - Pilih UID dari daftar (atau input manual)
 * - Pilih book tag (optional, untuk circulation)
 * - Submit → API call ke /api/rfid/scan
 * - Lihat response: beep pattern, LED color, message
 *
 * Use cases:
 * - Demo ke sekolah tanpa hardware
 * - Development & QA testing
 * - Pustakawan training
 *
 * Display:
 * - LED indicator (Green/Red/Blue/None) yang menyala sesuai response
 * - Beep indicator (animasi + audio optional)
 * - Message text
 * - Event log panel
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Radio,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  BookOpen,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Badge } from "@/components/ui/data-display/badge";
import { cn } from "@/lib/utils";

type ReaderType = "CHECKIN" | "CHECKOUT" | "BOTH" | "EXIT";

interface Reader {
  id: string;
  code: string;
  name: string;
  type: ReaderType;
  isOnline: boolean;
  lastSeenAt: string | null;
  batteryLevel: number | null;
}

interface Card {
  id: string;
  uid: string;
  member: {
    id: string;
    memberNumber: string;
    fullName: string;
    category: string;
  };
}

interface BookTag {
  bookItemId: string;
  tagUid: string;
  title: string;
  itemCode: string;
  status: string;
}

interface ScanResult {
  success: boolean;
  eventType: string;
  status: string;
  message: string;
  member?: { id: string; fullName: string; memberNumber: string; category: string };
  book?: { id: string; title: string; itemCode: string };
  loan?: { id: string; dueDate: string };
  readerResponse: { beep: boolean; led: "GREEN" | "RED" | "BLUE" | "NONE"; duration?: number };
}

export function RFIDSimulator() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [bookTags, setBookTags] = useState<BookTag[]>([]);
  const [selectedReader, setSelectedReader] = useState<string>("");
  const [manualUID, setManualUID] = useState("");
  const [manualBookTag, setManualBookTag] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<Array<ScanResult & { timestamp: string }>>([]);
  const [ledColor, setLedColor] = useState<"GREEN" | "RED" | "BLUE" | "NONE">("NONE");
  const [beepEnabled, setBeepEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load readers, cards, book tags
  useEffect(() => {
    fetch("/api/rfid/readers")
      .then((r) => r.json())
      .then((d) => {
        setReaders(d.items || []);
        if (d.items?.[0]) setSelectedReader(d.items[0].code);
      })
      .catch(() => setReaders([]));

    fetch("/api/rfid/cards")
      .then((r) => r.json())
      .then((d) => setCards(d.items || []))
      .catch(() => setCards([]));

    fetch("/api/rfid/book-tags")
      .then((r) => r.json())
      .then((d) => setBookTags(d.items || []))
      .catch(() => setBookTags([]));
  }, []);

  // Initialize AudioContext for beep
  useEffect(() => {
    if (typeof window !== "undefined" && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Failed to initialize AudioContext:", e);
      }
    }
  }, []);

  // Play beep
  const playBeep = useCallback(
    (success: boolean, duration: number = 200) => {
      if (!beepEnabled || !audioContextRef.current) return;
      try {
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = success ? 1000 : 400; // higher = success
        oscillator.type = "sine";
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration / 1000);
      } catch (e) {
        console.error("Failed to play beep sound:", e);
      }
    },
    [beepEnabled]
  );

  // Animate LED + beep from response
  const animateResponse = useCallback(
    (result: ScanResult) => {
      const { led, beep, duration = 200 } = result.readerResponse;
      setLedColor(led);
      if (beep) playBeep(result.status === "OK", duration);
      setTimeout(() => setLedColor("NONE"), Math.max(duration, 500));
    },
    [playBeep]
  );

  // Simulate tap
  const simulateTap = useCallback(
    async (uid: string, bookTagUid?: string) => {
      if (!selectedReader) {
        toast.error("Pilih reader dulu");
        return;
      }
      if (!uid) {
        toast.error("Pilih kartu atau input UID manual");
        return;
      }

      setIsScanning(true);
      setCurrentResult(null);

      try {
        const res = await fetch("/api/rfid/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            readerCode: selectedReader,
            uid,
            bookTagUid: bookTagUid || undefined,
            scannedAt: new Date().toISOString(),
          }),
        });
        const data: ScanResult = await res.json();
        setCurrentResult(data);
        animateResponse(data);
        setHistory((prev) =>
          [{ ...data, timestamp: new Date().toISOString() }, ...prev].slice(0, 20)
        );
      } catch (err) {
        setCurrentResult({
          success: false,
          eventType: "ERROR",
          status: "ERROR",
          message: "Gagal mengirim scan ke server",
          readerResponse: { beep: true, led: "RED", duration: 500 },
        });
      } finally {
        setIsScanning(false);
      }
    },
    [selectedReader, animateResponse]
  );

  const handleManualTap = () => {
    simulateTap(manualUID, manualBookTag || undefined);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Reader + Card selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-5 w-5" />
            RFID Reader Simulator
            <Badge variant="outline" className="ml-auto text-xs">Virtual</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Simulasikan tap kartu RFID untuk testing tanpa hardware
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reader selection */}
          <div className="space-y-2">
            <Label className="text-sm">Reader</Label>
            <div className="grid grid-cols-1 gap-2">
              {readers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  Belum ada reader terdaftar. Tambahkan di Manajemen Reader.
                </p>
              ) : (
                readers.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => setSelectedReader(r.code)}
                    className={cn(
                      "p-3 border rounded-lg text-left transition-all",
                      selectedReader === r.code
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.code} · {r.type}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-3 w-3 rounded-full",
                          r.isOnline ? "bg-green-500" : "bg-gray-300"
                        )}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* LED Visual + Beep indicator */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-lg">
            <ReaderLED color={ledColor} />
            <div className="text-xs">
              <div className="font-medium">
                {ledColor === "GREEN" && "✓ Akses Diterima"}
                {ledColor === "RED" && "✗ Ditolak"}
                {ledColor === "BLUE" && "● Info"}
                {ledColor === "NONE" && "● Standby"}
              </div>
              <div className="text-muted-foreground">Status Reader</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setBeepEnabled(!beepEnabled)}
              title={beepEnabled ? "Matikan bunyi" : "Nyalakan bunyi"}
            >
              {beepEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Quick tap - member cards */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <User className="h-3 w-3" />
              Tap Kartu Member ({cards.length})
            </Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {cards.length === 0 ? (
                <p className="text-xs text-muted-foreground col-span-2 p-2 bg-muted rounded">
                  Belum ada kartu terdaftar
                </p>
              ) : (
                cards.slice(0, 12).map((card) => (
                  <button
                    key={card.id}
                    onClick={() => simulateTap(card.uid)}
                    disabled={isScanning}
                    className="p-2 border rounded text-left text-xs hover:border-primary/50 disabled:opacity-50"
                  >
                    <div className="font-medium truncate">{card.member.fullName}</div>
                    <div className="text-muted-foreground font-mono">{card.uid}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Manual input */}
          <div className="space-y-2 border-t pt-3">
            <Label className="text-sm">Input Manual (UID & Book Tag)</Label>
            <div className="space-y-2">
              <Input
                value={manualUID}
                onChange={(e) => setManualUID(e.target.value)}
                placeholder="Card UID (e.g., A1:B2:C3:D4)"
                className="font-mono text-xs"
              />
              <Input
                value={manualBookTag}
                onChange={(e) => setManualBookTag(e.target.value)}
                placeholder="Book tag UID (optional)"
                className="font-mono text-xs"
              />
              <Button
                onClick={handleManualTap}
                disabled={isScanning || !manualUID}
                className="w-full"
                size="sm"
              >
                {isScanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Tap Manual
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: Result + History */}
      <div className="space-y-4">
        {/* Current Result */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {currentResult?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : currentResult ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              )}
              Hasil Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!currentResult ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada scan. Tap kartu untuk mulai.
              </p>
            ) : (
              <div className="space-y-3">
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    currentResult.success
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-medium",
                      currentResult.success ? "text-green-800" : "text-red-800"
                    )}
                  >
                    {currentResult.message}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Event Type</div>
                    <Badge variant="outline">{currentResult.eventType}</Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <Badge
                      variant={currentResult.status === "OK" ? "default" : "destructive"}
                    >
                      {currentResult.status}
                    </Badge>
                  </div>
                </div>
                {currentResult.member && (
                  <div className="text-xs space-y-1 border-t pt-2">
                    <div className="text-muted-foreground">Member</div>
                    <div className="font-medium">{currentResult.member.fullName}</div>
                    <div className="text-muted-foreground">
                      {currentResult.member.memberNumber} · {currentResult.member.category}
                    </div>
                  </div>
                )}
                {currentResult.book && (
                  <div className="text-xs space-y-1 border-t pt-2">
                    <div className="text-muted-foreground">Buku</div>
                    <div className="font-medium">{currentResult.book.title}</div>
                    <div className="text-muted-foreground font-mono">
                      {currentResult.book.itemCode}
                    </div>
                  </div>
                )}
                {currentResult.loan && (
                  <div className="text-xs space-y-1 border-t pt-2">
                    <div className="text-muted-foreground">Loan</div>
                    <div className="font-medium text-green-700">
                      Jatuh tempo:{" "}
                      {new Date(currentResult.loan.dueDate).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5" />
              History ({history.length})
              {history.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setHistory([])}
                  className="ml-auto h-7"
                >
                  <RefreshCw className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada history scan
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 border rounded text-xs",
                      h.success ? "bg-green-50/30" : "bg-red-50/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {h.success ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600 shrink-0" />
                        )}
                        <span className="font-medium truncate">{h.message}</span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(h.timestamp).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 text-[10px]">
                      {h.eventType} · {h.member?.fullName || h.book?.title || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReaderLED({ color }: { color: "GREEN" | "RED" | "BLUE" | "NONE" }) {
  const colorMap: Record<string, string> = {
    GREEN: "bg-green-500 shadow-green-500/50",
    RED: "bg-red-500 shadow-red-500/50",
    BLUE: "bg-blue-500 shadow-blue-500/50",
    NONE: "bg-gray-300",
  };
  return (
    <div
      className={cn(
        "h-12 w-12 rounded-full transition-all duration-200",
        color === "NONE" ? "" : cn(colorMap[color], "shadow-lg scale-110"),
        "border-2 border-gray-400"
      )}
    />
  );
}
