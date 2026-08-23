"use client";

/**
 * ISBN Scanner — Computer vision scanner for ISBN barcodes.
 *
 * Use camera on device to scan book barcodes (ISBN-10 or ISBN-13).
 * Once scanned, automatically lookup book data via OpenLibrary/Google Books
 * and show preview before adding to catalog.
 *
 * Features:
 * - Camera-based barcode scanning (uses html5-qrcode)
 * - Manual ISBN input as fallback
 * - Auto-lookup via /api/rewards/lookup (existing endpoint) atau dedicated /api/isbn
 * - Preview of book data before adding
 * - Duplicate detection (warns if ISBN already in catalog)
 * - Manual entry form if not found online
 * - Camera permission handling
 * - Mobile-optimized (back camera preference)
 *
 * Architecture:
 * - Client-side scanning (no server CV needed)
 * - Server lookup via existing ISBN APIs
 * - Camera lifecycle management (stop on unmount)
 *
 * Browser support:
 * - Chrome/Edge: full camera support
 * - Safari iOS 14+: camera support
 * - Firefox: limited (may need HTTPS for camera)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  X,
  Loader2,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyboardIcon,
  Sparkles,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { cn } from "@/lib/utils";
import { useIsbnScanner, type ScannedISBN } from "@/hooks/use-isbn-scanner";

interface ISBNData {
  title: string;
  authors: string[];
  publisher?: string;
  year?: string;
  description?: string;
  categories?: string[];
  isbn: string;
  coverUrl?: string;
  pages?: number;
  language?: string;
}

interface ISBNScannerProps {
  /** Called when book data is found */
  onFound?: (data: ISBNData) => void;
  /** Called when ISBN is duplicate */
  onDuplicate?: (existingBook: { id: string; title: string }) => void;
  /** Called when not found online */
  onNotFound?: (isbn: string) => void;
  /** Show in modal or inline */
  variant?: "inline" | "modal";
  className?: string;
}

