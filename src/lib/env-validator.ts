/**
 * Environment Variable Validator.
 *
 * Sprint H - Production Readiness.
 *
 * Validates all required env vars at app startup.
 * Fails fast with clear error messages (better than cryptic runtime errors).
 *
 * Auto-generated Zod-like validation (no new deps).
 *
 * Usage:
 *   import { validateEnv } from '@/lib/env-validator';
 *   validateEnv(); // call once at startup
 */

import { logger } from "@/lib/logger";

interface EnvRule {
  key: string;
  required: boolean;
  type: "string" | "number" | "url" | "secret";
  minLength?: number;
  description: string;
  validate?: (value: string) => string | null; // returns error or null
  /** Cross-field validation, runs even when value is empty (for conditional requirements) */
  crossFieldValidate?: () => string | null;
}

const RULES: EnvRule[] = [
  {
    key: "DATABASE_URL",
    required: true,
    type: "url",
    description: "Database connection string",
    validate: (v) => (v.startsWith("file:") || v.startsWith("postgres") ? null : "Must start with 'file:' or 'postgres://'"),
  },
  {
    key: "JWT_SECRET",
    required: true,
    type: "secret",
    minLength: 32,
    description: "JWT signing secret (min 32 chars)",
    validate: (v) => {
      if (v.length < 32) return "Must be at least 32 characters";
      if (v === "CHANGE-ME" || v.startsWith("CHANGE-ME-")) return "Must be changed from default";
      if (v === "your-secret-here" || v.length < 16) return "Looks like a placeholder";
      return null;
    },
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: true,
    type: "url",
    description: "Public app URL (for emails, redirects)",
  },
  {
    key: "WS_PORT",
    required: false,
    type: "number",
    description: "WebSocket server port (default: 3003)",
  },
  {
    key: "AI_PROVIDER",
    required: false,
    type: "string",
    description: "AI provider for chat assistant (openai|anthropic|google|mock)",
    validate: (v) =>
      ["openai", "anthropic", "google", "mock"].includes(v)
        ? null
        : "Must be one of: openai, anthropic, google, mock",
  },
  {
    key: "AI_API_KEY",
    required: false,
    type: "secret",
    description: "API key for AI provider (required if provider != mock)",
    crossFieldValidate: () => {
      // Check if AI provider is not mock and key is missing
      const provider = process.env.AI_PROVIDER || "mock";
      if (provider !== "mock" && !process.env.AI_API_KEY) {
        return "Required when AI_PROVIDER is not 'mock'";
      }
      return null;
    },
  },
];

let validated = false;

/**
 * Reset validation state. Used for testing.
 */
export function resetValidation(): void {
  validated = false;
}

/**
 * Validate all environment variables.
 * Throws on critical errors, warns on warnings.
 */
export function validateEnv(opts: { strict?: boolean; force?: boolean } = {}): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  if (validated && !opts.strict && !opts.force) {
    return { valid: true, errors: [], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of RULES) {
    const value = process.env[rule.key];
    const isEmpty = !value || value.trim() === "";

    if (rule.required && isEmpty) {
      errors.push(`❌ ${rule.key} is required but not set (${rule.description})`);
      continue;
    }

    if (isEmpty) {
      // Empty optional — check cross-field validation (e.g. AI_API_KEY needed when provider != mock)
      if (rule.crossFieldValidate) {
        const err = rule.crossFieldValidate();
        if (err) {
          if (rule.required) {
            errors.push(`❌ ${rule.key}: ${err}`);
          } else {
            warnings.push(`⚠️  ${rule.key}: ${err}`);
          }
        }
      } else if (rule.type === "secret") {
        // Don't warn for empty optional secrets
        continue;
      } else {
        warnings.push(`⚠️  ${rule.key} is not set (${rule.description})`);
        continue;
      }
    }

    // Type validation
    if (rule.type === "number" && isNaN(Number(value))) {
      errors.push(`❌ ${rule.key} must be a number, got: ${value}`);
    }

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`❌ ${rule.key} must be at least ${rule.minLength} chars (got ${value.length})`);
    }

    // Custom validation
    if (rule.validate) {
      const err = rule.validate(value);
      if (err) {
        if (rule.required) {
          errors.push(`❌ ${rule.key}: ${err}`);
        } else {
          warnings.push(`⚠️  ${rule.key}: ${err}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    logger.error("Environment validation failed", { errors });
    if (opts.strict || process.env.NODE_ENV === "production") {
      throw new Error(
        `Environment validation failed:\n${errors.join("\n")}\n` +
          `Fix these in your .env or hosting dashboard before deploying.`
      );
    } else {
      // In dev, log but don't crash
      logger.warn("Environment validation issues", { errors, warnings });
    }
  }

  if (warnings.length > 0) {
    logger.info("Environment validation warnings", { warnings });
  }

  validated = true;
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get current environment config summary.
 */
export function getEnvSummary(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL_PROVIDER: process.env.DATABASE_URL?.startsWith("file:")
      ? "sqlite"
      : "postgres",
    AI_PROVIDER: process.env.AI_PROVIDER || "mock",
    HAS_JWT_SECRET: process.env.JWT_SECRET ? "yes" : "no",
    WS_ENABLED: process.env.WS_PORT ? "yes" : "no",
    APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}
