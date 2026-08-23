/**
 * Performance Monitor — Track route & API performance.
 *
 * Sprint H - Production Readiness.
 *
 * Monitor:
 * - API route response times
 * - Database query times
 * - Slow request detection
 * - Memory usage (RSS, heap)
 * - Request rate
 * - Error rate per route
 *
 * Aggregates metrics per route, exposes via /api/admin/metrics endpoint
 * (librarian only) untuk monitoring production.
 *
 * Lightweight in-memory store (Redis-ready untuk multi-instance).
 */

import { logger } from "@/lib/logger";

// ===== Types =====

export interface RouteMetrics {
  route: string;
  method: string;
  requestCount: number;
  errorCount: number;
  totalDurationMs: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
  lastRequestAt: number;
  errorRate: number; // 0-1
  recentDurations: number[]; // last 100 for percentile
}

export interface SystemMetrics {
  uptime: number; // seconds
  requestRate: number; // req/sec
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  slowRoutes: Array<{ route: string; avgMs: number }>;
  topRoutes: Array<{ route: string; count: number }>;
  memory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
  };
  timestamp: string;
}

// ===== Constants =====

const MAX_RECENT_DURATIONS = 100;
const SLOW_REQUEST_THRESHOLD_MS = 1000;
const VERY_SLOW_THRESHOLD_MS = 3000;
const MAX_ROUTES = 200; // prevent unbounded growth

// ===== In-Memory Store =====

const startTime = Date.now();
const routeMetrics = new Map<string, RouteMetrics>();
const globalDurations: number[] = [];
let totalRequests = 0;
let totalErrors = 0;
let lastRequestTimestamp = 0;

// ===== Public API =====

/**
 * Record a request to a route. Returns duration for caller to log.
 */
export function recordRequest(
  route: string,
  method: string,
  durationMs: number,
  isError: boolean = false
): void {
  totalRequests++;
  lastRequestTimestamp = Date.now();
  if (isError) totalErrors++;

  // Update global durations
  globalDurations.push(durationMs);
  if (globalDurations.length > MAX_RECENT_DURATIONS * 2) {
    globalDurations.shift();
  }

  // Per-route metrics
  const key = `${method}:${normalizeRoute(route)}`;
  let m = routeMetrics.get(key);

  if (!m) {
    if (routeMetrics.size >= MAX_ROUTES) {
      // Evict oldest route (LRU-ish)
      const oldestKey = Array.from(routeMetrics.entries())
        .sort(([, a], [, b]) => a.lastRequestAt - b.lastRequestAt)[0]?.[0];
      if (oldestKey) routeMetrics.delete(oldestKey);
    }
    m = {
      route: normalizeRoute(route),
      method,
      requestCount: 0,
      errorCount: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      p50DurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      maxDurationMs: 0,
      minDurationMs: Infinity,
      lastRequestAt: 0,
      errorRate: 0,
      recentDurations: [],
    };
    routeMetrics.set(key, m);
  }

  m.requestCount++;
  m.totalDurationMs += durationMs;
  m.avgDurationMs = m.totalDurationMs / m.requestCount;
  m.maxDurationMs = Math.max(m.maxDurationMs, durationMs);
  m.minDurationMs = Math.min(m.minDurationMs, durationMs);
  m.lastRequestAt = Date.now();
  if (isError) m.errorCount++;
  m.errorRate = m.errorCount / m.requestCount;

  m.recentDurations.push(durationMs);
  if (m.recentDurations.length > MAX_RECENT_DURATIONS) {
    m.recentDurations.shift();
  }

  // Calculate percentiles from recent durations
  const p = calculatePercentiles(m.recentDurations);
  m.p50DurationMs = p.p50;
  m.p95DurationMs = p.p95;
  m.p99DurationMs = p.p99;

  // Log slow requests
  if (durationMs > VERY_SLOW_THRESHOLD_MS) {
    logger.warn("Very slow request", {
      route: m.route,
      method,
      durationMs,
      threshold: VERY_SLOW_THRESHOLD_MS,
    });
  } else if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
    logger.info("Slow request", {
      route: m.route,
      method,
      durationMs,
    });
  }
}

