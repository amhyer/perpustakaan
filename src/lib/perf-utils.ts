/**
 * Performance Utilities — Bundle optimization helpers.
 *
 * Sprint J Phase D - Performance hardening.
 *
 * Provides:
 * - Debounce / Throttle
 * - Memo helpers
 * - Lazy load with timeout
 * - Performance marks
 * - Resource hints (preconnect, prefetch)
 * - Image loading helpers
 */

// ===== Debounce =====

/**
 * Debounce a function (delay execution until N ms after last call).
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ===== Throttle =====

/**
 * Throttle a function (limit to one call per N ms).
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ===== Lazy Load with Timeout =====

/**
 * Lazy load a component with timeout fallback.
 * If load takes > timeout, returns null (so you can show fallback).
 */
export function lazyWithTimeout<T>(
  importFn: () => Promise<{ default: T }>,
  timeoutMs: number = 5000
): Promise<{ default: T } | null> {
  return Promise.race([
    importFn(),
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Lazy load timeout")), timeoutMs)
    ),
  ]).catch(() => null);
}

// ===== Performance Marks =====

/**
 * Mark a performance timing point.
 * Use in development to track slow operations.
 */
export function perfMark(name: string): void {
  if (typeof performance !== "undefined" && performance.mark) {
    try {
      performance.mark(name);
    } catch (e) {
      console.warn("[perf-utils] Gagal buat performance mark:", e);
    }
  }
}

/**
 * Measure between two marks.
 * Returns duration in ms.
 */
export function perfMeasure(
  startMark: string,
  endMark: string,
  measureName?: string
): number {
  if (typeof performance === "undefined" || !performance.measure) return 0;
  try {
    const measure = performance.measure(measureName || `${startMark}-${endMark}`, startMark, endMark);
    return measure.duration;
  } catch {
    return 0;
  }
}

/**
 * Time a function execution.
 * Returns the result and the duration in ms.
 */
export async function timeAsync<T>(
  fn: () => Promise<T>,
  name?: string
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, duration: Date.now() - start };
}

// ===== Resource Hints =====

/**
 * Add preconnect hint to external domain.
 * Use untuk fonts, CDN, etc.
 */
export function preconnect(url: string): void {
  if (typeof document === "undefined") return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = url;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/**
 * Add prefetch hint for next-page resources.
 */
export function prefetch(url: string): void {
  if (typeof document === "undefined") return;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Add dns-prefetch hint.
 */
export function dnsPrefetch(url: string): void {
  if (typeof document === "undefined") return;
  const link = document.createElement("link");
  link.rel = "dns-prefetch";
  link.href = url;
  document.head.appendChild(link);
}

// ===== Image Loading =====

/**
 * Generate srcset untuk responsive images.
 * Helps browser pick appropriate size.
 */
export function buildSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  if (!baseUrl) return "";
  return widths
    .map((w) => {
      // Assume URL supports ?w= param (Cloudinary, Next.js Image, etc)
      const url = new URL(baseUrl, "http://x");
      url.searchParams.set("w", String(w));
      return `${url.toString().replace("http://x", "")} ${w}w`;
    })
    .join(", ");
}

/**
 * Sizes attribute untuk responsive images.
 */
export function buildSizes(breakpoints: Array<[string, string]> = [
  ["640px", "100vw"],
  ["1024px", "50vw"],
  ["1280px", "33vw"],
]): string {
  return breakpoints
    .map(([media, size]) => `(max-width: ${media}) ${size}`)
    .join(", ");
}

// ===== Intersection-based Lazy Loading =====

/**
 * Use IntersectionObserver to detect when element enters viewport.
 * Returns a ref to attach + a boolean for visibility.
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): { ref: (el: Element | null) => void; isVisible: boolean } {
  // This is a placeholder - real implementation would use useEffect + ref
  // Kept here for documentation purposes
  return { ref: () => {}, isVisible: false };
}

// ===== Memory Management =====

/**
 * Get current memory usage info (Chrome only).
 */
export function getMemoryInfo(): {
  used: number;
  total: number;
  limit: number;
} | null {
  if (typeof performance === "undefined") return null;
  const memory = (performance as any).memory;
  if (!memory) return null;
  return {
    used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
    total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
    limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
  };
}

// ===== Bundle Size Helpers =====

/**
 * Estimate size of object/array (for analytics).
 */
export function estimateSize(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return value.length * 2; // UTF-16
  if (typeof value === "number") return 8;
  if (typeof value === "boolean") return 4;
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + estimateSize(item), 16); // array overhead
  }
  if (typeof value === "object") {
    return Object.entries(value).reduce(
      (sum, [k, v]) => sum + k.length * 2 + estimateSize(v),
      16 // object overhead
    );
  }
  return 0;
}

/**
 * Format bytes to human readable.
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
