import { NextResponse } from "next/server";
import { requireFullLibrarian } from "@/lib/auth";
import { getSystemMetrics, getAllRouteMetrics } from "@/lib/performance-monitor";

/**
 * GET /api/admin/metrics — Performance metrics untuk monitoring.
 *
 * Returns system-wide metrics + per-route breakdown.
 * Restricted to full librarians (not junior).
 */
export async function GET() {
  const { user, error } = await requireFullLibrarian();
  if (error || !user) return error;

  const system = getSystemMetrics();
  const routes = getAllRouteMetrics();

  return NextResponse.json({
    system,
    routes: routes.slice(0, 50), // top 50 routes
    totalRoutes: routes.length,
  });
}
