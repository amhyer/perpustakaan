/**
 * School Analytics API.
 */

import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import { getSchoolAnalytics } from "@/lib/school-analytics";

export async function GET() {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    const analytics = await getSchoolAnalytics();
    return NextResponse.json({
      ...analytics,
      generatedAt: new Date().toISOString(),
      generatedBy: user!.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal menghasilkan analitik", detail: err.message },
      { status: 500 }
    );
  }
}
