/**
 * Request Validation & Size Limits.
 *
 * Sprint J Phase C - Security hardening.
 *
 * Validates incoming requests untuk prevent:
 * - Oversized payloads (DoS via huge bodies)
 * - Suspicious content types
 * - Invalid encoding
 * - Missing required fields
 *
 * Pure validation functions (no Next.js dependencies) untuk
 * easy unit testing.
 */

import { logger } from "@/lib/logger";

// ===== Types =====

export interface RequestSizeLimits {
  /** Max body size in bytes (default: 10MB) */
  maxBodySize: number;
  /** Max URL length in characters (default: 2048) */
  maxUrlLength: number;
  /** Max header size in bytes (default: 16KB) */
  maxHeaderSize: number;
  /** Max JSON nesting depth (default: 10) */
  maxJsonDepth: number;
  /** Max array length in request body (default: 1000) */
  maxArrayLength: number;
  /** Max string length in request body (default: 100KB) */
  maxStringLength: number;
}

export const DEFAULT_LIMITS: RequestSizeLimits = {
  maxBodySize: 10 * 1024 * 1024, // 10MB
  maxUrlLength: 2048,
  maxHeaderSize: 16 * 1024, // 16KB
  maxJsonDepth: 10,
  maxArrayLength: 1000,
  maxStringLength: 100 * 1024, // 100KB
};

// Per-route limits (tighter for sensitive endpoints)
export const ROUTE_LIMITS: Record<string, Partial<RequestSizeLimits>> = {
  "/api/auth/login": { maxBodySize: 1024 }, // Just email + password
  "/api/auth/register": { maxBodySize: 5 * 1024 },
  "/api/auth/2fa": { maxBodySize: 1024 },
  "/api/ai/": { maxBodySize: 50 * 1024 }, // AI requests (chat messages)
  "/api/chat": { maxBodySize: 50 * 1024 },
  "/api/rfid/scan": { maxBodySize: 1024 },
  "/api/books/lookup": { maxBodySize: 1024 },
};

// ===== Helpers =====

/**
 * Calculate byte size of string.
 */