/**
 * Get metrics for a specific route.
 */
export function getRouteMetrics(
  route: string,
  method?: string
): RouteMetrics | null {
  if (method) {
    return routeMetrics.get(`${method}:${normalizeRoute(route)}`) || null;
  }
  // Find first matching route regardless of method
  for (const [key, value] of routeMetrics.entries()) {
    if (value.route === normalizeRoute(route)) {
      return value;
    }
  }
  return null;
}

/**
 * Get all route metrics.
 */
export function getAllRouteMetrics(): RouteMetrics[] {
  return Array.from(routeMetrics.values()).sort(
    (a, b) => b.requestCount - a.requestCount
  );
}

/**
 * Get system-wide metrics summary.
 */
export function getSystemMetrics(): SystemMetrics {
  const mem = process.memoryUsage();
  const memMB = {
    rssMB: Math.round(mem.rss / 1024 / 1024),
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    externalMB: Math.round(mem.external / 1024 / 1024),
  };

  const uptimeSec = (Date.now() - startTime) / 1000;
  const requestRate =
    uptimeSec > 0 ? totalRequests / uptimeSec : 0;
  const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

  // Global percentiles
  const globalP = calculatePercentiles(globalDurations);

  // Top slow routes
  const allRoutes = getAllRouteMetrics();
  const slowRoutes = allRoutes
    .filter((r) => r.avgDurationMs > 100)
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
    .slice(0, 5)
    .map((r) => ({ route: `${r.method} ${r.route}`, avgMs: Math.round(r.avgDurationMs) }));

  // Top routes by traffic
  const topRoutes = allRoutes
    .slice(0, 10)
    .map((r) => ({ route: `${r.method} ${r.route}`, count: r.requestCount }));

  return {
    uptime: Math.round(uptimeSec),
    requestRate: Math.round(requestRate * 100) / 100,
    totalRequests,
    totalErrors,
    errorRate: Math.round(errorRate * 1000) / 1000,
    avgResponseTime: Math.round(
      globalDurations.length > 0
        ? globalDurations.reduce((a, b) => a + b, 0) / globalDurations.length
        : 0
    ),
    p95ResponseTime: globalP.p95,
    memory: memMB,
    slowRoutes,
    topRoutes,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset all metrics. Used for testing.
 */
export function resetMetrics(): void {
  routeMetrics.clear();
  globalDurations.length = 0;
  totalRequests = 0;
  totalErrors = 0;
  lastRequestTimestamp = 0;
}

// ===== Middleware helper =====

/**
 * Express-style middleware wrapper untuk Next.js API routes.
 * Otomatis record durasi & error count.
 *
 * Usage:
 *   export const GET = withMetrics(async (req) => {
 *     // your handler
 *   });
 */
export function withMetrics<T = any>(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const start = Date.now();
    const route = new URL(req.url).pathname;
    const method = req.method;

    try {
      const response = await handler(req);
      const duration = Date.now() - start;
      recordRequest(route, method, duration, response.status >= 500);
      return response;
    } catch (err) {
      const duration = Date.now() - start;
      recordRequest(route, method, duration, true);
      throw err;
    }
  };
}

// ===== Helpers =====

/**
 * Normalize route to remove dynamic IDs (so /api/books/123 and /api/books/456
 * are aggregated together).
 */
function normalizeRoute(route: string): string {
  return route
    .replace(/\/[0-9a-f]{8,}/gi, "/:id") // cuid-like
    .replace(/\/\d+/g, "/:id")
    .replace(/\?.*$/, ""); // remove query
}

/**
 * Calculate percentiles from sorted array.
 * Assumes input is unsorted (will sort copy).
 */
function calculatePercentiles(values: number[]): {
  p50: number;
  p95: number;
  p99: number;
} {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => {
    const idx = Math.min(
      sorted.length - 1,
      Math.floor((p / 100) * sorted.length)
    );
    return sorted[idx];
  };

  return {
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}
