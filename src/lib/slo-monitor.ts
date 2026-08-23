/**
 * SLO/SLI Monitor — Service Level Objectives & Indicators.
 *
 * Sprint R - Tier 3 #10: Advanced DevOps.
 *
 * SLOs (Service Level Objectives):
 * - Availability: 99.9% uptime
 * - Latency: p95 < 500ms, p99 < 1s
 * - Error rate: < 0.1%
 * - Throughput: > 100 req/s sustained
 *
 * SLIs (Service Level Indicators):
 * - Actual measurements
 *
 * Error Budget:
 * - 0.1% error budget = 43.2 minutes downtime/month
 * - Tracks budget consumption
 *
 * Auto-scaling Recommendations:
 * - Based on CPU, memory, latency, throughput
 * - Suggests scale up/down
 *
 * Alerting:
 * - When SLO is at risk
 * - When error budget is exhausted
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ===== Types =====

export interface SLODefinition {
  id: string;
  name: string;
  description: string;
  type: "AVAILABILITY" | "LATENCY" | "ERROR_RATE" | "THROUGHPUT";
  target: number; // 99.9, 500, 0.1, 100
  unit: string; // "%", "ms", "%", "req/s"
  window: "1h" | "24h" | "7d" | "30d";
}

export interface SLIMeasurement {
  sloId: string;
  value: number;
  timestamp: Date;
  inCompliance: boolean;
}

export interface SLOStatus {
  slo: SLODefinition;
  current: number;
  target: number;
  inCompliance: boolean;
  /** 0-100, how close to SLO violation */
  riskScore: number;
  /** % of error budget consumed */
  errorBudgetConsumed: number;
  trend: "improving" | "stable" | "degrading";
  recommendation?: string;
}

export interface ScalingRecommendation {
  action: "SCALE_UP" | "SCALE_DOWN" | "MAINTAIN";
  reason: string;
  confidence: "low" | "medium" | "high";
  metrics: Record<string, number>;
  suggestedInstances?: number;
}

export interface Alert {
  severity: "info" | "warning" | "critical";
  sloId: string;
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

// ===== SLO Definitions =====

export const DEFAULT_SLOS: SLODefinition[] = [
  {
    id: "availability-30d",
    name: "Availability 30 hari",
    description: "Service harus tersedia 99.9% dalam 30 hari",
    type: "AVAILABILITY",
    target: 99.9,
    unit: "%",
    window: "30d",
  },
  {
    id: "latency-p95-1h",
    name: "Latency p95 < 500ms",
    description: "95% request harus selesai dalam 500ms",
    type: "LATENCY",
    target: 500,
    unit: "ms",
    window: "1h",
  },
  {
    id: "latency-p99-1h",
    name: "Latency p99 < 1s",
    description: "99% request harus selesai dalam 1 detik",
    type: "LATENCY",
    target: 1000,
    unit: "ms",
    window: "1h",
  },
  {
    id: "error-rate-1h",
    name: "Error rate < 0.1%",
    description: "Error rate di bawah 0.1% dalam 1 jam terakhir",
    type: "ERROR_RATE",
    target: 0.1,
    unit: "%",
    window: "1h",
  },
  {
    id: "throughput-1h",
    name: "Throughput > 100 req/s",
    description: "Service harus handle minimal 100 req/s",
    type: "THROUGHPUT",
    target: 100,
    unit: "req/s",
    window: "1h",
  },
];

// ===== Pure Functions =====

/**
 * Calculate p95 from a sorted array of numbers.
 */
export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, idx)];
}

/**
 * Calculate error budget consumed.
 * For availability SLO of 99.9% in 30 days:
 *   Allowed downtime = 0.1% × 30d = 43.2 minutes
 *   Consumed = actual_downtime / allowed_downtime × 100%
 */
export function calculateErrorBudget(
  slo: SLODefinition,
  measurements: SLIMeasurement[]
): { consumed: number; remaining: number } {
  if (slo.type !== "AVAILABILITY") {
    return { consumed: 0, remaining: 100 };
  }

  // Calculate total downtime
  const downtimeMs = measurements
    .filter((m) => !m.inCompliance)
    .reduce((sum, m) => sum + 5 * 60 * 1000, 0); // Each bad measurement = 5 min

  const totalMs = windowToMs(slo.window);
  const allowedDowntimeMs = ((100 - slo.target) / 100) * totalMs;

  const consumed = allowedDowntimeMs > 0 ? (downtimeMs / allowedDowntimeMs) * 100 : 0;
  return {
    consumed: Math.min(100, Math.round(consumed)),
    remaining: Math.max(0, Math.round(100 - consumed)),
  };
}

function windowToMs(window: string): number {
  const map: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return map[window] || 60 * 60 * 1000;
}

/**
 * Calculate risk score (0-100).
 * Higher = closer to SLO violation.
 */
