import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Invalidate session in DB before clearing cookie
    const session = await getSession();
    if (session) {
      await db.activeSession.deleteMany({
        where: { userId: session.userId },
      });
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST auth/logout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
