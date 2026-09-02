// API client untuk fetch dari sisi klien
import type { Role } from "@/lib/constants";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  member: {
    id: string;
    memberNumber: string;
    fullName: string;
    category: string;
    photo: string | null;
    classGrade: string | null;
  } | null;
  /** View yang dipilih user sebagai default (Sprint 4 — Fix #9). 'default' = auto-route. */
  defaultDashboard: string;
}

/**
 * Read CSRF token from cookie (ji_csrf).
 * Cookie format: token.signature — we need the token part.
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "ji_csrf" && value) {
      try {
        const decoded = decodeURIComponent(value);
        const dotIndex = decoded.lastIndexOf(".");
        if (dotIndex > 0) {
          return decoded.substring(0, dotIndex);
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

// CSRF-exempt methods (safe methods don't need CSRF)
const CSRF_EXEMPT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();

  // Build headers — include CSRF token for mutating requests
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };

  if (!CSRF_EXEMPT_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    let message = `Request gagal (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