export function byteSize(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * Get appropriate limits for a path.
 */
export function getLimitsForPath(pathname: string): RequestSizeLimits {
  // Find most specific match
  for (const [pattern, partial] of Object.entries(ROUTE_LIMITS).sort(
    (a, b) => b[0].length - a[0].length
  )) {
    if (pathname.startsWith(pattern)) {
      return { ...DEFAULT_LIMITS, ...partial };
    }
  }
  return DEFAULT_LIMITS;
}

/**
 * Validate URL length.
 */
export function validateUrl(url: string, maxLength: number = DEFAULT_LIMITS.maxUrlLength): {
  valid: boolean;
  reason?: string;
} {
  if (url.length > maxLength) {
    return { valid: false, reason: `URL terlalu panjang (${url.length} > ${maxLength})` };
  }
  return { valid: true };
}

/**
 * Validate request body size from Content-Length header.
 */
export function validateBodySize(
  contentLength: number,
  maxSize: number = DEFAULT_LIMITS.maxBodySize
): { valid: boolean; reason?: string } {
  if (contentLength > maxSize) {
    const sizeMB = (contentLength / 1024 / 1024).toFixed(2);
    const maxMB = (maxSize / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      reason: `Body terlalu besar (${sizeMB}MB > ${maxMB}MB)`,
    };
  }
  return { valid: true };
}

/**
 * Validate Content-Type header.
 */
const ALLOWED_CONTENT_TYPES = [
  "application/json",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
];

export function validateContentType(
  contentType: string | null,
  allowed: string[] = ALLOWED_CONTENT_TYPES
): { valid: boolean; reason?: string } {
  if (!contentType) {
    return { valid: false, reason: "Content-Type header wajib diisi" };
  }
  // Extract main type (before semicolon for charset)
  const mainType = contentType.split(";")[0].trim().toLowerCase();
  if (!allowed.includes(mainType)) {
    return {
      valid: false,
      reason: `Content-Type "${mainType}" tidak diizinkan. Gunakan: ${allowed.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Validate headers size (sum of all headers).
 */
export function validateHeadersSize(
  headers: Headers,
  maxSize: number = DEFAULT_LIMITS.maxHeaderSize
): { valid: boolean; reason?: string; size?: number } {
  let totalSize = 0;
  headers.forEach((value, key) => {
    totalSize += key.length + value.length + 4; // "key: value\r\n"
  });
  if (totalSize > maxSize) {
    return {
      valid: false,
      reason: `Headers terlalu besar (${totalSize} > ${maxSize})`,
      size: totalSize,
    };
  }
  return { valid: true, size: totalSize };
}

/**
 * Validate JSON body structure (depth, array length, string length).
 */
export function validateJsonStructure(
  data: any,
  limits: Partial<RequestSizeLimits> = {},
  currentDepth: number = 0
): { valid: boolean; reason?: string; path?: string } {
  const maxDepth = limits.maxJsonDepth ?? DEFAULT_LIMITS.maxJsonDepth;
  const maxArrayLength = limits.maxArrayLength ?? DEFAULT_LIMITS.maxArrayLength;
  const maxStringLength = limits.maxStringLength ?? DEFAULT_LIMITS.maxStringLength;

  if (currentDepth > maxDepth) {
    return { valid: false, reason: `JSON terlalu dalam (depth > ${maxDepth})` };
  }

  if (data === null || data === undefined) {
    return { valid: true };
  }

  if (Array.isArray(data)) {
    if (data.length > maxArrayLength) {
      return {
        valid: false,
        reason: `Array terlalu panjang (${data.length} > ${maxArrayLength})`,
      };
    }
    for (let i = 0; i < data.length; i++) {
      const result = validateJsonStructure(data[i], limits, currentDepth + 1);
      if (!result.valid) {
        return { ...result, path: `[${i}]${result.path || ""}` };
      }
    }
    return { valid: true };
  }

  if (typeof data === "string") {
    if (data.length > maxStringLength) {
      return {
        valid: false,
        reason: `String terlalu panjang (${data.length} > ${maxStringLength})`,
      };
    }
    return { valid: true };
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length > 100) {
      return {
        valid: false,
        reason: `Object memiliki terlalu banyak keys (${keys.length} > 100)`,
      };
    }
    for (const key of keys) {
      const result = validateJsonStructure(data[key], limits, currentDepth + 1);
      if (!result.valid) {
        return { ...result, path: `.${key}${result.path || ""}` };
      }
    }
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Comprehensive request validation.
 * Returns first error found, or { valid: true } if all checks pass.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  field?: string;
}

export function validateRequest(
  url: string,
  contentLength: number | null,
  contentType: string | null,
  body: any,
  pathname: string
): ValidationResult {
  const limits = getLimitsForPath(pathname);

  // 1. URL length
  const urlCheck = validateUrl(url, limits.maxUrlLength);
  if (!urlCheck.valid) {
    return { valid: false, reason: urlCheck.reason, field: "url" };
  }

  // 2. Body size
  if (contentLength !== null) {
    const sizeCheck = validateBodySize(contentLength, limits.maxBodySize);
    if (!sizeCheck.valid) {
      return { valid: false, reason: sizeCheck.reason, field: "body" };
    }
  }

  // 3. Content-Type
  if (contentLength !== null && contentLength > 0) {
    const typeCheck = validateContentType(contentType);
    if (!typeCheck.valid) {
      return { valid: false, reason: typeCheck.reason, field: "content-type" };
    }
  }

  // 4. JSON structure (if body is parsed)
  if (body !== undefined) {
    const structureCheck = validateJsonStructure(body, limits);
    if (!structureCheck.valid) {
      return {
        valid: false,
        reason: structureCheck.reason,
        field: structureCheck.path || "body",
      };
    }
  }

  return { valid: true };
}

/**
 * Create a 413 (Payload Too Large) response.
 */
export function payloadTooLargeResponse(reason: string): Response {
  return new Response(
    JSON.stringify({
      error: reason,
      code: "PAYLOAD_TOO_LARGE",
    }),
    {
      status: 413,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Create a 415 (Unsupported Media Type) response.
 */
export function unsupportedMediaTypeResponse(reason: string): Response {
  return new Response(
    JSON.stringify({
      error: reason,
      code: "UNSUPPORTED_MEDIA_TYPE",
    }),
    {
      status: 415,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Log request validation failure.
 */
export function logValidationFailure(
  path: string,
  result: ValidationResult,
  ip: string
): void {
  logger.warn("Request validation failed", {
    path,
    field: result.field,
    reason: result.reason,
    ip,
  });
}
