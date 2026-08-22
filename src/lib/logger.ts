/**
 * Structured logger untuk server-side.
 *
 * Features:
 * - JSON output (untuk log aggregation tools)
 * - Levels: DEBUG, INFO, WARN, ERROR, FATAL
 * - Request context (auto-detect dari req)
 * - Performance timing helper
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("User logged in", { userId: "u1" });
 *   logger.error("Failed to send email", { error, userId });
 *
 *   // With request context
 *   logger.info("Book created", { ...contextFromRequest(req), bookId: "b1" });
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

// Min level — set via env LOG_LEVEL
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "INFO" : "DEBUG");

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, any>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (process.env.NODE_ENV === "production") {
    // JSON output untuk log aggregation (CloudWatch, GCP, etc)
    return JSON.stringify(entry);
  }
  // Pretty output untuk development
  const color = {
    DEBUG: "\x1b[90m", // gray
    INFO: "\x1b[36m",  // cyan
    WARN: "\x1b[33m",  // yellow
    ERROR: "\x1b[31m", // red
    FATAL: "\x1b[35m", // magenta
  }[level];
  const reset = "\x1b[0m";
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `${color}[${level}]${reset} ${entry.timestamp} ${message}${metaStr}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  if (!shouldLog(level)) return;
  const output = formatLog(level, message, meta);
  if (level === "ERROR" || level === "FATAL") {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, any>) => log("DEBUG", message, meta),
  info: (message: string, meta?: Record<string, any>) => log("INFO", message, meta),
  warn: (message: string, meta?: Record<string, any>) => log("WARN", message, meta),
  error: (message: string, meta?: Record<string, any>) => log("ERROR", message, meta),
  fatal: (message: string, meta?: Record<string, any>) => log("FATAL", message, meta),
};

/**
 * Extract context dari NextRequest untuk logging.
 */
export function contextFromRequest(req: Request): Record<string, any> {
  return {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get("user-agent")?.substring(0, 100),
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      undefined,
    requestId: req.headers.get("x-request-id") || undefined,
  };
}

/**
 * Performance timer helper.
 *
 * Usage:
 *   const timer = logger.startTimer("DB query");
 *   const result = await db.book.findMany();
 *   timer.end({ count: result.length });
 */
export function startTimer(operation: string, meta?: Record<string, any>) {
  const start = Date.now();
  return {
    end: (endMeta?: Record<string, any>) => {
      const durationMs = Date.now() - start;
      log("DEBUG", `${operation} completed`, { ...meta, ...endMeta, durationMs });
      return durationMs;
    },
  };
}

/**
 * Child logger dengan preset context.
 */
export function childLogger(defaultMeta: Record<string, any>) {
  return {
    debug: (msg: string, meta?: Record<string, any>) => log("DEBUG", msg, { ...defaultMeta, ...meta }),
    info: (msg: string, meta?: Record<string, any>) => log("INFO", msg, { ...defaultMeta, ...meta }),
    warn: (msg: string, meta?: Record<string, any>) => log("WARN", msg, { ...defaultMeta, ...meta }),
    error: (msg: string, meta?: Record<string, any>) => log("ERROR", msg, { ...defaultMeta, ...meta }),
  };
}
