/**
 * Unit tests untuk CSV library.
 *
 * Sprint K - Bulk Operations.
 */

import { describe, it, expect } from "vitest";

import {
  parseCSV,
  generateCSV,
  coerceValue,
  validateRow,
  downloadCSV,
} from "../csv";

describe("csv: parseCSV", () => {
  it("parses simple CSV", () => {
    const csv = "name,age\nJohn,30\nJane,25";
    const rows = parseCSV(csv);
    expect(rows).toEqual([
      { name: "John", age: "30" },
      { name: "Jane", age: "25" },
    ]);
  });

  it("parses empty CSV", () => {
    expect(parseCSV("")).toEqual([]);
  });

  it("parses CSV with quoted fields", () => {
    const csv = 'name,city\n"John Doe","New York"\n"Jane Smith","San Francisco"';
    const rows = parseCSV(csv);
    expect(rows[0].name).toBe("John Doe");
    expect(rows[0].city).toBe("New York");
  });

  it("parses fields with embedded commas", () => {
    const csv = 'name,description\n"John","Hello, world"\n"Jane","Foo, bar"';
    const rows = parseCSV(csv);
    expect(rows[0].description).toBe("Hello, world");
  });

  it("parses fields with embedded newlines", () => {
    const csv = 'name,note\n"John","Line 1\nLine 2"';
    const rows = parseCSV(csv);
    expect(rows[0].note).toBe("Line 1\nLine 2");
  });

  it("parses escaped quotes", () => {
    const csv = 'name,quote\n"John","He said ""Hi"""';
    const rows = parseCSV(csv);
    expect(rows[0].quote).toBe('He said "Hi"');
  });

  it("handles custom delimiter", () => {
    const csv = "name;age\nJohn;30";
    const rows = parseCSV(csv, { delimiter: ";" });
    expect(rows[0].age).toBe("30");
  });

  it("trims values by default", () => {
    const csv = "name,age\n  John  , 30  ";
    const rows = parseCSV(csv);
    expect(rows[0].name).toBe("John");
    expect(rows[0].age).toBe("30");
  });

  it("skips empty lines", () => {
    const csv = "name,age\nJohn,30\n\nJane,25\n";
    const rows = parseCSV(csv, { skipEmpty: true });
    expect(rows.length).toBe(2);
  });
});

