import { NextResponse } from "next/server";
import { getLibraryHours } from "@/lib/featured-book";

export async function GET() {
  return NextResponse.json(await getLibraryHours());
}
