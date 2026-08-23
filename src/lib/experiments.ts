/**
 * A/B Testing Service
 *
 * Sistem experiment untuk testing variant:
 * - "reward_catalog_v2" — old vs new catalog UI
 * - "point_multiplier_2x" — double points weekend
 * - "notification_tone_friendly" — tone notifikasi formal vs friendly
 *
 * Cara kerja:
 * 1. User masuk experiment → di-assign ke variant (deterministic hash)
 * 2. Setiap variant punya konfigurasi sendiri
 * 3. Track conversion (mis: berapa yang claim hadiah)
 * 4. Analyze hasil via dashboard
 *
 * Untuk single-instance SQLite, pakai assignment table untuk consistency.
 * Untuk multi-instance, pakai Redis atau feature flag service.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export type ExperimentVariant = "control" | "treatment_a" | "treatment_b";

export interface ExperimentConfig {
  key: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  weights?: Record<ExperimentVariant, number>; // 0-1
  isActive: boolean;
  startedAt?: Date;
  endedAt?: Date;
}

export interface AssignmentResult {
  experimentKey: string;
  variant: ExperimentVariant;
  isNewAssignment: boolean;
}

// In-memory registry of active experiments
const EXPERIMENTS: Record<string, ExperimentConfig> = {
  reward_catalog_v2: {
    key: "reward_catalog_v2",
    name: "Katalog Hadiah v2",
    description: "Testing new catalog layout dengan featured rewards prominent",
    variants: ["control", "treatment_a"],
    weights: { control: 0.5, treatment_a: 0.5, treatment_b: 0 },
    isActive: true,
  },
  point_multiplier_2x: {
    key: "point_multiplier_2x",
    name: "2x Poin Weekend",
    description: "Berikan 2x poin untuk buku yang dikembalikan di hari weekend",
    variants: ["control", "treatment_a"],
    weights: { control: 0.5, treatment_a: 0.5, treatment_b: 0 },
    isActive: false, // Disabled by default
  },
  notification_tone_friendly: {
    key: "notification_tone_friendly",
    name: "Tone Notifikasi Friendly",
    description: "Test tone notifikasi yang lebih kasual vs formal",
    variants: ["control", "treatment_a", "treatment_b"],
    weights: { control: 0.34, treatment_a: 0.33, treatment_b: 0.33 },
    isActive: false,
  },
};

export function getExperimentConfig(key: string): ExperimentConfig | null {
  return EXPERIMENTS[key] || null;
}

export function listActiveExperiments(): ExperimentConfig[] {
  return Object.values(EXPERIMENTS).filter((e) => e.isActive);
}

/**
 * Deterministically assign user ke variant berdasarkan hash.
 * Memastikan user yang sama selalu dapat variant yang sama.
 */
function hashToVariant(userId: string, experimentKey: string, variants: ExperimentVariant[]): ExperimentVariant {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${experimentKey}`)
    .digest("hex");
  const num = parseInt(hash.slice(0, 8), 16);
  const idx = num % variants.length;
  return variants[idx];
}

/**
 * Weighted assignment (untuk unequal distribution).
 */
function weightedVariant(
  userId: string,
  experimentKey: string,
  variants: ExperimentVariant[],
  weights: Record<ExperimentVariant, number>
): ExperimentVariant {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${experimentKey}:weighted`)
    .digest("hex");
  const num = parseInt(hash.slice(0, 8), 16) / 0xffffffff; // 0-1

  let cumulative = 0;
  for (const v of variants) {
    cumulative += weights[v] || 0;
    if (num <= cumulative) return v;
  }
  return variants[variants.length - 1];
}

/**
 * Get or create assignment untuk user.
 * Idempotent: call kedua kali untuk user yang sama return variant yang sama.
 */
export async function getAssignment(
  experimentKey: string,
  memberId: string
): Promise<AssignmentResult | null> {
  const config = getExperimentConfig(experimentKey);
  if (!config || !config.isActive) return null;

  // Check existing assignment
  const existing = await db.experimentAssignment.findUnique({
    where: {
      experimentKey_memberId: { experimentKey, memberId },
    },
  });

  if (existing) {
    return {
      experimentKey,
      variant: existing.variant as ExperimentVariant,
      isNewAssignment: false,
    };
  }

  // Determine variant
  let variant: ExperimentVariant;
  if (config.weights) {
    variant = weightedVariant(memberId, experimentKey, config.variants, config.weights);
  } else {
    variant = hashToVariant(memberId, experimentKey, config.variants);
  }

  // Save assignment
  await db.experimentAssignment.create({
    data: {
      experimentKey,
      memberId,
      variant,
    },
  });

  logger.info("Experiment assignment created", {
    experimentKey,
    memberId,
    variant,
  });

  return { experimentKey, variant, isNewAssignment: true };
}

/**
 * Get variant config — helper untuk apply experiment logic.
 */
export function getVariantConfig<T>(
  experimentKey: string,
  configs: Record<ExperimentVariant, T>
): T | null {
  const config = getExperimentConfig(experimentKey);
  if (!config) return null;
  // Default ke control kalau experiment tidak aktif
  if (!config.isActive) return configs.control || null;
  return null;
}

/**
 * Track conversion (mis: user claim hadiah setelah lihat catalog v2).
 */
export async function trackConversion(
  experimentKey: string,
  memberId: string,
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
): Promise<void> {
  const assignment = await db.experimentAssignment.findUnique({
    where: {
      experimentKey_memberId: { experimentKey, memberId },
    },
  });

  if (!assignment) return; // User not in experiment

  // Merge metadata with existing
  const existing = assignment.metadata ? JSON.parse(assignment.metadata) : {};
  const updated = {
    ...existing,
    conversions: [
      ...(existing.conversions || []),
      { event: eventName, timestamp: new Date().toISOString(), ...metadata },
    ],
  };

  await db.experimentAssignment.update({
    where: { id: assignment.id },
    data: { metadata: JSON.stringify(updated) },
  });
}

/**
 * Get experiment results (untuk dashboard).
 */
export async function getExperimentResults(experimentKey: string) {
  const assignments = await db.experimentAssignment.findMany({
    where: { experimentKey },
  });

  // Aggregate by variant
  const byVariant: Record<string, { count: number; conversions: any[] }> = {};
  for (const a of assignments) {
    if (!byVariant[a.variant]) {
      byVariant[a.variant] = { count: 0, conversions: [] };
    }
    byVariant[a.variant].count++;
    if (a.metadata) {
      const meta = JSON.parse(a.metadata);
      byVariant[a.variant].conversions.push(...(meta.conversions || []));
    }
  }

  return {
    experimentKey,
    totalAssignments: assignments.length,
    byVariant,
  };
}
