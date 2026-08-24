"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface LazyChartProps {
  /**
   * Fungsi yang return import dinamis dari chart component.
   * Dipakai React.lazy() untuk code splitting.
   *
   * @example
   *   importFn={() => import("./trend-area-chart").then(m => m.TrendAreaChart)}
   */
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  /**
   * Props untuk di-pass ke chart component
   */
  componentProps: Record<string, unknown>;
  /**
   * Tinggi container saat loading. Default 256.
   */
  height?: number;
  /**
   * Tampilkan loading spinner atau skeleton? Default spinner.
   */
  loadingVariant?: "spinner" | "skeleton";
  /**
   * Optional className untuk wrapper
   */
  className?: string;
}

/**
 * Lazy-load chart component saat visible di viewport.
 *
 * Performance optimization:
 * - recharts library ~100kb — lazy load untuk hemat initial bundle
 * - IntersectionObserver hanya load saat widget masuk viewport
 * - Setelah loaded, tetap mounted (tidak unmount-remount)
 *
 * Usage:
 * ```tsx
 * <LazyChart
 *   importFn={() => import("./trend-area-chart").then(m => ({ default: m.TrendAreaChart }))}
 *   componentProps={{ data: trendData, title: "Tren" }}
 *   height={256}
 * />
 * ```
 *
 * Catatan: IntersectionObserver butuh browser context. Untuk SSR,
 * komponen akan render fallback dulu lalu lazy load setelah hydration.
 */
export function LazyChart({
  importFn,
  componentProps,
  height = 256,
  loadingVariant = "spinner",
  className,
}: LazyChartProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver — hanya load saat visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Jika IntersectionObserver tidak tersedia (SSR/old browser), langsung load
    if (typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect(); // Load sekali, tidak perlu observe lagi
        }
      },
      { rootMargin: "100px" } // Pre-load sedikit sebelum masuk viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Dynamic import saat visible
  useEffect(() => {
    if (!shouldRender) return;
    let cancelled = false;

    importFn().then((mod) => {
      if (!cancelled) {
        setComponent(() => mod.default);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shouldRender, importFn]);

  return (
    <div ref={containerRef} className={className} style={{ minHeight: height }}>
      {Component ? (
        <Component {...componentProps} />
      ) : (
        <ChartFallback
          height={height}
          variant={loadingVariant}
        />
      )}
    </div>
  );
}

function ChartFallback({
  height,
  variant,
}: {
  height: number;
  variant: "spinner" | "skeleton";
}) {
  if (variant === "skeleton") {
    return (
      <div
        className="w-full rounded-lg bg-muted/30 animate-pulse"
        style={{ height }}
        role="status"
        aria-label="Memuat grafik"
      />
    );
  }
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ height }}
      role="status"
      aria-label="Memuat grafik"
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

/**
 * Helper untuk lazy load banyak chart sekaligus.
 * Berguna untuk CustomizableDashboardView yang render multiple widget.
 */
export function createLazyChartImport<T = unknown>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>
) {
  return importFn;
}

/**
 * Default export untuk konsistensi dengan pattern lain.
 */
export default LazyChart;
