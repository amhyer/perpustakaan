"use client";

/**
 * Live region untuk announce perubahan ke screen reader.
 *
 * Pakai untuk:
 * - "Sedang memuat..."
 * - "Berhasil disimpan"
 * - "Terjadi kesalahan"
 *
 * Pakai aria-live="polite" agar tidak interupsi screen reader.
 */
interface LiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
  visuallyHidden?: boolean;
}

export function LiveRegion({ message, politeness = "polite", visuallyHidden = true }: LiveRegionProps) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={visuallyHidden ? "sr-only" : ""}
    >
      {message}
    </div>
  );
}
