/**
 * Client-side error reporting — kirim error dari browser ke /api/error-log/client.
 *
 * Dipakai oleh ErrorBoundary dan global-error.tsx untuk capture error React.
 */

export async function reportClientError(
  error: Error,
  context?: Record<string, any>
): Promise<void> {
  try {
    await fetch("/api/error-log/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context: {
          ...context,
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      }),
    });
  } catch (e) {
    console.error("[client-error] Gagal kirim error report:", e);
  }
}
