"use client";

import { useEffect } from "react";

/**
 * app/global-error.tsx — Next.js global error boundary.
 * Menangkap error yang tidak tertangkap oleh error.tsx biasa
 * (mis. error di root layout). WAJIB punya <html> dan <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              Terjadi Kesalahan Sistem
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
              Aplikasi mengalami error yang tidak terduga. Silakan muat ulang
              halaman atau hubungi administrator.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
