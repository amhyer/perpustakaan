import { NextResponse } from "next/server";
import { lookupISBN } from "@/lib/isbn-lookup";
import { requireLibrarian } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const isbn = searchParams.get("isbn")?.trim();

  if (!isbn) {
    return NextResponse.json({ error: "Parameter isbn wajib diisi" }, { status: 400 });
  }

  // Validate ISBN format (10 or 13 digits, allow dashes/spaces)
  const cleaned = isbn.replace(/[-\s]/g, "");
  const isValidISBN = /^\d{10}$|^\d{13}$/.test(cleaned);
  if (!isValidISBN) {
    return NextResponse.json(
      { error: "Format ISBN tidak valid (harus 10 atau 13 digit)" },
      { status: 400 }
    );
  }

  try {
    const result = await lookupISBN(cleaned);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { status: "ERROR", message: "Terjadi kesalahan saat mencari data buku" },
      { status: 500 }
    );
  }
}
