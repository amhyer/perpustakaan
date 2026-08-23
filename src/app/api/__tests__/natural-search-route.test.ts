/**
 * Tests for natural language search API.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockRequireAuth = vi.fn();
const mockParseQuery = vi.fn();
const mockDescribeQuery = vi.fn();
const mockNlSearch = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

vi.mock("@/lib/nl-search", () => ({
  parseQuery: (...args: any[]) => mockParseQuery(...args),
  describeQuery: (...args: any[]) => mockDescribeQuery(...args),
  nlSearch: (...args: any[]) => mockNlSearch(...args),
}));

import { GET } from "../search/natural/route";
import { NextResponse } from "next/server";

const authedUser = { id: "u1", role: "STUDENT" };

function makeGet(url: string): Request {
  return new Request(url, { method: "GET" });
}

describe("GET /api/search/natural", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    const errResp = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockResolvedValue({ user: null, error: errResp });
    const res = await GET(makeGet("http://localhost/api/test?q=hello"));
    expect(res.status).toBe(401);
  });

  it("rejects missing q", async () => {
    mockRequireAuth.mockResolvedValue({ user: authedUser, error: null });
    const res = await GET(makeGet("http://localhost/api/test"));
    expect(res.status).toBe(400);
  });

  it("rejects too-short q", async () => {
    mockRequireAuth.mockResolvedValue({ user: authedUser, error: null });
    const res = await GET(makeGet("http://localhost/api/test?q=a"));
    expect(res.status).toBe(400);
  });

  it("rejects invalid limit", async () => {
    mockRequireAuth.mockResolvedValue({ user: authedUser, error: null });
    const res = await GET(makeGet("http://localhost/api/test?q=hello&limit=100"));
    expect(res.status).toBe(400);
  });

  it("returns parsed query + results", async () => {
    mockRequireAuth.mockResolvedValue({ user: authedUser, error: null });
    mockParseQuery.mockReturnValue({
      topic: "persahabatan",
      audience: "remaja",
      level: "SMP",
      confidence: 0.8,
      keywords: ["sahabat"],
    });
    mockDescribeQuery.mockReturnValue("topik persahabatan • untuk remaja • level SMP");
    mockNlSearch.mockResolvedValue([
      { bookId: "b1", title: "Sahabat Sejati", author: "X", score: 0.85, matchReasons: ["title match"], highlights: {} },
    ]);

    const res = await GET(makeGet("http://localhost/api/test?q=persahabatan"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parsed.topic).toBe("persahabatan");
    expect(body.results.length).toBe(1);
    expect(body.total).toBe(1);
    expect(body.description).toContain("persahabatan");
  });

  it("passes limit and minScore to nlSearch", async () => {
    mockRequireAuth.mockResolvedValue({ user: authedUser, error: null });
    mockParseQuery.mockReturnValue({ topic: null, confidence: 0.3, keywords: ["x"] });
    mockDescribeQuery.mockReturnValue("Pencarian: x");
    mockNlSearch.mockResolvedValue([]);

    await GET(makeGet("http://localhost/api/test?q=test&limit=10&minScore=0.2"));
    expect(mockNlSearch).toHaveBeenCalledWith("test", { limit: 10, minScore: 0.2 });
  });

  it("handles empty results", async () => {
    mockRequireAuth.mockResolvedValue({ user: authedUser, error: null });
    mockParseQuery.mockReturnValue({ topic: null, confidence: 0.1, keywords: [] });
    mockDescribeQuery.mockReturnValue("Pencarian umum");
    mockNlSearch.mockResolvedValue([]);

    const res = await GET(makeGet("http://localhost/api/test?q=xyz"));
    const body = await res.json();
    expect(body.results).toEqual([]);
    expect(body.total).toBe(0);
  });
});
