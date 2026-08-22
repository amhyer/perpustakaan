"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  X,
  RotateCw,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { Skeleton } from "@/components/app/shared/skeleton";
import { toast } from "sonner";

interface PdfViewerProps {
  url: string;
  fileName?: string;
  watermark?: string;
  onClose?: () => void;
  onDownload?: () => void;
  allowDownload?: boolean;
  allowPrint?: boolean;
  className?: string;
}

/**
 * PDF Viewer component (PDF.js).
 *
 * Features:
 * - Page navigation (prev/next + input)
 * - Zoom in/out + fit-to-width
 * - Rotate page
 * - Fullscreen mode
 * - Optional watermark with user name (anti-piracy)
 * - Download/print restrictions
 * - Loading & error states
 */
export function PdfViewer({
  url,
  fileName = "document.pdf",
  watermark,
  onClose,
  onDownload,
  allowDownload = true,
  allowPrint = true,
  className,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("1");

  // Load PDF.js dynamically (client-side only)
  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);

        // Dynamic import untuk avoid SSR issues
        const pdfjsLib = await import("pdfjs-dist");
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;

        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("PDF load error:", err);
        setError(err instanceof Error ? err.message : "Gagal memuat PDF");
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [url]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale, rotation });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Set canvas dimensions
      const devicePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      canvas.width = viewport.width * devicePixelRatio;
      canvas.height = viewport.height * devicePixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.scale(devicePixelRatio, devicePixelRatio);

      const renderContext = {
        canvasContext: context,
        viewport,
        canvas,
      };

      // Cancel previous render
      // @ts-ignore
      if (canvas._pdfRenderTask) {
        // @ts-ignore
        canvas._pdfRenderTask.cancel();
      }

      const task = page.render(renderContext);
      // @ts-ignore
      canvas._pdfRenderTask = task;
      await task.promise;
    } catch (err) {
      if (err instanceof Error && err.name === "RenderingCancelledException") return;
      console.error("Render error:", err);
      toast.error("Gagal render halaman");
    }
  }, [pdfDoc, currentPage, scale, rotation]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!pdfDoc) return;
      // Ignore jika di input field
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentPage(totalPages);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pdfDoc, totalPages, isFullscreen]);

  // Fullscreen API
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const goNext = () => {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      setPageInput(String(next));
    }
  };

  const goPrev = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      setPageInput(String(prev));
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput(String(page));
    }
  };

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));
  const resetZoom = () => {
    setScale(1.2);
    setRotation(0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handlePrint = () => {
    if (!allowPrint) {
      toast.error("Print tidak diizinkan");
      return;
    }
    window.print();
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-zinc-900 text-white ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-1">
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm" className="text-white hover:bg-zinc-800 gap-1">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Tutup</span>
            </Button>
          )}
          <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Page nav */}
          <Button
            onClick={goPrev}
            disabled={currentPage <= 1}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => {
                const page = parseInt(pageInput);
                if (!isNaN(page)) goToPage(page);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const page = parseInt(pageInput);
                  if (!isNaN(page)) goToPage(page);
                }
              }}
              className="w-12 bg-zinc-800 text-white text-sm text-center rounded px-1 py-1 border border-zinc-700 focus:border-primary focus:outline-none"
            />
            <span className="text-xs text-zinc-400">/ {totalPages || "?"}</span>
          </div>

          <Button
            onClick={goNext}
            disabled={currentPage >= totalPages}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom */}
          <Button onClick={zoomOut} variant="ghost" size="icon" className="text-white hover:bg-zinc-800" title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-zinc-400 w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button onClick={zoomIn} variant="ghost" size="icon" className="text-white hover:bg-zinc-800" title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button onClick={() => setRotation((r) => (r + 90) % 360)} variant="ghost" size="icon" className="text-white hover:bg-zinc-800" title="Rotate">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button onClick={resetZoom} variant="ghost" size="sm" className="text-white hover:bg-zinc-800 text-xs">
            Reset
          </Button>

          {/* Print & download */}
          {allowPrint && (
            <Button onClick={handlePrint} variant="ghost" size="icon" className="text-white hover:bg-zinc-800" title="Print">
              <Printer className="h-4 w-4" />
            </Button>
          )}
          {allowDownload && onDownload && (
            <Button onClick={onDownload} variant="ghost" size="icon" className="text-white hover:bg-zinc-800" title="Download">
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="text-white hover:bg-zinc-800" title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-zinc-800">
        {loading && (
          <div className="flex flex-col items-center justify-center w-full max-w-2xl py-12 gap-4">
            <Skeleton className="h-96 w-full bg-zinc-700" />
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat dokumen...
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center w-full max-w-md py-12 gap-3 text-center">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <h3 className="text-lg font-semibold">Gagal Memuat PDF</h3>
            <p className="text-sm text-zinc-400">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="gap-2 mt-2 text-white border-zinc-700">
              Coba Lagi
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="relative inline-block shadow-2xl">
            <canvas ref={canvasRef} className="bg-white" />
            {watermark && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className="text-zinc-300/40 text-2xl font-bold rotate-[-30deg] select-none"
                  style={{ textShadow: "0 0 2px rgba(0,0,0,0.1)" }}
                >
                  {watermark}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      {!loading && !error && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-400">
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
          <span className="hidden sm:inline">
            Tekan ←/→ untuk navigasi · +/- untuk zoom · Esc untuk keluar fullscreen
          </span>
        </div>
      )}
    </div>
  );
}
