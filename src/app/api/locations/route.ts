import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const locs = await db.location.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(locs);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "LIBRARIAN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const loc = await db.location.create({
    data: { name: body.name, code: body.code, description: body.description || null },
  });
  return NextResponse.json(loc, { status: 201 });
}
