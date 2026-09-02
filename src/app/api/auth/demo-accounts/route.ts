import { NextResponse } from "next/server";

/**
 * GET /api/auth/demo-accounts — Return demo credentials (development only).
 *
 * In production, returns empty array so passwords are never exposed in client bundle.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ accounts: [] });
  }

  return NextResponse.json({
    accounts: [
      {
        role: "Pustakawan",
        email: "pustakawan@jendelailmu.sch.id",
        password: "password123",
      },
      {
        role: "Guru",
        email: "budi@jendelailmu.sch.id",
        password: "password123",
      },
      {
        role: "Siswa",
        email: "andini@jendelailmu.sch.id",
        password: "password123",
      },
    ],
  });
}
