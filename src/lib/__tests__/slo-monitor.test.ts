/**
 * Tests for SLO/SLI monitoring.
 *
 * Sprint R - Tier 3 #10: Advanced DevOps.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    requestMetric: { findMany: vi.fn() },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  calculatePercentile,
  calculateErrorBudget,
  calculateRiskScore,
  calculateTrend,
  computeSLOStatus,
  recommendScaling,
  generateAlerts,
  getSLODashboard,
  DEFAULT_SLOS,
  type SLODefinition,
  type SLIMeasurement,
  type ResourceMetrics,
} from "../slo-monitor";

describe("slo-monitor: pure functions", () => {
  describe("calculatePercentile", () => {
    it("returns 0 for empty array", () => {
      expect(calculatePercentile([], 95)).toBe(0);
    });

    it("calculates p95 correctly", () => {
      const values = Array.from({ length: 100 }, (_, i) => i);
      // p95 of [0..99] should be 95
      expect(calculatePercentile(values, 95)).toBeGreaterThanOrEqual(94);
    });

    it("calculates p50 (median)", () => {
      const values = [1, 2, 3, 4, 5];
      expect(calculatePercentile(values, 50)).toBe(3);
    });

    it("handles single value", () => {
      expect(calculatePercentile([42], 95)).toBe(42);
    });
  });

  describe("calculateErrorBudget", () => {
    it("returns 0% consumed for availability above target", () => {
      const slo: SLODefinition = DEFAULT_SLOS.find((s) => s.type === "AVAILABILITY")!;
      const result = calculateErrorBudget(slo, []);
      expect(result.consumed).toBe(0);
      expect(result.remaining).toBe(100);
    });

    it("calculates consumed based on downtime", () => {
      const slo: SLODefinition = DEFAULT_SLOS[0]; // availability
      const bad: SLIMeasurement[] = Array.from({ length: 100 }, (_, i) => ({
        sloId: slo.id,
        value: 99.5,
        timestamp: new Date(),
        inCompliance: false,
      }));
      const result = calculateErrorBudget(slo, bad);
      expect(result.consumed).toBeGreaterThan(0);
      expect(result.consumed).toBeLessThanOrEqual(100);
    });

    it("caps at 100%", () => {
      const slo: SLODefinition = DEFAULT_SLOS[0];
      const many = Array.from({ length: 10000 }, () => ({
        sloId: slo.id,
        value: 0,
        timestamp: new Date(),
        inCompliance: false,
      }));
      const result = calculateErrorBudget(slo, many);
      expect(result.consumed).toBe(100);
    });

    it("returns 0% for non-availability SLOs", () => {
      const latencySLO = DEFAULT_SLOS.find((s) => s.type === "LATENCY")!;
      const result = calculateErrorBudget(latencySLO, []);
      expect(result.consumed).toBe(0);
    });
  });

  describe("calculateRiskScore", () => {
    it("returns 0 when at or above target (availability)", () => {
      const slo = DEFAULT_SLOS[0];
      expect(calculateRiskScore(slo, 99.95)).toBe(0);
    });

    it("returns 25 when 95-99% of target", () => {
      const slo = DEFAULT_SLOS[0];
      expect(calculateRiskScore(slo, 96)).toBe(25);
    });

    it("returns 50 when 90-95% of target", () => {
      const slo = DEFAULT_SLOS[0];
      expect(calculateRiskScore(slo, 92)).toBe(50);
    });

    it("returns 75 when 80-90% of target", () => {
      const slo = DEFAULT_SLOS[0];
      expect(calculateRiskScore(slo, 85)).toBe(75);
    });

    it("returns 100 when below 80% of target", () => {
      const slo = DEFAULT_SLOS[0];
      expect(calculateRiskScore(slo, 70)).toBe(100);
    });

    it("inverts for latency SLO (lower is better)", () => {
      const slo = DEFAULT_SLOS.find((s) => s.type === "LATENCY")!;
      expect(calculateRiskScore(slo, 400)).toBe(0); // below 500ms target
      expect(calculateRiskScore(slo, 600)).toBe(50); // 1.2x target
    });
  });

  describe("calculateTrend", () => {
    it("returns stable when no data", () => {
      expect(calculateTrend([], [])).toBe("stable");
    });

    it("returns stable when values are similar", () => {
      expect(calculateTrend([100, 101, 102], [99, 100, 101])).toBe("stable");
    });

    it("returns degrading when recent higher (for higher-is-better)", () => {
      expect(calculateTrend([150, 160, 170], [100, 110, 120])).toBe("degrading");
    });

    it("returns improving when recent lower (for higher-is-better inverted)", () => {
      expect(calculateTrend([80, 90, 100], [150, 160, 170])).toBe("improving");
    });
  });
});

describe("slo-monitor: computeSLOStatus", () => {
  const availabilitySLO = DEFAULT_SLOS[0];
  const latencySLO = DEFAULT_SLOS.find((s) => s.id === "latency-p95-1h")!;
  const errorSLO = DEFAULT_SLOS.find((s) => s.type === "ERROR_RATE")!;
  const throughputSLO = DEFAULT_SLOS.find((s) => s.type === "THROUGHPUT")!;

  it("computes availability status (compliant)", () => {
    const status = computeSLOStatus(availabilitySLO, {
      recentMeasurements: Array.from({ length: 100 }, () => ({
        sloId: "a",
        value: 99.95,
        timestamp: new Date(),
        inCompliance: true,
      })),
    });
    expect(status.inCompliance).toBe(true);
    expect(status.current).toBe(100); // All compliant
  });

  it("computes availability status (non-compliant)", () => {
    const status = computeSLOStatus(availabilitySLO, {
      recentMeasurements: [
        { sloId: "a", value: 100, timestamp: new Date(), inCompliance: true },
        { sloId: "a", value: 99, timestamp: new Date(), inCompliance: false },
        { sloId: "a", value: 100, timestamp: new Date(), inCompliance: true },
        { sloId: "a", value: 99, timestamp: new Date(), inCompliance: false },
      ],
    });
    expect(status.inCompliance).toBe(false);
    expect(status.current).toBe(50);
  });

  it("computes latency from samples", () => {
    const status = computeSLOStatus(latencySLO, {
      recentMeasurements: [],
      latencySamples: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
    });
    expect(status.current).toBeGreaterThan(0);
    expect(status.inCompliance).toBeDefined();
  });

  it("computes error rate from measurements", () => {
    const status = computeSLOStatus(errorSLO, {
      recentMeasurements: [
        { sloId: "e", value: 0, timestamp: new Date(), inCompliance: true },
        { sloId: "e", value: 0, timestamp: new Date(), inCompliance: true },
        { sloId: "e", value: 1, timestamp: new Date(), inCompliance: false },
      ],
    });
    expect(status.current).toBeCloseTo(33.33, 1);
  });

  it("computes throughput", () => {
    const status = computeSLOStatus(throughputSLO, {
      recentMeasurements: [],
      throughput: 150,
    });
    expect(status.inCompliance).toBe(true);
    expect(status.current).toBe(150);
  });

  it("includes recommendation for high risk", () => {
    const status = computeSLOStatus(latencySLO, {
      recentMeasurements: [],
      latencySamples: [2000, 3000, 5000], // 5x target
    });
    expect(status.riskScore).toBeGreaterThanOrEqual(75);
    expect(status.recommendation).toBeDefined();
  });
});

describe("slo-monitor: recommendScaling", () => {
  it("recommends SCALE_UP for high CPU", () => {
    const metrics: ResourceMetrics = {
      cpuPercent: 95,
      memoryPercent: 50,
      activeConnections: 100,
      requestsPerSecond: 200,
      averageLatencyMs: 300,
      errorRate: 0.1,
      currentInstances: 2,
    };
    const rec = recommendScaling(metrics);
    expect(rec.action).toBe("SCALE_UP");
    expect(rec.confidence).toBe("high");
  });

  it("recommends SCALE_UP for high latency", () => {
    const metrics: ResourceMetrics = {
      cpuPercent: 50,
      memoryPercent: 50,
      activeConnections: 100,
      requestsPerSecond: 50,
      averageLatencyMs: 1500,
      errorRate: 0.1,
      currentInstances: 2,
    };
    const rec = recommendScaling(metrics);
    expect(rec.action).toBe("SCALE_UP");
  });

  it("recommends SCALE_UP for high throughput", () => {
    const metrics: ResourceMetrics = {
      cpuPercent: 30,
      memoryPercent: 30,
      activeConnections: 100,
      requestsPerSecond: 300,
      averageLatencyMs: 200,
      errorRate: 0.1,
      currentInstances: 2,
    };
    const rec = recommendScaling(metrics);
    expect(rec.action).toBe("SCALE_UP");
    expect(rec.suggestedInstances).toBe(3);
  });

  it("recommends SCALE_DOWN for low usage", () => {
    const metrics: ResourceMetrics = {
      cpuPercent: 10,
      memoryPercent: 20,
      activeConnections: 5,
      requestsPerSecond: 10,
      averageLatencyMs: 100,
      errorRate: 0,
      currentInstances: 3,
    };
    const rec = recommendScaling(metrics);
    expect(rec.action).toBe("SCALE_DOWN");
    expect(rec.suggestedInstances).toBe(2);
  });

  it("recommends MAINTAIN for normal load", () => {
    const metrics: ResourceMetrics = {
      cpuPercent: 50,
      memoryPercent: 60,
      activeConnections: 50,
      requestsPerSecond: 100,
      averageLatencyMs: 300,
      errorRate: 0.05,
      currentInstances: 2,
    };
    const rec = recommendScaling(metrics);
    expect(rec.action).toBe("MAINTAIN");
  });

  it("caps SCALE_UP at 10 instances", () => {
    const metrics: ResourceMetrics = {
      cpuPercent: 95,
      memoryPercent: 95,
      activeConnections: 1000,
      requestsPerSecond: 1000,
      averageLatencyMs: 2000,
      errorRate: 5,
      currentInstances: 10,
    };
    const rec = recommendScaling(metrics);
    expect(rec.suggestedInstances).toBeLessThanOrEqual(10);
  });

  it("does not go below 1 instance on scale down", () => {
    const metrics: ResourceMetrics = {
      cpuPercent: 1,
      memoryPercent: 1,
      activeConnections: 1,
      requestsPerSecond: 1,
      averageLatencyMs: 50,
      errorRate: 0,
      currentInstances: 1,
    };
    const rec = recommendScaling(metrics);
    expect(rec.suggestedInstances).toBeGreaterThanOrEqual(1);
  });
});

describe("slo-monitor: generateAlerts", () => {
  it("generates CRITICAL alert for violated SLO", () => {
    const slo = DEFAULT_SLOS[0];
    const statuses = [
      {
        slo,
        current: 98,
        target: 99.9,
        inCompliance: false,
        riskScore: 90,
        errorBudgetConsumed: 50,
        trend: "degrading" as const,
      },
    ];
    const alerts = generateAlerts(statuses);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("critical");
  });

  it("generates WARNING for high risk", () => {
    const slo = DEFAULT_SLOS.find((s) => s.type === "LATENCY")!;
    const statuses = [
      {
        slo,
        current: 700,
        target: 500,
        inCompliance: true,
        riskScore: 60,
        errorBudgetConsumed: 30,
        trend: "degrading" as const,
      },
    ];
    const alerts = generateAlerts(statuses);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("warning");
  });

  it("generates WARNING for high error budget consumption", () => {
    const slo = DEFAULT_SLOS[0];
    const statuses = [
      {
        slo,
        current: 99.95,
        target: 99.9,
        inCompliance: true,
        riskScore: 10,
        errorBudgetConsumed: 95,
        trend: "stable" as const,
      },
    ];
    const alerts = generateAlerts(statuses);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain("Error budget");
  });

  it("returns empty for healthy SLOs", () => {
    const slo = DEFAULT_SLOS[0];
    const statuses = [
      {
        slo,
        current: 99.99,
        target: 99.9,
        inCompliance: true,
        riskScore: 0,
        errorBudgetConsumed: 10,
        trend: "stable" as const,
      },
    ];
    expect(generateAlerts(statuses)).toEqual([]);
  });
});

describe("slo-monitor: getSLODashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns dashboard with statuses, alerts, scaling", async () => {
    vi.mocked(db.requestMetric.findMany).mockResolvedValue([] as any);
    const result = await getSLODashboard();
    expect(result.statuses).toBeDefined();
    expect(result.alerts).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.statuses.length).toBe(DEFAULT_SLOS.length);
  });

  it("handles missing requestMetric table gracefully", async () => {
    vi.mocked(db.requestMetric.findMany).mockResolvedValue(undefined as any);
    const result = await getSLODashboard();
    expect(result.statuses.length).toBe(DEFAULT_SLOS.length);
  });
});