export function calculateRiskScore(
  slo: SLODefinition,
  current: number
): number {
  if (slo.type === "AVAILABILITY" || slo.type === "THROUGHPUT") {
    // Higher is better
    const ratio = current / slo.target;
    if (ratio >= 1) return 0; // Above target
    if (ratio >= 0.95) return 25;
    if (ratio >= 0.9) return 50;
    if (ratio >= 0.8) return 75;
    return 100;
  } else {
    // Lower is better (latency, error rate)
    if (current <= slo.target) return 0;
    const ratio = current / slo.target;
    if (ratio <= 1.1) return 25;
    if (ratio <= 1.25) return 50;
    if (ratio <= 1.5) return 75;
    return 100;
  }
}

/**
 * Calculate trend (improving/stable/degrading).
 */
export function calculateTrend(
  recent: number[],
  older: number[]
): "improving" | "stable" | "degrading" {
  if (recent.length === 0 || older.length === 0) return "stable";

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const change = (recentAvg - olderAvg) / (olderAvg || 1);

  if (Math.abs(change) < 0.05) return "stable";
  return change > 0 ? "degrading" : "improving";
}

// ===== SLO Status Computation =====

export interface SLOInput {
  /** Recent measurements */
  recentMeasurements: SLIMeasurement[];
  /** Latency samples (ms) for latency SLOs */
  latencySamples?: number[];
  /** Throughput (req/s) for throughput SLOs */
  throughput?: number;
}

/**
 * Compute current SLO status.
 */
export function computeSLOStatus(
  slo: SLODefinition,
  input: SLOInput
): SLOStatus {
  let current = 0;
  let inCompliance = false;

  if (slo.type === "LATENCY" && input.latencySamples) {
    const sorted = [...input.latencySamples].sort((a, b) => a - b);
    const p = slo.id.includes("p99") ? 99 : 95;
    current = calculatePercentile(sorted, p);
    inCompliance = current <= slo.target;
  } else if (slo.type === "ERROR_RATE") {
    if (input.recentMeasurements.length > 0) {
      const errors = input.recentMeasurements.filter((m) => !m.inCompliance).length;
      current = (errors / input.recentMeasurements.length) * 100;
    }
    inCompliance = current <= slo.target;
  } else if (slo.type === "THROUGHPUT") {
    current = input.throughput ?? 0;
    inCompliance = current >= slo.target;
  } else if (slo.type === "AVAILABILITY") {
    if (input.recentMeasurements.length > 0) {
      const up = input.recentMeasurements.filter((m) => m.inCompliance).length;
      current = (up / input.recentMeasurements.length) * 100;
    }
    inCompliance = current >= slo.target;
  }

  const riskScore = calculateRiskScore(slo, current);
  const budget = calculateErrorBudget(slo, input.recentMeasurements);

  // Trend (compare first half vs second half)
  const half = Math.floor(input.recentMeasurements.length / 2);
  const older = input.recentMeasurements.slice(0, half).map((m) => m.value);
  const recent = input.recentMeasurements.slice(half).map((m) => m.value);
  const trend = calculateTrend(recent, older);

  let recommendation: string | undefined;
  if (riskScore >= 75) {
    recommendation = slo.type === "LATENCY"
      ? "Investigate slow queries. Consider caching atau query optimization."
      : slo.type === "ERROR_RATE"
      ? "Periksa error log dan roll back perubahan terbaru."
      : slo.type === "AVAILABILITY"
      ? "Aktifkan fallback atau restart service."
      : "Tingkatkan kapasitas server.";
  }

  return {
    slo,
    current,
    target: slo.target,
    inCompliance,
    riskScore,
    errorBudgetConsumed: budget.consumed,
    trend,
    recommendation,
  };
}

// ===== Auto-scaling =====

export interface ResourceMetrics {
  cpuPercent: number;
  memoryPercent: number;
  activeConnections: number;
  requestsPerSecond: number;
  averageLatencyMs: number;
  errorRate: number;
  currentInstances: number;
}

/**
 * Recommend scaling action based on metrics.
 */
