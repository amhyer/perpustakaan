"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error";

export default function GlobalError({
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
      type: "global-error",
    });
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backgroundColor: "#f5f1e8",
            color: "#2d2d2d",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              textAlign: "center",
              background: "#fff",
              padding: "32px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>😵</div>
            <h1 style={{ fontSize: "24px", margin: "0 0 12px 0", color: "#a04040" }}>
              Terjadi Kesalahan
            </h1>
            <p style={{ margin: "0 0 24px 0", color: "#666" }}>
              Aplikasi mengalami masalah tak terduga. Tim teknis telah dinotifikasi.
            </p>
            {error.digest && (
              <p style={{ fontSize: "12px", color: "#999", marginBottom: "24px", fontFamily: "monospace" }}>
                ID Error: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: "#1e3a5f",
                color: "#fff",
                border: "none",
                padding: "12px 32px",
                borderRadius: "6px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
