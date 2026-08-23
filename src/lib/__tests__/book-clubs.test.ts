/**
 * Tests for book clubs library.
 *
 * Sprint R - Tier 2 #6: Social Reading.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    bookClub: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    bookClubMember: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    bookClubDiscussion: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    bookClubDiscussionLike: { upsert: vi.fn() },
    readingSchedule: { create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  createBookClub,
  updateBookClub,
  deleteBookClub,
  joinClub,
  leaveClub,
  approveMember,
  updateMemberRole,
  postDiscussion,
  deleteDiscussion,
  likeDiscussion,
  createSchedule,
  updateProgress,
  getBookClub,
  listPublicClubs,
  getMemberClubs,
  getClubMembers,
  getClubDiscussions,
  getClubActivityFeed,
  type CreateClubInput,
} from "../book-clubs";

describe("book-clubs: CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBookClub", () => {
    it("creates club and adds creator as OWNER", async () => {
      vi.mocked(db.bookClub.create).mockResolvedValue({ id: "c1" } as any);
      vi.mocked(db.bookClubMember.create).mockResolvedValue({} as any);

      const input: CreateClubInput = {
        name: "Komunitas Buku Mingguan",
        description: "Diskusi buku setiap Jumat",
        visibility: "PUBLIC",
      };
      const id = await createBookClub("m1", input);
      expect(id).toBe("c1");
      expect(db.bookClub.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Komunitas Buku Mingguan",
            visibility: "PUBLIC",
            createdById: "m1",
          }),
        })
      );
      // Creator added as OWNER
      expect(db.bookClubMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId: "c1",
            memberId: "m1",
            role: "OWNER",
            status: "ACTIVE",
          }),
        })
      );
    });

    it("uses default emoji and color", async () => {
      vi.mocked(db.bookClub.create).mockResolvedValue({ id: "c1" } as any);
      vi.mocked(db.bookClubMember.create).mockResolvedValue({} as any);

      await createBookClub("m1", {
        name: "X",
        description: "Y",
        visibility: "PRIVATE",
      });
      expect(db.bookClub.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            coverEmoji: "📚",
            coverColor: "#3b82f6",
            tags: "[]",
          }),
        })
      );
    });
  });

  describe("updateBookClub", () => {
    it("allows OWNER to update", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "OWNER" } as any);
      vi.mocked(db.bookClub.update).mockResolvedValue({} as any);
      const result = await updateBookClub("c1", "m1", { name: "New Name" });
      expect(result).toBe(true);
    });

    it("allows MODERATOR to update", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MODERATOR" } as any);
      vi.mocked(db.bookClub.update).mockResolvedValue({} as any);
      const result = await updateBookClub("c1", "m1", { name: "X" });
      expect(result).toBe(true);
    });

    it("rejects MEMBER update attempt", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MEMBER" } as any);
      await expect(updateBookClub("c1", "m1", { name: "X" })).rejects.toThrow();
    });

    it("rejects non-member", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue(null);
      await expect(updateBookClub("c1", "m1", { name: "X" })).rejects.toThrow();
    });
  });

  describe("deleteBookClub", () => {
    it("deletes club and related data (OWNER only)", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "OWNER" } as any);
      vi.mocked(db.$transaction).mockResolvedValue([] as any);
      const result = await deleteBookClub("c1", "m1");
      expect(result).toBe(true);
      expect(db.$transaction).toHaveBeenCalled();
    });

    it("rejects non-OWNER", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MODERATOR" } as any);
      await expect(deleteBookClub("c1", "m1")).rejects.toThrow();
    });
  });
});

describe("book-clubs: membership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("joinClub", () => {
    it("rejects non-existent club", async () => {
      vi.mocked(db.bookClub.findUnique).mockResolvedValue(null);
      await expect(joinClub("c1", "m1")).rejects.toThrow();
    });

    it("rejects PRIVATE club", async () => {
      vi.mocked(db.bookClub.findUnique).mockResolvedValue({ visibility: "PRIVATE" } as any);
      await expect(joinClub("c1", "m1")).rejects.toThrow();
    });

    it("joins PUBLIC club immediately", async () => {
      vi.mocked(db.bookClub.findUnique).mockResolvedValue({ visibility: "PUBLIC" } as any);
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue(null);
      vi.mocked(db.bookClubMember.create).mockResolvedValue({} as any);

      const result = await joinClub("c1", "m1");
      expect(result.success).toBe(true);
      expect(result.status).toBe("ACTIVE");
    });

    it("INVITE_ONLY club creates PENDING status", async () => {
      vi.mocked(db.bookClub.findUnique).mockResolvedValue({ visibility: "INVITE_ONLY" } as any);
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue(null);
      vi.mocked(db.bookClubMember.create).mockResolvedValue({} as any);

      const result = await joinClub("c1", "m1");
      expect(result.status).toBe("PENDING");
    });

    it("returns existing member status", async () => {
      vi.mocked(db.bookClub.findUnique).mockResolvedValue({ visibility: "PUBLIC" } as any);
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ status: "ACTIVE" } as any);

      const result = await joinClub("c1", "m1");
      expect(result.status).toBe("ACTIVE");
      expect(db.bookClubMember.create).not.toHaveBeenCalled();
    });
  });

  describe("leaveClub", () => {
    it("removes member from club", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MEMBER" } as any);
      vi.mocked(db.bookClubMember.delete).mockResolvedValue({} as any);
      const result = await leaveClub("c1", "m1");
      expect(result).toBe(true);
    });

    it("rejects OWNER leaving", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "OWNER" } as any);
      await expect(leaveClub("c1", "m1")).rejects.toThrow();
    });

    it("returns false for non-member", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue(null);
      const result = await leaveClub("c1", "m1");
      expect(result).toBe(false);
    });
  });

  describe("approveMember", () => {
    it("allows MODERATOR+ to approve", async () => {
      vi.mocked(db.bookClubMember.findUnique)
        .mockResolvedValueOnce({ role: "MODERATOR" } as any)
        .mockResolvedValueOnce({} as any);
      vi.mocked(db.bookClubMember.update).mockResolvedValue({} as any);
      const result = await approveMember("c1", "m2", "m1");
      expect(result).toBe(true);
    });

    it("rejects MEMBER approval attempt", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MEMBER" } as any);
      await expect(approveMember("c1", "m2", "m1")).rejects.toThrow();
    });
  });

  describe("updateMemberRole", () => {
    it("OWNER can promote to MODERATOR", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "OWNER" } as any);
      vi.mocked(db.bookClubMember.update).mockResolvedValue({} as any);
      const result = await updateMemberRole("c1", "m2", "MODERATOR", "m1");
      expect(result).toBe(true);
    });

    it("MODERATOR cannot change roles", async () => {
      vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MODERATOR" } as any);
      await expect(updateMemberRole("c1", "m2", "MEMBER", "m1")).rejects.toThrow();
    });
  });
});

describe("book-clubs: discussions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects post from non-member", async () => {
    vi.mocked(db.bookClubMember.findUnique).mockResolvedValue(null);
    await expect(postDiscussion("c1", "m1", "Hello")).rejects.toThrow();
  });

  it("rejects post from inactive member", async () => {
    vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ status: "PENDING" } as any);
    await expect(postDiscussion("c1", "m1", "Hello")).rejects.toThrow();
  });

  it("allows post from active member", async () => {
    vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ status: "ACTIVE" } as any);
    vi.mocked(db.bookClubDiscussion.create).mockResolvedValue({ id: "d1" } as any);
    vi.mocked(db.bookClubMember.update).mockResolvedValue({} as any);

    const id = await postDiscussion("c1", "m1", "Hello world");
    expect(id).toBe("d1");
    expect(db.bookClubMember.update).toHaveBeenCalled();
  });

  it("supports threaded replies (parentId)", async () => {
    vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ status: "ACTIVE" } as any);
    vi.mocked(db.bookClubDiscussion.create).mockResolvedValue({ id: "d2" } as any);
    vi.mocked(db.bookClubMember.update).mockResolvedValue({} as any);

    await postDiscussion("c1", "m1", "Reply", "d1");
    expect(db.bookClubDiscussion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentId: "d1" }),
      })
    );
  });

  it("deleteDiscussion allows owner of message", async () => {
    vi.mocked(db.bookClubDiscussion.findUnique).mockResolvedValue({
      memberId: "m1",
      clubId: "c1",
    } as any);
    vi.mocked(db.bookClubDiscussion.delete).mockResolvedValue({} as any);
    const result = await deleteDiscussion("d1", "m1");
    expect(result).toBe(true);
  });

  it("deleteDiscussion allows MODERATOR", async () => {
    vi.mocked(db.bookClubDiscussion.findUnique).mockResolvedValue({
      memberId: "m2",
      clubId: "c1",
    } as any);
    vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MODERATOR" } as any);
    vi.mocked(db.bookClubDiscussion.delete).mockResolvedValue({} as any);
    const result = await deleteDiscussion("d1", "m1");
    expect(result).toBe(true);
  });

  it("likeDiscussion creates a like", async () => {
    vi.mocked(db.bookClubDiscussionLike.upsert).mockResolvedValue({} as any);
    const result = await likeDiscussion("d1", "m1");
    expect(result).toBe(true);
  });
});

describe("book-clubs: schedule & progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSchedule requires moderator+", async () => {
    vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MEMBER" } as any);
    await expect(
      createSchedule("c1", "m1", {
        bookId: "b1",
        startDate: new Date(),
        endDate: new Date(),
        chapterRange: "1-5",
        targetProgress: 25,
        description: "Week 1",
      })
    ).rejects.toThrow();
  });

  it("createSchedule by MODERATOR succeeds", async () => {
    vi.mocked(db.bookClubMember.findUnique).mockResolvedValue({ role: "MODERATOR" } as any);
    vi.mocked(db.readingSchedule.create).mockResolvedValue({ id: "s1" } as any);
    const id = await createSchedule("c1", "m1", {
      bookId: "b1",
      startDate: new Date(),
      endDate: new Date(),
      chapterRange: "1-5",
      targetProgress: 25,
      description: "Week 1",
    });
    expect(id).toBe("s1");
  });

  it("updateProgress validates range", async () => {
    await expect(updateProgress("c1", "m1", -1)).rejects.toThrow();
    await expect(updateProgress("c1", "m1", 101)).rejects.toThrow();
  });

  it("updateProgress with valid value succeeds", async () => {
    vi.mocked(db.bookClubMember.update).mockResolvedValue({} as any);
    await updateProgress("c1", "m1", 50);
    expect(db.bookClubMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ progress: 50 }),
      })
    );
  });
});

describe("book-clubs: retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getBookClub returns null for missing", async () => {
    vi.mocked(db.bookClub.findUnique).mockResolvedValue(null);
    const result = await getBookClub("c1");
    expect(result).toBeNull();
  });

  it("getBookClub returns full data", async () => {
    vi.mocked(db.bookClub.findUnique).mockResolvedValue({
      id: "c1",
      name: "Test Club",
      description: "Desc",
      coverEmoji: "📚",
      coverColor: "#3b82f6",
      visibility: "PUBLIC",
      currentBookId: "b1",
      currentBook: { id: "b1", title: "Book A" },
      createdById: "m1",
      createdBy: { id: "m1", fullName: "Owner" },
      createdAt: new Date(),
      tags: '["fiction"]',
      members: [{ id: "m1" }, { id: "m2" }],
      discussions: [{ id: "d1" }, { id: "d2" }, { id: "d3" }],
    } as any);

    const result = await getBookClub("c1");
    expect(result).not.toBeNull();
    expect(result?.memberCount).toBe(2);
    expect(result?.discussionCount).toBe(3);
    expect(result?.currentBookTitle).toBe("Book A");
    expect(result?.tags).toEqual(["fiction"]);
  });

  it("listPublicClubs with search", async () => {
    vi.mocked(db.bookClub.findMany).mockResolvedValue([]);
    vi.mocked(db.bookClub.count).mockResolvedValue(0);
    await listPublicClubs({ search: "fantasi" });
    expect(db.bookClub.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  it("getMemberClubs returns member's clubs", async () => {
    vi.mocked(db.bookClubMember.findMany).mockResolvedValue([
      {
        joinedAt: new Date(),
        club: {
          id: "c1", name: "Club A", description: "X", coverEmoji: "📚", coverColor: "#fff",
          visibility: "PUBLIC", currentBookId: null, currentBook: null,
          createdById: "m1", createdBy: { fullName: "Owner" }, createdAt: new Date(),
          tags: "[]", members: [], discussions: [],
        },
      },
    ] as any);
    const result = await getMemberClubs("m1");
    expect(result).toHaveLength(1);
  });

  it("getClubMembers returns active members", async () => {
    vi.mocked(db.bookClubMember.findMany).mockResolvedValue([
      {
        clubId: "c1", memberId: "m1", role: "OWNER", status: "ACTIVE", progress: 50,
        joinedAt: new Date(), lastActiveAt: new Date(),
        member: { id: "m1", fullName: "A", photo: null },
      },
    ] as any);
    const result = await getClubMembers("c1");
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("OWNER");
  });

  it("getClubDiscussions returns top-level only by default", async () => {
    vi.mocked(db.bookClubDiscussion.findMany).mockResolvedValue([]);
    await getClubDiscussions("c1");
    expect(db.bookClubDiscussion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ parentId: null }),
      })
    );
  });
});

describe("book-clubs: activity feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty for member with no clubs", async () => {
    vi.mocked(db.bookClubMember.findMany).mockResolvedValue([] as any);
    const feed = await getClubActivityFeed("m1");
    expect(feed).toEqual([]);
  });

  it("returns recent discussions from member's clubs", async () => {
    vi.mocked(db.bookClubMember.findMany).mockResolvedValue([
      {
        joinedAt: new Date(),
        club: {
          id: "c1", name: "C1", description: "", coverEmoji: "📚", coverColor: "#fff",
          visibility: "PUBLIC", currentBookId: null, currentBook: null,
          createdById: "x", createdBy: { fullName: "O" }, createdAt: new Date(),
          tags: "[]", members: [], discussions: [],
        },
      },
    ] as any);
    vi.mocked(db.bookClubDiscussion.findMany).mockResolvedValue([
      {
        id: "d1",
        memberId: "m2",
        content: "Great book!",
        createdAt: new Date(),
        member: { fullName: "Siti" },
        club: { name: "C1" },
      },
    ] as any);

    const feed = await getClubActivityFeed("m1");
    expect(feed).toHaveLength(1);
    expect(feed[0].memberName).toBe("Siti");
    expect(feed[0].description).toBe("Great book!");
  });
});
