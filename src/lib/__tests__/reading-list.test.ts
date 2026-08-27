import { describe, it, expect } from "vitest";
import { listTargetsClass, parseReadingList, serializeReadingList } from "../reading-list";
import { aisleHint } from "../opac";

describe("reading list", () => {
  it("tolak JSON rusak / kosong", () => {
    expect(parseReadingList("nope")).toBeNull();
    expect(parseReadingList(JSON.stringify({ classGrades: ["IX-A"], items: [] }))).toBeNull();
  });

  it("simpan dan baca ulang", () => {
    const raw = serializeReadingList({
      classGrades: ["IX-A"],
      items: [{ bookId: "b1", note: "wajib" }],
    });
    const parsed = parseReadingList(raw);
    expect(parsed?.items[0].bookId).toBe("b1");
    expect(listTargetsClass(parsed!, "ix-a")).toBe(true);
    expect(listTargetsClass(parsed!, "VIII-B")).toBe(false);
  });
});

describe("aisleHint", () => {
  it("petunjuk lorong dari kode rak", () => {
    expect(aisleHint("A-01")).toMatch(/kiri/i);
    expect(aisleHint("D-01")).toMatch(/tengah/i);
    expect(aisleHint("F-01")).toMatch(/kanan/i);
  });
});
