/**
 * Tests for gamification API endpoints (Sprint M).
 *
 * Covers:
 * - GET /api/gamification/level
 * - GET /api/gamification/leaderboard/class
 * - GET /api/gamification/streak-calendar
 * - GET /api/gamification/challenges
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    member: { findMany: vi.fn() },
    loan: { groupBy: vi.fn() },
    pointTransaction: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/reading-level", () => ({
  computeReadingLevel: vi.fn(),
  getAllLevels: vi.fn(() => [
    { id: "pemula", name: "Pemula" },
    { id: "pembaca", name: "Pembaca" },
  ]),
}));

vi.mock("@/lib/reading-challenges", () => ({
  CHALLENGE_TEMPLATES: [
    { type: "BOOK_COUNT", title: "Marathon" },
    { type: "STREAK", title: "Streak" },
  ],
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "@/lib/db";
import { computeReadingLevel } from "@/lib/reading-level";
import { GET as levelRoute } from "../gamification/level/route";
import { GET as classLeaderboardRoute } from "../gamification/leaderboard/[scope]/route";
import { GET as streakCalendarRoute } from "../gamification/streak-calendar/route";
import { GET as challengesRoute } from "../gamification/challenges/route";
import { NextResponse } from "next/server";

const memberUser = { id: "u1", role: "STUDENT", member: { id: "m1" } };
const librarianUser = { id: "u2", role: "LIBRARIAN", member: null };

function makeGet(url: string): Request {
  return new Request(url, { method: "GET" });
}

describe("GET /api/gamification/level", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    const errResp = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockResolvedValue({ user: null, error: errResp });
    const res = await levelRoute();
    expect(res.status).toBe(401);
  });

  it("rejects non-member users", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await levelRoute();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/anggota/);
  });

  it("returns level data for member", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(computeReadingLevel).mockResolvedValue({
      booksRead: 25,
      level: { id: "kutu-buku", name: "Kutu Buku" } as any,
      next: { id: "kolektor", name: "Kolektor" } as any,
      progressPercent: 30,
      booksToNext: 25,
      rank: 5,
      rankInClass: 2,
      classGrade: "10-A",
    });

    const res = await levelRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booksRead).toBe(25);
    expect(body.level.id).toBe("kutu-buku");
    expect(body.allLevels).toBeDefined();
  });
});

describe("GET /api/gamification/leaderboard/class", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires classGrade parameter", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    const res = await classLeaderboardRoute(makeGet("http://localhost/api/test"));
    expect(res.status).toBe(400);
  });

  it("rejects limit out of range", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    const res = await classLeaderboardRoute(
      makeGet("http://localhost/api/test?classGrade=10-A&limit=200")
    );
    expect(res.status).toBe(400);
  });

  it("returns empty leaderboard when no members in class", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(db.member.findMany).mockResolvedValue([] as any);
    vi.mocked(db.loan.groupBy).mockResolvedValue([] as any);

    const res = await classLeaderboardRoute(
      makeGet("http://localhost/api/test?classGrade=99-Z")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leaderboard).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns ranked class leaderboard", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(db.member.findMany).mockResolvedValue([
      { id: "m1", fullName: "Budi", memberNumber: "001", photo: null, classGrade: "10-A" },
      { id: "m2", fullName: "Siti", memberNumber: "002", photo: null, classGrade: "10-A" },
      { id: "m3", fullName: "Andi", memberNumber: "003", photo: null, classGrade: "10-A" },
    ] as any);
    vi.mocked(db.loan.groupBy).mockResolvedValue([
      { memberId: "m2", _count: { _all: 15 } },
      { memberId: "m1", _count: { _all: 10 } },
      { memberId: "m3", _count: { _all: 5 } },
    ] as any);

    const res = await classLeaderboardRoute(
      makeGet("http://localhost/api/test?classGrade=10-A")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leaderboard[0].fullName).toBe("Siti");
    expect(body.leaderboard[0].rank).toBe(1);
    expect(body.leaderboard[1].fullName).toBe("Budi");
    expect(body.leaderboard[1].rank).toBe(2);
    expect(body.total).toBe(3);
  });

  it("handles members with no loans (0 books)", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(db.member.findMany).mockResolvedValue([
      { id: "m1", fullName: "Budi", memberNumber: "001", photo: null, classGrade: "10-A" },
    ] as any);
    vi.mocked(db.loan.groupBy).mockResolvedValue([] as any);

    const res = await classLeaderboardRoute(
      makeGet("http://localhost/api/test?classGrade=10-A")
    );
    const body = await res.json();
    expect(body.leaderboard[0].booksRead).toBe(0);
    expect(body.leaderboard[0].rank).toBe(1);
  });

  it("respects limit parameter", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    const manyMembers = Array.from({ length: 50 }, (_, i) => ({
      id: `m${i}`,
      fullName: `Member ${i}`,
      memberNumber: `${i}`,
      photo: null,
      classGrade: "10-A",
    }));
    vi.mocked(db.member.findMany).mockResolvedValue(manyMembers as any);
    vi.mocked(db.loan.groupBy).mockResolvedValue([] as any);

    const res = await classLeaderboardRoute(
      makeGet("http://localhost/api/test?classGrade=10-A&limit=5")
    );
    const body = await res.json();
    expect(body.leaderboard).toHaveLength(5);
  });
});

describe("GET /api/gamification/streak-calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-member", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await streakCalendarRoute(makeGet("http://localhost/api/test"));
    expect(res.status).toBe(400);
  });

  it("returns 30-day calendar by default", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([
      { createdAt: new Date(), amount: 5 },
    ] as any);

    const res = await streakCalendarRoute(makeGet("http://localhost/api/test"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toHaveLength(30);
    expect(body.currentStreak).toBe(1);
  });

  it("respects days parameter", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([] as any);

    const res = await streakCalendarRoute(
      makeGet("http://localhost/api/test?days=7")
    );
    const body = await res.json();
    expect(body.days).toHaveLength(7);
  });

  it("caps days at 365", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([] as any);

    const res = await streakCalendarRoute(
      makeGet("http://localhost/api/test?days=500")
    );
    const body = await res.json();
    expect(body.days.length).toBeLessThanOrEqual(365);
  });

  it("calculates current streak correctly", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([
      { createdAt: today, amount: 5 },
      { createdAt: yesterday, amount: 5 },
      { createdAt: twoDaysAgo, amount: 5 },
    ] as any);

    const res = await streakCalendarRoute(makeGet("http://localhost/api/test?days=5"));
    const body = await res.json();
    expect(body.currentStreak).toBe(3);
  });

  it("handles empty streak", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([] as any);

    const res = await streakCalendarRoute(makeGet("http://localhost/api/test"));
    const body = await res.json();
    expect(body.currentStreak).toBe(0);
    expect(body.longestStreak).toBe(0);
    expect(body.totalActiveDays).toBe(0);
  });

  it("calculates longest streak", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    const today = new Date();
    const txns = [];
    // 5 days ago to today
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      txns.push({ createdAt: d, amount: 5 });
    }
    // Gap, then 2 days
    for (let i = 10; i < 12; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      txns.push({ createdAt: d, amount: 5 });
    }
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue(txns as any);

    const res = await streakCalendarRoute(makeGet("http://localhost/api/test?days=15"));
    const body = await res.json();
    expect(body.longestStreak).toBe(5);
  });

  it("returns total points", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    vi.mocked(db.pointTransaction.findMany).mockResolvedValue([
      { createdAt: new Date(), amount: 10 },
      { createdAt: new Date(), amount: 5 },
    ] as any);

    const res = await streakCalendarRoute(makeGet("http://localhost/api/test"));
    const body = await res.json();
    expect(body.totalPoints).toBe(15);
  });
});

describe("GET /api/gamification/challenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    const errResp = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockResolvedValue({ user: null, error: errResp });
    const res = await challengesRoute();
    expect(res.status).toBe(401);
  });

  it("returns challenge templates", async () => {
    mockRequireAuth.mockResolvedValue({ user: memberUser, error: null });
    const res = await challengesRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.templates).toBeDefined();
    expect(body.templates.length).toBeGreaterThan(0);
  });
});