describe("csv: generateCSV", () => {
  it("generates from array of objects", () => {
    const data = [
      { name: "John", age: 30 },
      { name: "Jane", age: 25 },
    ];
    const csv = generateCSV(data);
    expect(csv).toContain("name,age");
    expect(csv).toContain("John,30");
    expect(csv).toContain("Jane,25");
  });

  it("escapes commas in values", () => {
    const data = [{ name: "John, Jr.", age: 30 }];
    const csv = generateCSV(data);
    expect(csv).toContain('"John, Jr."');
  });

  it("escapes newlines in values", () => {
    const data = [{ note: "Line 1\nLine 2" }];
    const csv = generateCSV(data);
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  it("escapes quotes in values", () => {
    const data = [{ note: 'He said "Hi"' }];
    const csv = generateCSV(data);
    expect(csv).toContain('"He said ""Hi"""');
  });

  it("uses custom delimiter", () => {
    const data = [{ a: 1, b: 2 }];
    const csv = generateCSV(data, undefined, { delimiter: ";" });
    expect(csv).toContain("a;b");
  });

  it("skips headers when requested", () => {
    const data = [{ a: 1 }];
    const csv = generateCSV(data, undefined, { includeHeaders: false });
    expect(csv.startsWith("a")).toBe(false);
  });

  it("uses explicit columns", () => {
    const data = [{ a: 1, b: 2, c: 3 }];
    const csv = generateCSV(data, ["c", "a"]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("c,a");
  });

  it("handles null and undefined", () => {
    const data = [{ a: null, b: undefined, c: 1 }];
    const csv = generateCSV(data);
    expect(csv).toContain(",,1");
  });
});

describe("csv: roundtrip", () => {
  it("generate then parse preserves data", () => {
    const data = [
      { name: "John, Doe", age: 30, city: "New York" },
      { name: 'Jane "Smith"', age: 25, city: "LA" },
    ];
    const csv = generateCSV(data);
    const parsed = parseCSV(csv, { trim: false });
    expect(parsed[0].name).toBe("John, Doe");
    expect(parsed[1].name).toBe('Jane "Smith"');
  });
});

describe("csv: coerceValue", () => {
  it("coerces to string", () => {
    expect(coerceValue("hello", "string")).toBe("hello");
  });

  it("coerces to number", () => {
    expect(coerceValue("42", "number")).toBe(42);
    expect(coerceValue("3.14", "number")).toBe(3.14);
  });

  it("returns null for invalid number", () => {
    expect(coerceValue("abc", "number")).toBe(null);
  });

  it("coerces to boolean (true variants)", () => {
    expect(coerceValue("true", "boolean")).toBe(true);
    expect(coerceValue("1", "boolean")).toBe(true);
    expect(coerceValue("yes", "boolean")).toBe(true);
    expect(coerceValue("y", "boolean")).toBe(true);
  });

  it("coerces to boolean (false variants)", () => {
    expect(coerceValue("false", "boolean")).toBe(false);
    expect(coerceValue("0", "boolean")).toBe(false);
    expect(coerceValue("no", "boolean")).toBe(false);
  });

  it("returns null for invalid boolean", () => {
    expect(coerceValue("maybe", "boolean")).toBe(null);
  });

  it("coerces to date", () => {
    const d = coerceValue("2024-01-15", "date");
    expect(d).toBeInstanceOf(Date);
  });

  it("returns null for invalid date", () => {
    expect(coerceValue("not a date", "date")).toBe(null);
  });

  it("returns null for empty values", () => {
    expect(coerceValue("", "string")).toBe(null);
    expect(coerceValue("  ", "number")).toBe(null);
  });
});

describe("csv: validateRow", () => {
  it("validates required fields", () => {
    const result = validateRow(
      { name: "John", age: "30" },
      { name: "string", age: "number" },
      ["name"]
    );
    expect(result.valid).toBe(true);
  });

  it("reports missing required fields", () => {
    const result = validateRow(
      { age: "30" },
      { name: "string", age: "number" },
      ["name"]
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("reports type mismatches", () => {
    const result = validateRow(
      { name: "John", age: "not a number" },
      { name: "string", age: "number" },
      ["name"]
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("age"))).toBe(true);
  });

  it("coerces values in place", () => {
    const row: any = { name: "John", age: "30" };
    validateRow(row, { name: "string", age: "number" });
    expect(typeof row.age).toBe("number");
    expect(row.age).toBe(30);
  });

  it("returns row index in result", () => {
    const result = validateRow({}, {}, [], 5);
    expect(result.rowIndex).toBe(5);
  });
});

describe("csv: edge cases", () => {
  it("handles very long fields", () => {
    const longText = "x".repeat(1000);
    const data = [{ note: longText }];
    const csv = generateCSV(data);
    const parsed = parseCSV(csv);
    expect(parsed[0].note).toBe(longText);
  });

  it("handles special characters", () => {
    const data = [{ name: "Test\nMultiline\t\u00e9moji 🎉" }];
    const csv = generateCSV(data);
    const parsed = parseCSV(csv);
    expect(parsed[0].name).toContain("🎉");
  });

  it("handles empty data with columns", () => {
    const csv = generateCSV([], ["a", "b"]);
    expect(csv).toBe("a,b\n");
  });

  it("handles single row", () => {
    const data = [{ a: 1 }];
    const csv = generateCSV(data);
    const parsed = parseCSV(csv);
    expect(parsed.length).toBe(1);
    expect(parsed[0].a).toBe("1");
  });
});
