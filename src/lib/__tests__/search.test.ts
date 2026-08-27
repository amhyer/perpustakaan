import { describe, it, expect } from "vitest";
import { bookSearchOr, memberSearchOr, searchCaseVariants, textSearchOr } from "../search";

describe("searchCaseVariants", () => {
  it("kosong → []", () => {
    expect(searchCaseVariants("")).toEqual([]);
    expect(searchCaseVariants("   ")).toEqual([]);
  });

  it("menyertakan huruf kecil, besar, dan title case", () => {
    const v = searchCaseVariants("laskar pelangi");
    expect(v).toEqual(expect.arrayContaining(["laskar pelangi", "LASKAR PELANGI", "Laskar Pelangi"]));
  });
});

describe("bookSearchOr", () => {
  it("mencakup field katalog untuk setiap variasi", () => {
    const or = bookSearchOr("laskar");
    expect(or.some((c) => c.title?.contains === "laskar")).toBe(true);
    expect(or.some((c) => c.title?.contains === "Laskar")).toBe(true);
    expect(or.some((c) => c.author?.contains === "laskar")).toBe(true);
    expect(or.some((c) => c.isbn?.contains === "laskar")).toBe(true);
  });
});

describe("memberSearchOr", () => {
  it("cari nama anggota tanpa peduli kapitalisasi", () => {
    const or = memberSearchOr("andini");
    expect(or.some((c) => c.fullName?.contains === "Andini")).toBe(true);
    expect(or.some((c) => c.classGrade?.contains === "andini")).toBe(true);
  });
});

describe("textSearchOr", () => {
  it("kosong → []", () => {
    expect(textSearchOr(["title"], "  ")).toEqual([]);
  });
});
