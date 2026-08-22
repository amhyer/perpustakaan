/**
 * Unit tests untuk DASHBOARD_VIEW_LABELS & DASHBOARD_OPTIONS_BY_ROLE.
 *
 * Memvalidasi role-based options di constants. Sprint 4 — Fix #9.
 */

import { describe, it, expect } from "vitest";
import {
  DASHBOARD_VIEW_LABELS,
  DASHBOARD_OPTIONS_BY_ROLE,
  VALID_DASHBOARD_VIEWS,
} from "../constants";

describe("Dashboard preference constants", () => {
  describe("DASHBOARD_VIEW_LABELS", () => {
    it("has label for 'default' (auto-route)", () => {
      expect(DASHBOARD_VIEW_LABELS["default"]).toBe("Otomatis (berdasarkan role)");
    });

    it("has label for all 4 main dashboard types", () => {
      expect(DASHBOARD_VIEW_LABELS["dashboard"]).toBeDefined();
      expect(DASHBOARD_VIEW_LABELS["customizable-dashboard"]).toBeDefined();
      expect(DASHBOARD_VIEW_LABELS["executive-dashboard"]).toBeDefined();
      expect(DASHBOARD_VIEW_LABELS["my-dashboard"]).toBeDefined();
    });
  });

  describe("DASHBOARD_OPTIONS_BY_ROLE", () => {
    it("LIBRARIAN has full set of options", () => {
      const options = DASHBOARD_OPTIONS_BY_ROLE["LIBRARIAN"];
      expect(options).toContain("default");
      expect(options).toContain("dashboard");
      expect(options).toContain("customizable-dashboard");
      expect(options).toContain("executive-dashboard");
      expect(options).not.toContain("my-dashboard"); // LIBRARIAN tidak perlu my-dashboard
    });

    it("PUSTAKAWAN_JUNIOR has restricted options (no executive)", () => {
      const options = DASHBOARD_OPTIONS_BY_ROLE["PUSTAKAWAN_JUNIOR"];
      expect(options).toContain("default");
      expect(options).toContain("dashboard");
      expect(options).not.toContain("executive-dashboard"); // Junior tidak boleh
      expect(options).not.toContain("customizable-dashboard");
    });

    it("TEACHER only has 'default' and 'my-dashboard'", () => {
      const options = DASHBOARD_OPTIONS_BY_ROLE["TEACHER"];
      expect(options).toEqual(["default", "my-dashboard"]);
    });

    it("STUDENT only has 'default' and 'my-dashboard'", () => {
      const options = DASHBOARD_OPTIONS_BY_ROLE["STUDENT"];
      expect(options).toEqual(["default", "my-dashboard"]);
    });

    it("TEACHER/STUDENT tidak boleh akses executive/customizable", () => {
      // Security: pastikan TEACHER/STUDENT tidak punya opsi pustakawan
      const teacherOptions = DASHBOARD_OPTIONS_BY_ROLE["TEACHER"];
      const studentOptions = DASHBOARD_OPTIONS_BY_ROLE["STUDENT"];
      expect(teacherOptions).not.toContain("executive-dashboard");
      expect(teacherOptions).not.toContain("customizable-dashboard");
      expect(teacherOptions).not.toContain("dashboard"); // dashboard = standard pustakawan
      expect(studentOptions).not.toContain("executive-dashboard");
      expect(studentOptions).not.toContain("customizable-dashboard");
      expect(studentOptions).not.toContain("dashboard");
    });
  });

  describe("VALID_DASHBOARD_VIEWS", () => {
    it("contains all valid view keys", () => {
      expect(VALID_DASHBOARD_VIEWS.has("default")).toBe(true);
      expect(VALID_DASHBOARD_VIEWS.has("dashboard")).toBe(true);
      expect(VALID_DASHBOARD_VIEWS.has("customizable-dashboard")).toBe(true);
      expect(VALID_DASHBOARD_VIEWS.has("executive-dashboard")).toBe(true);
      expect(VALID_DASHBOARD_VIEWS.has("my-dashboard")).toBe(true);
    });

    it("does not contain invalid view keys", () => {
      expect(VALID_DASHBOARD_VIEWS.has("invalid-view")).toBe(false);
      expect(VALID_DASHBOARD_VIEWS.has("")).toBe(false);
      expect(VALID_DASHBOARD_VIEWS.has("admin")).toBe(false);
    });
  });
});
