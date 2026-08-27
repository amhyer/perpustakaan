import { describe, it, expect } from "vitest";
import { coverFromIsbn, normalizeIsbn, resolveCoverImage } from "../cover";

describe("cover ISBN", () => {
  it("normalisasi strip tanda pisah", () => {
    expect(normalizeIsbn("978-979-3062-79-2")).toBe("9789793062792");
    expect(normalizeIsbn("abc")).toBeNull();
  });

  it("URL Open Library dari ISBN", () => {
    expect(coverFromIsbn("9789793062792")).toBe(
      "https://covers.openlibrary.org/b/isbn/9789793062792-L.jpg"
    );
  });

  it("unggahan pustakawan menang dari ISBN", () => {
    expect(resolveCoverImage({ coverImage: "/x.jpg", isbn: "9789793062792" })).toBe("/x.jpg");
    expect(resolveCoverImage({ coverImage: null, isbn: "9789793062792" })).toContain("openlibrary");
  });
});
