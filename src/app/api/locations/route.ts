import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireFullLibrarian } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const locs = await db.location.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(locs);
}

export async function POST(req: Request) {
  const { error } = await requireFullLibrarian();
  if (error) return error;
  const body = await req.json();
  const loc = await db.location.create({
    data: { name: body.name, code: body.code, description: body.description || null },
  });
  return NextResponse.json(loc, { status: 201 });
}
