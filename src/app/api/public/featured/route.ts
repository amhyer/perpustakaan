import { NextResponse } from "next/server";
import { getFeaturedBook } from "@/lib/featured-book";

/** GET /api/public/featured — Buku Minggu Ini saja, tanpa memuat seluruh katalog. */
export async function GET() {
  return NextResponse.json({ featured: await getFeaturedBook() });
}