export function recommendScaling(metrics: ResourceMetrics): ScalingRecommendation {
  const { cpuPercent, memoryPercent, averageLatencyMs, requestsPerSecond, currentInstances } = metrics;

  // Scale UP conditions
  if (cpuPercent > 80 || memoryPercent > 85 || averageLatencyMs > 1000) {
    return {
      action: "SCALE_UP",
      reason: cpuPercent > 80
        ? `CPU usage tinggi: ${cpuPercent.toFixed(1)}%`
        : memoryPercent > 85
        ? `Memory usage tinggi: ${memoryPercent.toFixed(1)}%`
        : `Latency tinggi: ${averageLatencyMs}ms`,
      confidence: cpuPercent > 90 ? "high" : "medium",
      metrics: { cpuPercent, memoryPercent, averageLatencyMs, requestsPerSecond },
      suggestedInstances: Math.min(currentInstances + 1, 10),
    };
  }

  if (requestsPerSecond > currentInstances * 100) {
    return {
      action: "SCALE_UP",
      reason: `Throughput tinggi: ${requestsPerSecond} req/s untuk ${currentInstances} instances`,
      confidence: "medium",
      metrics: { requestsPerSecond, currentInstances },
      suggestedInstances: Math.ceil(requestsPerSecond / 100),
    };
  }

  // Scale DOWN conditions
  if (
    cpuPercent < 20 &&
    memoryPercent < 30 &&
    averageLatencyMs < 200 &&
    requestsPerSecond < currentInstances * 30
  ) {
    return {
      action: "SCALE_DOWN",
      reason: "Resource usage rendah dan latency baik",
      confidence: "medium",
      metrics: { cpuPercent, memoryPercent, averageLatencyMs, requestsPerSecond },
      suggestedInstances: Math.max(currentInstances - 1, 1),
    };
  }

  return {
    action: "MAINTAIN",
    reason: "Metrics dalam batas normal",
    confidence: "high",
    metrics: { cpuPercent, memoryPercent, averageLatencyMs, requestsPerSecond },
  };
}

// ===== Alerting =====

/**
 * Generate alerts based on SLO statuses.
 */
export function generateAlerts(statuses: SLOStatus[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  for (const status of statuses) {
    // CRITICAL: SLO violated
    if (!status.inCompliance) {
      alerts.push({
        severity: "critical",
        sloId: status.slo.id,
        message: `SLO VIOLATED: ${status.slo.name} — current ${status.current.toFixed(2)}${status.slo.unit}, target ${status.slo.target}${status.slo.unit}`,
        timestamp: now,
        metadata: { current: status.current, target: status.slo.target },
      });
    }
    // WARNING: Risk > 50%
    else if (status.riskScore >= 50) {
      alerts.push({
        severity: "warning",
        sloId: status.slo.id,
        message: `SLO at risk: ${status.slo.name} — risk score ${status.riskScore}`,
        timestamp: now,
        metadata: { riskScore: status.riskScore },
      });
    }

    // Error budget exhausted
    if (status.errorBudgetConsumed >= 90) {
      alerts.push({
        severity: "warning",
        sloId: status.slo.id,
        message: `Error budget hampir habis: ${status.errorBudgetConsumed}% consumed`,
        timestamp: now,
        metadata: { budgetConsumed: status.errorBudgetConsumed },
      });
    }
  }

  return alerts;
}

// ===== Database Operations =====

/**
 * Get full SLO dashboard.
 */
export async function getSLODashboard(): Promise<{
  statuses: SLOStatus[];
  alerts: Alert[];
  scaling: ScalingRecommendation | null;
  timestamp: Date;
}> {
  const statuses: SLOStatus[] = [];
  const now = new Date();

  for (const slo of DEFAULT_SLOS) {
    // Get measurements from DB
    const since = new Date(Date.now() - windowToMs(slo.window));
    const logs = await (db as any).requestMetric?.findMany?.({
      where: { sloId: slo.id, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }) || [];

    const measurements: SLIMeasurement[] = logs.map((l: any) => ({
      sloId: l.sloId,
      value: l.value,
      timestamp: l.createdAt,
      inCompliance: l.inCompliance,
    }));

    let latencySamples: number[] | undefined;
    let throughput: number | undefined;

    if (slo.type === "LATENCY") {
      latencySamples = logs.map((l: any) => l.value);
    } else if (slo.type === "THROUGHPUT") {
      if (measurements.length > 0) {
        const elapsed = (now.getTime() - measurements[0].timestamp.getTime()) / 1000;
        throughput = measurements.length / elapsed;
      }
    }

    const status = computeSLOStatus(slo, {
      recentMeasurements: measurements,
      latencySamples,
      throughput,
    });

    statuses.push(status);
  }

  const alerts = generateAlerts(statuses);

  // Get current resource metrics for scaling
  let scaling: ScalingRecommendation | null = null;
  try {
    const recentLogs = await (db as any).requestMetric?.findMany?.({
      where: { createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
      take: 1000,
    }) || [];

    if (recentLogs.length > 0) {
      const totalRequests = recentLogs.length;
      const errorCount = recentLogs.filter((l: any) => !l.inCompliance).length;
      const latencies = recentLogs.map((l: any) => l.value).sort((a: number, b: number) => a - b);
      const avgLatency = latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length;

      scaling = recommendScaling({
        cpuPercent: 50, // Would come from system monitor
        memoryPercent: 60,
        activeConnections: 0,
        requestsPerSecond: totalRequests / 300, // 5 min window
        averageLatencyMs: avgLatency,
        errorRate: (errorCount / totalRequests) * 100,
        currentInstances: 2,
      });
    }
  } catch (err) {
    logger.warn("Failed to compute scaling recommendation", { error: String(err) });
  }

  return {
    statuses,
    alerts,
    scaling,
    timestamp: now,
  };
}
