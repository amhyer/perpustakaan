/**
 * Tests untuk src/lib/query-helpers.ts
 */

import { describe, it, expect } from "vitest";
import {
  parsePagination,
  parseSort,
  parseDateRange,
  paginatedResponse,
  parseList,
  parseIntSafe,
} from "../query-helpers";

describe("parsePagination", () => {
  it("default page=1, pageSize=20", () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("custom pageSize", () => {
    const params = new URLSearchParams("page=3&pageSize=50");
    const result = parsePagination(params);
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
    expect(result.offset).toBe(100);
  });

  it("clamp pageSize ke maxPageSize", () => {
    const params = new URLSearchParams("pageSize=500");
    const result = parsePagination(params, { maxPageSize: 100 });
    expect(result.pageSize).toBe(100);
  });

  it("clamp page minimum ke 1", () => {
    const params = new URLSearchParams("page=-5");
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  it("handle invalid numbers gracefully", () => {
    const params = new URLSearchParams("page=abc&pageSize=xyz");
    const result = parsePagination(params);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});

describe("parseSort", () => {
  it("default sort", () => {
    const params = new URLSearchParams();
    const result = parseSort(params);
    expect(result).toEqual({ field: "createdAt", order: "desc" });
  });

  it("parse 'field-order' format", () => {
    const params = new URLSearchParams("sort=title-asc");
    const result = parseSort(params, ["title"]);
    expect(result).toEqual({ field: "title", order: "asc" });
  });

  it("reject field not in allowedFields", () => {
    const params = new URLSearchParams("sort=password-asc");
    const result = parseSort(params, ["title", "author"]);
    expect(result).toEqual({ field: "createdAt", order: "desc" });
  });

  it("default order to 'asc' if not specified", () => {
    const params = new URLSearchParams("sort=title");
    const result = parseSort(params, ["title"]);
    expect(result.order).toBe("asc");
  });

  it("only 'asc' or 'desc' allowed", () => {
    const params = new URLSearchParams("sort=title-sideways");
    const result = parseSort(params, ["title"]);
    expect(result.order).toBe("asc");
  });
});

describe("parseDateRange", () => {
  it("both dates", () => {
    const params = new URLSearchParams("dateFrom=2026-01-01&dateTo=2026-12-31");
    const result = parseDateRange(params);
    expect(result.from?.getFullYear()).toBe(2026);
    expect(result.to?.getFullYear()).toBe(2026);
  });

  it("only from", () => {
    const params = new URLSearchParams("dateFrom=2026-01-01");
    const result = parseDateRange(params);
    expect(result.from).toBeDefined();
    expect(result.to).toBeUndefined();
  });

  it("both empty", () => {
    const params = new URLSearchParams();
    const result = parseDateRange(params);
    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });
});

describe("paginatedResponse", () => {
  it("build response dengan pagination metadata", () => {
    const data = [1, 2, 3];
    const total = 50;
    const params = { page: 1, pageSize: 20, offset: 0 };
    const result = paginatedResponse(data, total, params);
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.pagination).toEqual({
      total: 50,
      page: 1,
      pageSize: 20,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  it("last page — hasNext false", () => {
    const params = { page: 3, pageSize: 20, offset: 40 };
    const result = paginatedResponse([], 50, params);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(true);
  });

  it("empty result", () => {
    const params = { page: 1, pageSize: 20, offset: 0 };
    const result = paginatedResponse([], 0, params);
    expect(result.pagination.totalPages).toBe(1); // minimum 1
    expect(result.pagination.hasNext).toBe(false);
  });
});

describe("parseList", () => {
  it("parse comma-separated values", () => {
    const params = new URLSearchParams("ids=a,b,c");
    expect(parseList(params, "ids")).toEqual(["a", "b", "c"]);
  });

  it("trim whitespace", () => {
    const params = new URLSearchParams("ids= a , b , c ");
    expect(parseList(params, "ids")).toEqual(["a", "b", "c"]);
  });

  it("filter empty", () => {
    const params = new URLSearchParams("ids=a,,b");
    expect(parseList(params, "ids")).toEqual(["a", "b"]);
  });

  it("return empty array for missing key", () => {
    const params = new URLSearchParams();
    expect(parseList(params, "ids")).toEqual([]);
  });
});

describe("parseIntSafe", () => {
  it("parse valid integer", () => {
    expect(parseIntSafe("42", 0)).toBe(42);
  });

  it("return default for null", () => {
    expect(parseIntSafe(null, 10)).toBe(10);
  });

  it("return default for invalid", () => {
    expect(parseIntSafe("abc", 10)).toBe(10);
  });

  it("return default for empty string", () => {
    expect(parseIntSafe("", 10)).toBe(10);
  });
});
