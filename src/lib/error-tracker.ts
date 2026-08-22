/**
 * Error Tracker — light-weight in-house error tracking.
 *
 * Untuk production sekolah yang mungkin tidak mau pakai Sentry (biaya + privacy),
 * tracker ini menyimpan error ke tabel ErrorLog lokal dan menyediakan view
 * untuk pustakawan.
 *
 * Schema:
 * - ErrorLog (id, message, stack, context, userId, url, method, statusCode, level, createdAt)
 *
 * Untuk deployment skala besar, bisa di-extend ke Sentry/GlitchTip via env.
 */

import { db } from "@/lib/db";

export type ErrorLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

interface ErrorContext {
  userId?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

interface LogErrorOptions {
  level?: ErrorLevel;
  context?: ErrorContext;
}

/**
 * Log error ke database.
 * Tidak throw — error tracking TIDAK boleh menyebabkan app crash.
 */
export async function logError(
  err: Error | string,
  options: LogErrorOptions = {}
): Promise<void> {
  try {
    const error = typeof err === "string" ? new Error(err) : err;
    const level = options.level || "ERROR";
    const context = options.context || {};

    // Limit stack trace size (DB space)
    const stack = error.stack?.substring(0, 2000) || null;

    await db.errorLog.create({
      data: {
        message: error.message.substring(0, 500),
        stack,
        level,
        userId: context.userId,
        url: context.url,
        method: context.method,
        statusCode: context.statusCode,
        userAgent: context.userAgent,
        ip: context.ip,
        context: Object.keys(context).length > 0 ? JSON.stringify(context) : null,
      },
    });
  } catch (logErr) {
    // Fallback: console.error saja
    console.error("[error-tracker] Gagal log error:", logErr);
    console.error("[error-tracker] Original error:", err);
  }
}

/**
 * Wrapper untuk API route handler — auto-catch & log error.
 *
 * Contoh:
 *   export const GET = withErrorTracking(async (req) => {
 *     // ... handler logic
 *   });
 */
export function withErrorTracking<T = any>(
  handler: (req: Request, ctx: T) => Promise<Response>
) {
  return async (req: Request, ctx: T) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      await logError(error, {
        level: "ERROR",
        context: {
          url: req.url,
          method: req.method,
        },
      });

      return new Response(
        JSON.stringify({
          error: "Terjadi kesalahan server. Tim teknis telah dinotifikasi.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  };
}
