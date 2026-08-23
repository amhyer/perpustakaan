/**
 * PWA Status API — Health check for PWA configuration.
 *
 * GET /api/pwa/status
 *   Returns: PWA configuration status, icon availability, service worker status
 *
 * Used by PWA audit tools and install verification.
 */

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const checks: Record<string, { status: "ok" | "missing" | "error"; detail?: string }> = {};

  // Check manifest.json
  try {
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);
    checks.manifest = {
      status: "ok",
      detail: `name: ${manifest.name}, display: ${manifest.display}, ${manifest.icons?.length || 0} icons`,
    };
  } catch {
    checks.manifest = { status: "missing", detail: "manifest.json not found" };
  }

  // Check service worker
  try {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    await fs.access(swPath);
    checks.serviceWorker = { status: "ok", detail: "sw.js found" };
  } catch {
    checks.serviceWorker = { status: "missing" };
  }

  // Check icons
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const iconStatus: Record<string, boolean> = {};
  for (const size of iconSizes) {
    try {
      const iconPath = path.join(process.cwd(), "public", "icons", `icon-${size}.png`);
      await fs.access(iconPath);
      iconStatus[`icon-${size}.png`] = true;
    } catch {
      iconStatus[`icon-${size}.png`] = false;
    }
  }
  const pngCount = Object.values(iconStatus).filter(Boolean).length;
  checks.icons = {
    status: pngCount >= 4 ? "ok" : pngCount > 0 ? "error" : "missing",
    detail: `${pngCount}/${iconSizes.length} PNG icons present (SVG icons also count)`,
  };

  // Check SVG icons (always present as fallback)
  try {
    const svgPath = path.join(process.cwd(), "public", "icons", "icon-192.svg");
    await fs.access(svgPath);
    checks.svgIcons = { status: "ok", detail: "SVG icons always available" };
  } catch {
    checks.svgIcons = { status: "missing" };
  }

  // Overall
  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json({
    ready: allOk,
    timestamp: new Date().toISOString(),
    checks,
    recommendations: allOk
      ? ["PWA siap untuk instalasi!"]
      : [
          pngCount < 4
            ? "Generate PNG icons dari SVG untuk support penuh di semua device"
            : null,
          checks.serviceWorker.status !== "ok"
            ? "Pastikan sw.js ada di /public/sw.js"
            : null,
          checks.manifest.status !== "ok"
            ? "Pastikan manifest.json valid di /public/manifest.json"
            : null,
        ].filter(Boolean),
  });
}
