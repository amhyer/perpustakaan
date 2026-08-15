"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/form/button";

/**
 * app/error.tsx — Next.js error boundary untuk route segments.
 * Menangkap error di level halaman (server component errors dll).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-xl border bg-card p-8 text-center space-y-4">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Terjadi Kesalahan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Halaman tidak dapat dimuat. Coba muat ulang atau kembali ke beranda.
          </p>
        </div>
        {error?.message && (
          <details className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 text-left">
            <summary className="cursor-pointer font-medium">Detail error</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all">{error.message}</pre>
          </details>
        )}
        <div className="flex items-center justify-center gap-2">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")} className="gap-2">
            <Home className="h-4 w-4" />
            Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
