/**
 * Unit tests untuk src/lib/auth.ts
 * Test: isLibrarian, isFullLibrarian (pure helpers, no DB)
 */

import { describe, it, expect } from "vitest";
import { isLibrarian, isFullLibrarian } from "../auth";

describe("isLibrarian", () => {
  it("LIBRARIAN → true", () => {
    expect(isLibrarian("LIBRARIAN")).toBe(true);
  });

  it("PUSTAKAWAN_JUNIOR → true", () => {
    expect(isLibrarian("PUSTAKAWAN_JUNIOR")).toBe(true);
  });

  it("TEACHER → false", () => {
    expect(isLibrarian("TEACHER")).toBe(false);
  });

  it("STUDENT → false", () => {
    expect(isLibrarian("STUDENT")).toBe(false);
  });

  it("null/undefined → false", () => {
    expect(isLibrarian(null)).toBe(false);
    expect(isLibrarian(undefined)).toBe(false);
  });

  it("unknown role → false", () => {
    expect(isLibrarian("ADMIN")).toBe(false);
    expect(isLibrarian("")).toBe(false);
  });
});

describe("isFullLibrarian", () => {
  it("LIBRARIAN → true", () => {
    expect(isFullLibrarian("LIBRARIAN")).toBe(true);
  });

  it("PUSTAKAWAN_JUNIOR → false (bukan full)", () => {
    expect(isFullLibrarian("PUSTAKAWAN_JUNIOR")).toBe(false);
  });

  it("TEACHER → false", () => {
    expect(isFullLibrarian("TEACHER")).toBe(false);
  });

  it("STUDENT → false", () => {
    expect(isFullLibrarian("STUDENT")).toBe(false);
  });

  it("null/undefined → false", () => {
    expect(isFullLibrarian(null)).toBe(false);
    expect(isFullLibrarian(undefined)).toBe(false);
  });
});

describe("RBAC hierarchy", () => {
  it("setiap role yang bisa login sebagai pustakawan <= pustakawan penuh", () => {
    // jika seseorang full librarian, otomatis juga "librarian"
    expect(isFullLibrarian("LIBRARIAN")).toBe(true);
    expect(isLibrarian("LIBRARIAN")).toBe(true);

    // junior bukan full, tapi tetap "librarian"
    expect(isFullLibrarian("PUSTAKAWAN_JUNIOR")).toBe(false);
    expect(isLibrarian("PUSTAKAWAN_JUNIOR")).toBe(true);
  });
});
