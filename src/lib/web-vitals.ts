/**
 * Web Vitals tracking — monitor Core Web Vitals real-time.
 *
 * Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint) — loading performance
 * - FID (First Input Delay) — interactivity (now INP)
 * - CLS (Cumulative Layout Shift) — visual stability
 * - FCP (First Contentful Paint) — first paint
 * - TTFB (Time to First Byte) — server response time
 *
 * Reports ke endpoint /api/analytics/vitals untuk aggregation.
 * Bisa juga di-export ke Google Analytics / Plausible.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

const ANALYTICS_ENDPOINT = "/api/analytics/vitals";

function sendMetric(metric: Metric) {
  // Body yang dikirim
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // "good" | "needs-improvement" | "poor"
    id: metric.id,
    navigationType: metric.navigationType,
    // Tambah context
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  // Pakai sendBeacon kalau available (lebih reliable saat page unload)
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
  } else if (typeof fetch !== "undefined") {
    // Fallback ke fetch
    fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true, // keep request alive saat page unload
    }).catch(() => {
      // Silent fail — analytics tidak boleh break app
    });
  }
}

/**
 * Initialize web vitals tracking.
 * Call sekali di app start (mis. di root layout atau _app).
 */
export function initWebVitals() {
  if (typeof window === "undefined") return;
  onCLS(sendMetric);
  onFCP(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onTTFB(sendMetric);
}

/**
 * Helper untuk threshold manual (untuk testing)
 */
export const VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // ms
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Format metric value untuk display
 */
export function formatMetricValue(name: string, value: number): string {
  switch (name) {
    case "CLS":
      return value.toFixed(3);
    case "LCP":
    case "FCP":
    case "TTFB":
    case "INP":
    case "FID":
      return `${Math.round(value)}ms`;
    default:
      return String(value);
  }
}
