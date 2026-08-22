/**
 * Standardized API response helpers.
 * Memastikan konsistensi format response + headers keamanan.
 */

import { NextResponse } from "next/server";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

interface SuccessResponseOptions<T> {
  data: T;
  status?: number;
  headers?: Record<string, string>;
}

export function ok<T>(options: SuccessResponseOptions<T>) {
  const { data, status = 200, headers = {} } = options;
  return NextResponse.json(data, {
    status,
    headers: { ...SECURITY_HEADERS, ...headers },
  });
}

interface ErrorResponseOptions {
  error: string;
  status?: number;
  details?: string | object;
  headers?: Record<string, string>;
}

export function err(options: ErrorResponseOptions) {
  const { error, status = 500, details, headers = {} } = options;
  const body: any = { error };
  if (details) body.details = details;
  return NextResponse.json(body, {
    status,
    headers: { ...SECURITY_HEADERS, ...headers },
  });
}

/**
 * Shorthand untuk response error umum
 */
export const ApiError = {
  badRequest: (error: string, details?: any) =>
    err({ error, status: 400, details }),
  unauthorized: (error = "Unauthorized") =>
    err({ error, status: 401 }),
  forbidden: (error = "Forbidden") =>
    err({ error, status: 403 }),
  notFound: (error = "Not found") =>
    err({ error, status: 404 }),
  conflict: (error: string, details?: any) =>
    err({ error, status: 409, details }),
  tooManyRequests: (error: string, retryAfter?: number) =>
    err({
      error,
      status: 429,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : {},
    }),
  serverError: (error = "Internal server error") =>
    err({ error, status: 500 }),
  serviceUnavailable: (error: string) =>
    err({ error, status: 503 }),
};

/**
 * Wrap a handler dengan try-catch standar + security headers.
 */
export function safeHandler<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[API Error]", err);
      return ApiError.serverError(
        err instanceof Error ? err.message : "Terjadi kesalahan server"
      );
    }
  }) as T;
}
