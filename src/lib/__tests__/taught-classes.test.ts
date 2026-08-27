import { describe, it, expect } from "vitest";
import {
  parseTaughtClasses,
  serializeTaughtClasses,
  studentInTaughtClasses,
  studentClassScope,
  resolveTeacherClassFilter,
  classGradeMatchValues,
} from "../taught-classes";

describe("parseTaughtClasses", () => {
  it("kosong / null → []", () => {
    expect(parseTaughtClasses(null)).toEqual([]);
    expect(parseTaughtClasses("")).toEqual([]);
    expect(parseTaughtClasses("  , ; ")).toEqual([]);
  });

  it("pisah koma/titik koma dan buang duplikat case-insensitive", () => {
    expect(parseTaughtClasses("IX-A, viii-b; IX-A\nVII-C")).toEqual(["IX-A", "viii-b", "VII-C"]);
  });
});

describe("serializeTaughtClasses", () => {
  it("rapikan jadi daftar koma", () => {
    expect(serializeTaughtClasses("IX-A,IX-A, viii-b")).toBe("IX-A, viii-b");
    expect(serializeTaughtClasses(["IX-A", " VIII-B "])).toBe("IX-A, VIII-B");
  });
});

describe("studentInTaughtClasses", () => {
  it("hanya siswa di kelas yang diajar", () => {
    const taught = ["IX-A", "VIII-B"];
    expect(studentInTaughtClasses("IX-A", taught)).toBe(true);
    expect(studentInTaughtClasses("ix-a", taught)).toBe(true);
    expect(studentInTaughtClasses("VII-C", taught)).toBe(false);
    expect(studentInTaughtClasses(null, taught)).toBe(false);
    expect(studentInTaughtClasses("IX-A", [])).toBe(false);
  });
});

describe("studentClassScope", () => {
  it("tanpa kelas ajar tidak mengembalikan siswa manapun", () => {
    expect(studentClassScope([])).toEqual({ id: { in: [] } });
  });

  it("mencakup variasi kapitalisasi kelas", () => {
    const scope = studentClassScope(["IX-A"]);
    expect("classGrade" in scope && "in" in scope.classGrade).toBe(true);
    if ("classGrade" in scope) {
      expect(scope.classGrade.in).toEqual(expect.arrayContaining(["IX-A", "ix-a"]));
    }
  });
});

describe("classGradeMatchValues", () => {
  it("IX-A mencakup ix-a", () => {
    expect(classGradeMatchValues(["IX-A"])).toEqual(expect.arrayContaining(["IX-A", "ix-a"]));
  });
});

describe("resolveTeacherClassFilter", () => {
  it("tanpa request → semua kelas ajar; request di luar cakupan → kosong", () => {
    expect(resolveTeacherClassFilter(["IX-A", "VIII-B"], "")).toEqual(["IX-A", "VIII-B"]);
    expect(resolveTeacherClassFilter(["IX-A", "VIII-B"], "ix-a")).toEqual(["IX-A"]);
    expect(resolveTeacherClassFilter(["IX-A"], "VII-C")).toEqual([]);
    expect(resolveTeacherClassFilter([], "IX-A")).toEqual([]);
  });
});
