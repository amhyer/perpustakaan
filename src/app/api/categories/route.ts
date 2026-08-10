import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const cats = await db.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "LIBRARIAN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const cat = await db.category.create({
    data: { name: body.name, code: body.code, description: body.description || null },
  });
  return NextResponse.json(cat, { status: 201 });
}