export function ISBNScanner({
  onFound,
  onDuplicate,
  onNotFound,
  variant = "inline",
  className,
}: ISBNScannerProps) {
  const [mode, setMode] = useState<"camera" | "manual">("manual");
  const [manualISBN, setManualISBN] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ISBNData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);
  const [lastScannedISBN, setLastScannedISBN] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const {
    containerId,
    isScanning,
    isSupported,
    error: scannerError,
    start,
    stop,
    requestPermission,
  } = useIsbnScanner({
    onScan: (data) => {
      handleISBNDetected(data);
    },
    active: mode === "camera",
  });

  // Reset result when mode changes
  useEffect(() => {
    if (mode === "manual") {
      stop();
    }
    setError(null);
  }, [mode, stop]);

  // Lookup ISBN via API
  const lookupISBN = useCallback(async (isbn: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setDuplicate(null);
    setLastScannedISBN(isbn);

    try {
      const res = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(isbn)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.status === "DUPLICATE" && data.book) {
          setDuplicate({ id: data.book.id, title: data.book.title });
          onDuplicate?.(data.book);
          return;
        }
        if (data.status === "NOT_FOUND") {
          onNotFound?.(isbn);
          return;
        }
        throw new Error(data.message || "Lookup failed");
      }
      const data = await res.json();

      // Normalize response
      const normalized: ISBNData = {
        title: data.title,
        authors: data.authors || [],
        publisher: data.publisher,
        year: data.publishedYear,
        description: data.description,
        categories: data.categories,
        isbn,
        coverUrl: data.coverImageUrl,
        pages: data.pages,
        language: data.language,
      };
      setResult(normalized);
      onFound?.(normalized);

      // Auto-scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal lookup ISBN");
    } finally {
      setIsLoading(false);
    }
  }, [onFound, onDuplicate, onNotFound]);

  const handleISBNDetected = useCallback((data: ScannedISBN) => {
    // Validate ISBN format
    if (!isValidISBN(data.isbn)) {
      setError(`Barcode terdeteksi "${data.isbn}" bukan ISBN yang valid`);
      return;
    }
    // Stop scanning after first detection
    stop();
    lookupISBN(data.isbn);
  }, [lookupISBN, stop]);

  const handleManualLookup = useCallback(() => {
    const isbn = manualISBN.replace(/[-\s]/g, "").trim();
    if (!isbn) {
      setError("Masukkan ISBN terlebih dahulu");
      return;
    }
    if (!isValidISBN(isbn)) {
      setError("Format ISBN tidak valid (10 atau 13 digit)");
      return;
    }
    lookupISBN(isbn);
  }, [manualISBN, lookupISBN]);

  const handleStartCamera = useCallback(async () => {
    setError(null);
    setResult(null);
    setDuplicate(null);
    const granted = await requestPermission();
    if (granted) {
      setMode("camera");
      setTimeout(() => start(), 100);
    } else {
      setError("Izin kamera ditolak. Gunakan input manual.");
    }
  }, [requestPermission, start]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setDuplicate(null);
    setManualISBN("");
    setLastScannedISBN(null);
  }, []);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-5 w-5" />
          Scan ISBN
          <Badge variant="outline" className="ml-auto text-xs">AI Vision</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Scan barcode ISBN di belakang buku untuk lookup otomatis via OpenLibrary / Google Books
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setMode("manual")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              mode === "manual"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <KeyboardIcon className="inline h-4 w-4 mr-1" />
            Input Manual
          </button>
          <button
            onClick={handleStartCamera}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              mode === "camera"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="inline h-4 w-4 mr-1" />
            Scan Kamera
          </button>
        </div>

        {/* Manual mode */}
        {mode === "manual" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="isbn-input" className="text-sm">
                ISBN (10 atau 13 digit)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="isbn-input"
                  value={manualISBN}
                  onChange={(e) => setManualISBN(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleManualLookup();
                  }}
                  placeholder="978-0-123-45678-9"
                  disabled={isLoading}
                  className="flex-1 font-mono"
                />
                <Button onClick={handleManualLookup} disabled={isLoading || !manualISBN}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Lookup
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: 10 atau 13 digit angka, dengan atau tanpa strip
              </p>
            </div>
          </div>
        )}

        {/* Camera mode */}
        {mode === "camera" && (
          <div className="space-y-3">
            {!isSupported ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                Kamera tidak didukung di browser ini. Gunakan input manual.
              </div>
            ) : (
              <>
                <div
                  id={containerId}
                  className="rounded-lg overflow-hidden border bg-black aspect-video max-h-[300px]"
                />
                {isScanning && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Arahkan kamera ke barcode ISBN di belakang buku
                  </div>
                )}
                {scannerError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {scannerError}
                  </div>
                )}
                <Button variant="outline" onClick={stop} className="w-full">
                  <X className="h-4 w-4 mr-1" />
                  Hentikan Scan
                </Button>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Duplicate */}
        {duplicate && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-medium">
              <AlertTriangle className="h-5 w-5" />
              ISBN Sudah Ada di Katalog
            </div>
            <p className="text-sm text-amber-700">
              Buku dengan ISBN <code className="px-1 bg-amber-100 rounded font-mono">{lastScannedISBN}</code> sudah ada:
            </p>
            <p className="text-sm font-medium">{duplicate.title}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicate?.(duplicate)}
            >
              Lihat Buku
            </Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div ref={resultRef} className="border rounded-lg overflow-hidden">
            <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Buku Ditemukan
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Scan Ulang
              </button>
            </div>
            <div className="flex gap-4 p-4">
              {/* Cover */}
              <div className="shrink-0">
                {result.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.coverUrl}
                    alt={result.title}
                    className="w-24 h-32 object-cover rounded shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-24 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-primary/40" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-semibold text-sm line-clamp-2">{result.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {result.authors.length > 0 ? result.authors.join(", ") : "Unknown author"}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.publisher && (
                    <Badge variant="outline" className="text-[10px]">
                      {result.publisher}
                    </Badge>
                  )}
                  {result.year && (
                    <Badge variant="outline" className="text-[10px]">
                      {result.year}
                    </Badge>
                  )}
                  {result.pages && (
                    <Badge variant="outline" className="text-[10px]">
                      {result.pages} hal
                    </Badge>
                  )}
                  {result.language && (
                    <Badge variant="outline" className="text-[10px]">
                      {result.language}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  ISBN: <code className="px-1 bg-muted rounded font-mono">{result.isbn}</code>
                </div>
                {result.categories && result.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.categories.slice(0, 3).map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-[10px]">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
                {result.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                    {result.description}
                  </p>
                )}
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => onFound?.(result)}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Tambah ke Katalog
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Helper Functions =====

/**
 * Validate ISBN-10 or ISBN-13 format and checksum.
 */
export function isValidISBN(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, "");

  if (cleaned.length === 10) {
    return isValidISBN10(cleaned);
  }
  if (cleaned.length === 13) {
    return isValidISBN13(cleaned);
  }
  return false;
}

function isValidISBN10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn[i], 10) * (10 - i);
  }
  const checkDigit = isbn[9] === "X" ? 10 : parseInt(isbn[9], 10);
  sum += checkDigit;
  return sum % 11 === 0;
}

function isValidISBN13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(isbn[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

/**
 * Convert ISBN-10 to ISBN-13.
 */
export function isbn10To13(isbn10: string): string {
  const cleaned = isbn10.replace(/[-\s]/g, "");
  if (cleaned.length !== 10) return isbn10;
  const base = "978" + cleaned.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

/**
 * Format ISBN with hyphens for display.
 */
export function formatISBN(isbn: string): string {
  const cleaned = isbn.replace(/[-\s]/g, "");
  if (cleaned.length === 13) {
    // 978-0-306-40615-7 (ISBN-13 standard, 3-1-3-5-1)
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7, 12)}-${cleaned.slice(12, 13)}`;
  }
  if (cleaned.length === 10) {
    // 0-3064-0615-2 (ISBN-10, 1-4-4-1)
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9, 10)}`;
  }
  return isbn;
}
