import { NextResponse } from "next/server";
import { generateCsrfToken, signCsrfToken } from "@/lib/csrf";

const CSRF_COOKIE_NAME = "ji_csrf";
const CSRF_SECRET = (() => {
  const s = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("CSRF_SECRET atau JWT_SECRET harus diset di environment variables");
  return s;
})();

export async function GET() {
  const token = generateCsrfToken();
  const signature = signCsrfToken(token, CSRF_SECRET);

  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE_NAME, `${token}.${signature}`, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
