import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const schools = await db.schoolLibrary.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(schools);
  } catch (err) {
    console.error("GET inter-library/schools error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
