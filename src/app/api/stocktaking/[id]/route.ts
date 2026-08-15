import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireAuth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "LIBRARIAN" && user.role !== "PUSTAKAWAN_JUNIOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const session = await db.stocktakingSession.findUnique({
    where: { id },
    include: {
      scans: {
        include: {
          bookItem: {
            include: {
              book: { select: { id: true, title: true, author: true, coverColor: true } },
            },
          },
        },
        orderBy: { scannedAt: "desc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(session);
}