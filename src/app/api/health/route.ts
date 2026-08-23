import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSystemMetrics } from "@/lib/performance-monitor";

/**
 * GET /api/health — Health check endpoint untuk uptime monitoring.
 *
 * Used by:
 * - Render/Uptime monitoring
 * - Load balancer health checks
 * - External monitoring (Pingdom, UptimeRobot, etc)
 *
 * Returns:
 * - 200 OK if service is healthy
 * - 503 Service Unavailable if critical issues
 *
 * Public endpoint (no auth) — anonymous probes only see basic status.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const detailed = url.searchParams.get("detailed") === "1";

  const start = Date.now();
  const checks: Record<string, "ok" | "error"> = {
    server: "ok",
  };

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Memory check
  const mem = process.memoryUsage();
  const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;
  if (heapPercent > 95) {
    checks.memory = "error";
  } else {
    checks.memory = "ok";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const status = allOk ? 200 : 503;
  const totalDuration = Date.now() - start;

  const response: any = {
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    responseTimeMs: totalDuration,
    checks,
  };

  if (detailed) {
    // Full diagnostics (for internal monitoring tools)
    const metrics = getSystemMetrics();
    response.system = {
      memory: metrics.memory,
      totalRequests: metrics.totalRequests,
      errorRate: metrics.errorRate,
      requestRate: metrics.requestRate,
    };
    response.services = {
      nextjs: process.version,
      node: process.platform,
    };
  }

  return NextResponse.json(response, { status });
}
