import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type RouteHandler = (req: Request, context?: any) => Promise<NextResponse>;

/**
 * Wraps a route handler with try/catch error handling.
 * Returns 500 JSON response for unhandled errors.
 * Logs the error for debugging.
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (err: any) {
      logger.error(`Unhandled error in ${req.method} ${new URL(req.url).pathname}`, {
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
