/**
 * Unit tests untuk ISBN validation functions.
 * These are exported from src/components/app/inventory/isbn-scanner.tsx
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));

import { isValidISBN, isbn10To13, formatISBN } from "../../components/app/inventory/isbn-scanner";

describe("isbn: isValidISBN", () => {
  describe("ISBN-10", () => {
    it("accepts valid ISBN-10", () => {
      // Example: 0306406152 is a known valid ISBN-10
      expect(isValidISBN("0306406152")).toBe(true);
    });

    it("accepts ISBN-10 with dashes", () => {
      expect(isValidISBN("0-306-40615-2")).toBe(true);
    });

    it("accepts ISBN-10 with X check digit", () => {
      // ISBN-10 ending in X is valid
      // 155404295X is a known valid ISBN-10
      expect(isValidISBN("155404295X")).toBe(true);
    });

    it("rejects ISBN-10 with wrong checksum", () => {
      expect(isValidISBN("0306406153")).toBe(false);
    });

    it("rejects ISBN-10 with letters other than X", () => {
      expect(isValidISBN("030640615A")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidISBN("")).toBe(false);
    });

    it("rejects too short", () => {
      expect(isValidISBN("12345")).toBe(false);
    });

    it("rejects too long for ISBN-10", () => {
      expect(isValidISBN("12345678901")).toBe(false);
    });
  });

  describe("ISBN-13", () => {
    it("accepts valid ISBN-13", () => {
      // 9780306406157 is valid ISBN-13
      expect(isValidISBN("9780306406157")).toBe(true);
    });

    it("accepts ISBN-13 with dashes", () => {
      expect(isValidISBN("978-0-306-40615-7")).toBe(true);
    });

    it("rejects ISBN-13 with wrong checksum", () => {
      expect(isValidISBN("9780306406158")).toBe(false);
    });

    it("rejects ISBN-13 with non-numeric chars", () => {
      expect(isValidISBN("978030640615X")).toBe(false);
    });
  });

  describe("format flexibility", () => {
    it("strips spaces", () => {
      expect(isValidISBN("978 0 306 40615 7")).toBe(true);
    });

    it("strips dashes and spaces", () => {
      expect(isValidISBN("978-0-306-40615-7")).toBe(true);
    });

    it("handles uppercase X", () => {
      expect(isValidISBN("155404295X")).toBe(true);
    });
  });
});

describe("isbn: isbn10To13", () => {
  it("converts valid ISBN-10 to ISBN-13", () => {
    const result = isbn10To13("0306406152");
    expect(result).toBe("9780306406157");
  });

  it("prepends 978 prefix", () => {
    const result = isbn10To13("1234567890");
    expect(result.startsWith("978")).toBe(true);
  });

  it("produces 13-digit result", () => {
    const result = isbn10To13("0306406152");
    expect(result.length).toBe(13);
  });

  it("returns original if not 10 digits", () => {
    const result = isbn10To13("12345");
    expect(result).toBe("12345");
  });
});

describe("isbn: formatISBN", () => {
  it("formats 13-digit ISBN with hyphens", () => {
    expect(formatISBN("9780306406157")).toBe("978-0-306-40615-7");
  });

  it("formats 10-digit ISBN with hyphens", () => {
    expect(formatISBN("0306406152")).toBe("0-3064-0615-2");
  });

  it("preserves invalid input unchanged", () => {
    expect(formatISBN("123")).toBe("123");
  });

  it("strips existing hyphens before formatting", () => {
    expect(formatISBN("978-0-306-40615-7")).toBe("978-0-306-40615-7");
  });
});

describe("isbn: edge cases", () => {
  it("handles whitespace-only as invalid", () => {
    expect(isValidISBN("   ")).toBe(false);
  });

  it("handles all zeros (passes checksum but is reserved)", () => {
    // Note: all-zeros technically passes checksum (0 % 10 = 0)
    // but is reserved/unused. In production, we might want to add
    // additional validation against reserved ISBN ranges.
    // For now, just verify the format passes.
    expect(isValidISBN("0000000000")).toBe(true); // ISBN-10 with 0 checksum
  });

  it("handles leading/trailing whitespace", () => {
    expect(isValidISBN("  9780306406157  ")).toBe(true);
  });

  it("rejects very long input", () => {
    expect(isValidISBN("12345678901234567")).toBe(false);
  });
});

describe("isbn: real-world examples", () => {
  it("validates Laskar Pelangi ISBN-13", () => {
    // 978-979-22-2628-7 is Laskar Pelangi
    expect(isValidISBN("9789792226287")).toBe(true);
  });

  it("validates Harry Potter ISBN-10", () => {
    // 0747532699 is Harry Potter and the Philosopher's Stone
    expect(isValidISBN("0747532699")).toBe(true);
  });
});
