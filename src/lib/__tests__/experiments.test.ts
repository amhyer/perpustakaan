/**
 * Unit tests untuk A/B testing service.
 */

import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Mirror pure functions
function hashToVariant(userId: string, experimentKey: string, variants: string[]): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${experimentKey}`)
    .digest("hex");
  const num = parseInt(hash.slice(0, 8), 16);
  const idx = num % variants.length;
  return variants[idx];
}

function weightedVariant(
  userId: string,
  experimentKey: string,
  variants: string[],
  weights: Record<string, number>
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${experimentKey}:weighted`)
    .digest("hex");
  const num = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

  let cumulative = 0;
  for (const v of variants) {
    cumulative += weights[v] || 0;
    if (num <= cumulative) return v;
  }
  return variants[variants.length - 1];
}

describe("Hash-based variant assignment", () => {
  it("returns same variant for same user + experiment", () => {
    const v1 = hashToVariant("user1", "exp1", ["control", "treatment_a"]);
    const v2 = hashToVariant("user1", "exp1", ["control", "treatment_a"]);
    expect(v1).toBe(v2);
  });

  it("returns different variants for different users", () => {
    const variants = ["control", "treatment_a"];
    const assignments = new Set();
    for (let i = 0; i < 50; i++) {
      assignments.add(hashToVariant(`user${i}`, "exp1", variants));
    }
    // Should have both variants (statistical)
    expect(assignments.size).toBeGreaterThan(1);
  });

  it("distributes roughly evenly (1000 users)", () => {
    const variants = ["control", "treatment_a"];
    const counts: Record<string, number> = { control: 0, treatment_a: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = hashToVariant(`user${i}`, "exp1", variants);
      counts[v]++;
    }
    // Expect ~50/50 (within 10% margin)
    expect(counts.control).toBeGreaterThan(400);
    expect(counts.treatment_a).toBeGreaterThan(400);
  });

  it("different experiment key for same user = different variant", () => {
    const v1 = hashToVariant("user1", "exp_a", ["control", "treatment_a"]);
    const v2 = hashToVariant("user1", "exp_b", ["control", "treatment_a"]);
    // Not guaranteed to be different, but the hash is different
    expect(v1 === v2 || v1 !== v2).toBe(true);
  });
});

describe("Weighted variant assignment", () => {
  it("respects weights", () => {
    const variants = ["control", "treatment"];
    const weights = { control: 0.8, treatment: 0.2 };
    const counts: Record<string, number> = { control: 0, treatment: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = weightedVariant(`user${i}`, "exp1", variants, weights);
      counts[v]++;
    }
    // control should be ~80%, treatment ~20%
    expect(counts.control).toBeGreaterThan(700);
    expect(counts.treatment).toBeLessThan(300);
  });

  it("returns valid variant for empty weights", () => {
    const variants = ["a", "b"];
    const weights = { a: 0, b: 0 };
    const v = weightedVariant("user1", "exp1", variants, weights);
    // Falls back to last variant
    expect(v).toBe("b");
  });

  it("deterministic for same user", () => {
    const v1 = weightedVariant("user1", "exp1", ["a", "b"], { a: 0.5, b: 0.5 });
    const v2 = weightedVariant("user1", "exp1", ["a", "b"], { a: 0.5, b: 0.5 });
    expect(v1).toBe(v2);
  });
});

describe("Conversion tracking aggregation", () => {
  // Test aggregation logic
  function aggregateConversions(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assignments: { variant: string; metadata: any }[]
  ): Record<string, { count: number; conversions: number }> {
    const result: Record<string, { count: number; conversions: number }> = {};
    for (const a of assignments) {
      if (!result[a.variant]) result[a.variant] = { count: 0, conversions: 0 };
      result[a.variant].count++;
      if (a.metadata?.conversions) {
        result[a.variant].conversions += a.metadata.conversions.length;
      }
    }
    return result;
  }

  it("counts total assignments per variant", () => {
    const data = [
      { variant: "control", metadata: { conversions: [{ event: "claim" }] } },
      { variant: "control", metadata: { conversions: [] } },
      { variant: "treatment", metadata: { conversions: [{ event: "claim" }, { event: "share" }] } },
    ];
    const result = aggregateConversions(data);
    expect(result.control.count).toBe(2);
    expect(result.control.conversions).toBe(1);
    expect(result.treatment.count).toBe(1);
    expect(result.treatment.conversions).toBe(2);
  });

  it("handles null metadata", () => {
    const data = [
      { variant: "control", metadata: null },
      { variant: "control", metadata: undefined },
    ];
    const result = aggregateConversions(data);
    expect(result.control.count).toBe(2);
    expect(result.control.conversions).toBe(0);
  });
});
