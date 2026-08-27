import { describe, it, expect } from "vitest";
import {
  getDashboardVariant,
  getMemberNavKeys,
  canAccessLibraryStats,
  canAccessAllProposals,
  canAccessLiteracyReport,
  showsGamification,
  showsClassOverview,
  showsStudentDiscovery,
  isTeacherRole,
  isStudentRole,
  isMemberRole,
  TEACHER_NAV_KEYS,
  STUDENT_NAV_KEYS,
  MEMBER_NAV_GROUPS,
} from "../role-access";

describe("getDashboardVariant", () => {
  it("TEACHER → teacher", () => {
    expect(getDashboardVariant("TEACHER")).toBe("teacher");
  });

  it("STUDENT → student", () => {
    expect(getDashboardVariant("STUDENT")).toBe("student");
  });

  it("role lain / kosong tidak pernah dianggap guru", () => {
    expect(getDashboardVariant("LIBRARIAN")).toBe("student");
    expect(getDashboardVariant(null)).toBe("student");
    expect(getDashboardVariant(undefined)).toBe("student");
  });
});

describe("akses data sekolah", () => {
  it("hanya pustakawan yang boleh lihat /api/stats", () => {
    expect(canAccessLibraryStats("LIBRARIAN")).toBe(true);
    expect(canAccessLibraryStats("PUSTAKAWAN_JUNIOR")).toBe(true);
    expect(canAccessLibraryStats("TEACHER")).toBe(false);
    expect(canAccessLibraryStats("STUDENT")).toBe(false);
  });

  it("anggota tidak boleh lihat semua usulan orang lain", () => {
    expect(canAccessAllProposals("LIBRARIAN")).toBe(true);
    expect(canAccessAllProposals("PUSTAKAWAN_JUNIOR")).toBe(true);
    expect(canAccessAllProposals("TEACHER")).toBe(false);
    expect(canAccessAllProposals("STUDENT")).toBe(false);
  });

  it("laporan literasi: pustakawan + guru, bukan siswa", () => {
    expect(canAccessLiteracyReport("LIBRARIAN")).toBe(true);
    expect(canAccessLiteracyReport("PUSTAKAWAN_JUNIOR")).toBe(true);
    expect(canAccessLiteracyReport("TEACHER")).toBe(true);
    expect(canAccessLiteracyReport("STUDENT")).toBe(false);
  });
});

describe("widget dashboard", () => {
  it("gamifikasi hanya siswa", () => {
    expect(showsGamification("STUDENT")).toBe(true);
    expect(showsGamification("TEACHER")).toBe(false);
    expect(showsGamification("LIBRARIAN")).toBe(false);
  });

  it("ringkasan kelas hanya guru", () => {
    expect(showsClassOverview("TEACHER")).toBe(true);
    expect(showsClassOverview("STUDENT")).toBe(false);
  });

  it("rekomendasi & teman sekelas hanya siswa", () => {
    expect(showsStudentDiscovery("STUDENT")).toBe(true);
    expect(showsStudentDiscovery("TEACHER")).toBe(false);
  });
});

describe("role helpers", () => {
  it("membedakan guru, siswa, anggota", () => {
    expect(isTeacherRole("TEACHER")).toBe(true);
    expect(isStudentRole("STUDENT")).toBe(true);
    expect(isMemberRole("TEACHER")).toBe(true);
    expect(isMemberRole("STUDENT")).toBe(true);
    expect(isMemberRole("LIBRARIAN")).toBe(false);
    expect(isTeacherRole("STUDENT")).toBe(false);
    expect(isStudentRole("TEACHER")).toBe(false);
  });
});

describe("menu anggota", () => {
  it("guru dan siswa sama-sama self-service, termasuk usulan sendiri", () => {
    expect(getMemberNavKeys("TEACHER")).toContain("proposals");
    expect(getMemberNavKeys("STUDENT")).toContain("proposals");
    expect(getMemberNavKeys("TEACHER")).toContain("my-dashboard");
    expect(getMemberNavKeys("STUDENT")).toContain("my-dashboard");
  });

  it("menu tidak memuat halaman operasional pustakawan", () => {
    for (const keys of [TEACHER_NAV_KEYS, STUDENT_NAV_KEYS]) {
      expect(keys).not.toContain("dashboard");
      expect(keys).not.toContain("circulation");
      expect(keys).not.toContain("members");
      expect(keys).not.toContain("executive-dashboard");
    }
    expect(STUDENT_NAV_KEYS).not.toContain("settings");
  });

  it("guru punya Pengaturan profil sendiri, siswa tidak", () => {
    expect(getMemberNavKeys("TEACHER")).toContain("settings");
    expect(getMemberNavKeys("STUDENT")).not.toContain("settings");
  });
});
