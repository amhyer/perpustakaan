"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent } from "@/components/ui/layout/card";
import { reportClientError } from "@/lib/client-error";

/**
 * Error boundary untuk App Router.
 * Ditampilkan saat terjadi error di page component.
 *
 * Catatan: harus "use client" karena pakai event handler & useEffect.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-report error ke server
    reportClientError(error, {
      digest: error.digest,
      type: "app-router-error",
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="text-sm text-muted-foreground mb-1">
            {error.message || "Error tidak diketahui"}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mb-6 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Beranda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
