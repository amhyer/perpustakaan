/**
 * Unit tests untuk resolveDefaultDashboard di use-app-store.
 *
 * Pure function test — tidak butuh React Testing Library.
 * Memvalidasi logic routing berdasarkan role + preferensi user.
 *
 * Security tests included — pastikan siswa/guru tidak bisa akses
 * dashboard pustakawan (Sprint 4 fix #9 security bug).
 */

import { describe, it, expect } from "vitest";
import { resolveDefaultDashboard } from "../use-app-store";
import type { CurrentUser } from "@/lib/api-client";

// Helper untuk construct user dengan field minimal
function makeUser(role: CurrentUser["role"], defaultDashboard?: string): CurrentUser {
  return {
    id: "u1",
    email: "test@example.com",
    name: "Test User",
    role,
    member: null,
    defaultDashboard: defaultDashboard ?? "default",
  };
}

describe("resolveDefaultDashboard", () => {
  describe("auto-route (no explicit preference)", () => {
    it("LIBRARIAN dengan pref='default' → 'dashboard'", () => {
      expect(resolveDefaultDashboard(makeUser("LIBRARIAN", "default"))).toBe("dashboard");
    });

    it("PUSTAKAWAN_JUNIOR dengan pref='default' → 'dashboard'", () => {
      expect(resolveDefaultDashboard(makeUser("PUSTAKAWAN_JUNIOR", "default"))).toBe("dashboard");
    });

    it("TEACHER dengan pref='default' → 'my-dashboard'", () => {
      expect(resolveDefaultDashboard(makeUser("TEACHER", "default"))).toBe("my-dashboard");
    });

    it("STUDENT dengan pref='default' → 'my-dashboard'", () => {
      expect(resolveDefaultDashboard(makeUser("STUDENT", "default"))).toBe("my-dashboard");
    });

    it("LIBRARIAN tanpa pref (empty) → 'dashboard'", () => {
      const user = makeUser("LIBRARIAN");
      user.defaultDashboard = "" as never;
      expect(resolveDefaultDashboard(user)).toBe("dashboard");
    });
  });

  describe("explicit preferences (LIBRARIAN)", () => {
    it("LIBRARIAN → 'customizable-dashboard' allowed", () => {
      expect(
        resolveDefaultDashboard(makeUser("LIBRARIAN", "customizable-dashboard"))
      ).toBe("customizable-dashboard");
    });

    it("LIBRARIAN → 'executive-dashboard' allowed", () => {
      expect(
        resolveDefaultDashboard(makeUser("LIBRARIAN", "executive-dashboard"))
      ).toBe("executive-dashboard");
    });

    it("LIBRARIAN → 'dashboard' (standard) allowed", () => {
      expect(resolveDefaultDashboard(makeUser("LIBRARIAN", "dashboard"))).toBe("dashboard");
    });

    it("PUSTAKAWAN_JUNIOR → 'customizable-dashboard' allowed", () => {
      // Note: API sebenarnya block ini, tapi store tetap allow
      // (sidebar sudah filter executive-dashboard untuk Junior)
      expect(
        resolveDefaultDashboard(makeUser("PUSTAKAWAN_JUNIOR", "customizable-dashboard"))
      ).toBe("customizable-dashboard");
    });
  });

  describe("explicit preferences (TEACHER/STUDENT)", () => {
    it("TEACHER → 'my-dashboard' allowed", () => {
      expect(resolveDefaultDashboard(makeUser("TEACHER", "my-dashboard"))).toBe("my-dashboard");
    });

    it("STUDENT → 'my-dashboard' allowed", () => {
      expect(resolveDefaultDashboard(makeUser("STUDENT", "my-dashboard"))).toBe("my-dashboard");
    });
  });

  describe("security: TEACHER/STUDENT cannot access pustakawan dashboards", () => {
    it("TEACHER → 'dashboard' should fallback to 'my-dashboard'", () => {
      expect(resolveDefaultDashboard(makeUser("TEACHER", "dashboard"))).toBe("my-dashboard");
    });

    it("STUDENT → 'dashboard' should fallback to 'my-dashboard'", () => {
      expect(resolveDefaultDashboard(makeUser("STUDENT", "dashboard"))).toBe("my-dashboard");
    });

    it("TEACHER → 'executive-dashboard' should fallback to 'my-dashboard'", () => {
      expect(
        resolveDefaultDashboard(makeUser("TEACHER", "executive-dashboard"))
      ).toBe("my-dashboard");
    });

    it("STUDENT → 'customizable-dashboard' should fallback to 'my-dashboard'", () => {
      expect(
        resolveDefaultDashboard(makeUser("STUDENT", "customizable-dashboard"))
      ).toBe("my-dashboard");
    });
  });

  describe("null user", () => {
    it("null user → 'dashboard' (initial state)", () => {
      expect(resolveDefaultDashboard(null)).toBe("dashboard");
    });
  });

  describe("edge cases", () => {
    it("TEACHER dengan pref invalid (typo) → fallback ke 'my-dashboard'", () => {
      // 'executiv' salah ketik — store treat as 'not my-dashboard' → fallback
      expect(
        resolveDefaultDashboard(makeUser("TEACHER", "executiv" as never))
      ).toBe("my-dashboard");
    });

    it("unknown role (edge case future) → fallback ke 'dashboard'", () => {
      // 'ADMIN' dll — bukan LIBRARIAN/PUSTAKAWAN_JUNIOR, jadi dianggap non-pustakawan
      // Tapi pref='default' → fallback ke 'my-dashboard' (non-pustakawan path)
      expect(resolveDefaultDashboard(makeUser("ADMIN" as never, "default"))).toBe("my-dashboard");
    });
  });
});
