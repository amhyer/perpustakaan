import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getPredictiveDashboard } from "@/lib/predictive-analytics";

/**
 * GET /api/analytics/predictive — Predictive dashboard untuk pustakawan.
 *
 * Returns:
 * - loans: forecast loans/minggu (4 minggu ke depan)
 * - members: forecast active members/bulan (3 bulan ke depan)
 * - anomalies: spike/drop detection
 * - stockOut: prediksi buku yang akan habis
 * - genreTrends: genre paling naik/turun
 */
export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const dashboard = await getPredictiveDashboard();
    return NextResponse.json(dashboard);
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal generate predictive analytics" },
      { status: 500 }
    );
  }
}
