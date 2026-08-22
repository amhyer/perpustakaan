/**
 * Feature flags — enable/disable features tanpa deploy.
 *
 * Cocok untuk:
 * - A/B testing
 * - Gradual rollout (release ke 10% user dulu)
 * - Emergency kill switch
 * - Seasonal features
 *
 * Usage:
 *   if (await isFeatureEnabled("new_dashboard")) {
 *     return <NewDashboard />;
 *   }
 *   return <OldDashboard />;
 *
 * Untuk production, integrate dengan LaunchDarkly / Unleash / PostHog.
 */

import { cache, CACHE_TTL } from "./cache";
import { db } from "./db";

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  /** Optional rollout percentage (0-100). Only used if enabled=true */
  rolloutPercent?: number;
  description?: string;
  /** Optional expiry */
  expiresAt?: Date;
  /** Target roles (kosong = semua) */
  roles?: string[];
}

const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  // Contoh flags (enabled untuk development, disable di production)
  experimental_ai_recommendation: {
    key: "experimental_ai_recommendation",
    enabled: false,
    description: "AI-powered book recommendations using ML model",
  },
  new_dashboard_v2: {
    key: "new_dashboard_v2",
    enabled: false,
    rolloutPercent: 10,
    description: "Redesigned dashboard with new analytics",
  },
  whatsapp_broadcast_enabled: {
    key: "whatsapp_broadcast_enabled",
    enabled: true,
    description: "Allow pustakawan to broadcast via WhatsApp",
  },
  gamification_enabled: {
    key: "gamification_enabled",
    enabled: true,
    description: "Reading goals, badges, leaderboard",
    roles: ["STUDENT", "TEACHER"],
  },
  kiosk_mode_enabled: {
    key: "kiosk_mode_enabled",
    enabled: true,
    description: "Public kiosk mode for self-service",
  },
  api_keys_enabled: {
    key: "api_keys_enabled",
    enabled: true,
    description: "External API integration via API keys",
  },
  // Add more flags here
};

/**
 * Get all feature flags (from DB overrides + defaults).
 */
export async function getAllFeatureFlags(): Promise<Record<string, FeatureFlag>> {
  const cached = cache.get<Record<string, FeatureFlag>>("feature_flags:all");
  if (cached) return cached;

  try {
    // Future: load from DB
    // const overrides = await db.featureFlagOverride.findMany();
    // for (const o of overrides) { DEFAULT_FLAGS[o.key] = { ...DEFAULT_FLAGS[o.key], enabled: o.enabled }; }

    cache.set("feature_flags:all", DEFAULT_FLAGS, CACHE_TTL.ONE_MINUTE);
    return DEFAULT_FLAGS;
  } catch {
    return DEFAULT_FLAGS;
  }
}

/**
 * Check if feature is enabled.
 * Considers:
 * - Default value
 * - Rollout percentage (deterministic based on userId hash)
 * - Role-based access
 * - Expiry
 */
export async function isFeatureEnabled(
  key: string,
  context?: { userId?: string; role?: string }
): Promise<boolean> {
  const flags = await getAllFeatureFlags();
  const flag = flags[key];

  if (!flag) {
    // Unknown flag = conservative: disable
    return false;
  }

  if (!flag.enabled) return false;

  // Expiry check
  if (flag.expiresAt && new Date() > flag.expiresAt) return false;

  // Role check
  if (flag.roles && flag.roles.length > 0) {
    if (!context?.role || !flag.roles.includes(context.role)) return false;
  }

  // Rollout percentage (deterministic)
  if (flag.rolloutPercent !== undefined && flag.rolloutPercent < 100) {
    if (!context?.userId) return false;
    const hash = simpleHash(`${key}:${context.userId}`);
    const bucket = hash % 100;
    if (bucket >= flag.rolloutPercent) return false;
  }

  return true;
}

/**
 * Check multiple flags at once.
 */
export async function areFeaturesEnabled(
  keys: string[],
  context?: { userId?: string; role?: string }
): Promise<Record<string, boolean>> {
  const checks = await Promise.all(
    keys.map((k) => isFeatureEnabled(k, context))
  );
  return Object.fromEntries(keys.map((k, i) => [k, checks[i]]));
}

/**
 * Simple deterministic hash (FNV-1a-ish).
 * Returns 0-2^32-1.
 */
function simpleHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}

/**
 * Refresh cache — call setelah update flag.
 */
export function invalidateFeatureFlagsCache() {
  cache.invalidate("feature_flags:all");
}
