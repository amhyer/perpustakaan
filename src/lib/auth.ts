import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// JWT_SECRET wajib di-set (Tahap 16 #28) — tidak ada fallback default
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable belum diset. Generate secret baru (mis: openssl rand -base64 32) dan set sebagai env var.");
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "ji_session";
const SESSION_DAYS = 7;

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { member: true },
  });
  if (!user) return null;

  // Auto-deactivate expired members (Tahap 16 #4 — expiryDate gated)
  if (user.member && user.member.status === "ACTIVE" && user.member.expiryDate) {
    if (new Date(user.member.expiryDate) < new Date()) {
      await db.member.update({
        where: { id: user.member.id },
        data: { status: "INACTIVE" },
      });
      user.member.status = "INACTIVE";
    }
  }

  if (user.member && user.member.status !== "ACTIVE") return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    member: user.member,
  };
}

// Helper untuk API routes: ambil user wajib login
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function requireRole(...roles: string[]) {
  const result = await requireAuth();
  if (result.error || !result.user) return result;
  if (!roles.includes(result.user.role)) {
    return {
      user: result.user,
      error: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}

// ===== Helper role permission (Tahap 15-F) =====
// PUSTAKAWAN_JUNIOR = tingkat akses terbatas: bisa sirkulasi/anggota/stock
// opname, TAPI tidak bisa Pengaturan, hapus data, atau backup database.

/**
 * Cek apakah role adalah pustakawan (penuh ATAU junior).
 * Dipakai untuk akses yang diizinkan untuk junior:
 * sirkulasi, anggota (read/create/edit), stock opname, catalog, dll.
 */
export function isLibrarian(role: string | undefined | null): boolean {
  return role === "LIBRARIAN" || role === "PUSTAKAWAN_JUNIOR";
}

/**
 * Cek apakah role adalah pustakawan PENUH (bukan junior).
 * Dipakai untuk akses yang DIBLOKIR untuk junior:
 * Pengaturan, hapus data, backup database, CRUD hari libur,
 * CRUD master penerbit/pengarang, hapus lampiran.
 */
export function isFullLibrarian(role: string | undefined | null): boolean {
  return role === "LIBRARIAN";
}

// Helper untuk API routes: wajib login sebagai pustakawan (penuh atau junior)
export async function requireLibrarian() {
  const result = await requireAuth();
  if (result.error || !result.user) return result;
  if (!isLibrarian(result.user.role)) {
    return {
      user: result.user,
      error: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}

// Helper untuk API routes: wajib login sebagai pustakawan PENUH (bukan junior)
export async function requireFullLibrarian() {
  const result = await requireAuth();
  if (result.error || !result.user) return result;
  if (!isFullLibrarian(result.user.role)) {
    return {
      user: result.user,
      error: Response.json({ error: "Akses ditolak. Hanya pustakawan penuh yang dapat melakukan operasi ini." }, { status: 403 }),
    };
  }
  return result;
}

export { COOKIE_NAME };
