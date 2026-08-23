/**
 * Tests for reading lists library.
 *
 * Sprint O - Tier 2 #6: Social reading features.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    readingList: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    readingListItem: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    readingListLike: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    readingListFollow: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    readingListComment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    member: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  createReadingList,
  updateReadingList,
  deleteReadingList,
  addBookToList,
  removeBookFromList,
  reorderListBooks,
  likeList,
  unlikeList,
  followList,
  unfollowList,
  getReadingList,
  listPublicReadingLists,
  getMemberLists,
  getFollowedLists,
  commentOnList,
  deleteListComment,
  getListComments,
  seedCuratedLists,
  type CreateListInput,
} from "../reading-lists";

describe("reading-lists: CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createReadingList", () => {
    it("creates a list with required fields", async () => {
      vi.mocked(db.readingList.create).mockResolvedValue({ id: "list-1" } as any);
      const input: CreateListInput = {
        title: "My Favorites",
        category: "THEMED",
        visibility: "PUBLIC",
      };
      const id = await createReadingList("m1", input);
      expect(id).toBe("list-1");
      expect(db.readingList.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: "m1",
            title: "My Favorites",
            category: "THEMED",
            visibility: "PUBLIC",
            coverColor: "#3b82f6",
            coverEmoji: "📚",
            tags: "[]",
          }),
        })
      );
    });

    it("uses provided colors and emoji", async () => {
      vi.mocked(db.readingList.create).mockResolvedValue({ id: "list-2" } as any);
      await createReadingList("m1", {
        title: "Test",
        category: "CUSTOM",
        visibility: "PRIVATE",
        coverColor: "#ff0000",
        coverEmoji: "🎨",
        tags: ["tag1"],
      });
      expect(db.readingList.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            coverColor: "#ff0000",
            coverEmoji: "🎨",
            tags: JSON.stringify(["tag1"]),
          }),
        })
      );
    });
  });

  describe("updateReadingList", () => {
    it("throws if list not found", async () => {
      vi.mocked(db.readingList.findUnique).mockResolvedValue(null);
      await expect(
        updateReadingList("l1", "m1", { title: "New" })
      ).rejects.toThrow("bukan milik");
    });

    it("throws if not owner", async () => {
      vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m2" } as any);
      await expect(
        updateReadingList("l1", "m1", { title: "New" })
      ).rejects.toThrow("bukan milik");
    });

    it("updates successfully if owner", async () => {
      vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m1" } as any);
      vi.mocked(db.readingList.update).mockResolvedValue({} as any);
      const result = await updateReadingList("l1", "m1", { title: "New Title" });
      expect(result).toBe(true);
    });
  });

  describe("deleteReadingList", () => {
    it("deletes list with all related data", async () => {
      vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m1" } as any);
      vi.mocked(db.$transaction).mockResolvedValue([] as any);
      const result = await deleteReadingList("l1", "m1");
      expect(result).toBe(true);
      expect(db.$transaction).toHaveBeenCalled();
    });

    it("rejects non-owner", async () => {
      vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m2" } as any);
      await expect(deleteReadingList("l1", "m1")).rejects.toThrow();
    });
  });
});

describe("reading-lists: items (books)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addBookToList assigns next position", async () => {
    vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m1" } as any);
    vi.mocked(db.readingListItem.findFirst).mockResolvedValue({ position: 4 } as any);
    vi.mocked(db.readingListItem.upsert).mockResolvedValue({} as any);

    await addBookToList("l1", "b1", "m1");
    expect(db.readingListItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ position: 5 }),
      })
    );
  });

  it("addBookToList starts at 0 for empty list", async () => {
    vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m1" } as any);
    vi.mocked(db.readingListItem.findFirst).mockResolvedValue(null);
    vi.mocked(db.readingListItem.upsert).mockResolvedValue({} as any);

    await addBookToList("l1", "b1", "m1");
    expect(db.readingListItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ position: 0 }),
      })
    );
  });

  it("rejects non-owner for addBookToList", async () => {
    vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m2" } as any);
    await expect(addBookToList("l1", "b1", "m1")).rejects.toThrow();
  });

  it("removeBookFromList deletes the entry", async () => {
    vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m1" } as any);
    vi.mocked(db.readingListItem.deleteMany).mockResolvedValue({ count: 1 } as any);
    const result = await removeBookFromList("l1", "b1", "m1");
    expect(result).toBe(true);
    expect(db.readingListItem.deleteMany).toHaveBeenCalledWith({
      where: { listId: "l1", bookId: "b1" },
    });
  });

  it("reorderListBooks updates positions", async () => {
    vi.mocked(db.readingList.findUnique).mockResolvedValue({ memberId: "m1" } as any);
    vi.mocked(db.readingListItem.update).mockResolvedValue({} as any);
    vi.mocked(db.$transaction).mockResolvedValue([] as any);

    await reorderListBooks("l1", ["b3", "b1", "b2"], "m1");
    expect(db.$transaction).toHaveBeenCalled();
    expect(db.readingListItem.update).toHaveBeenCalledTimes(3);
  });
});

describe("reading-lists: likes & follows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("likeList creates a like", async () => {
    vi.mocked(db.readingListLike.upsert).mockResolvedValue({} as any);
    await likeList("l1", "m1");
    expect(db.readingListLike.upsert).toHaveBeenCalled();
  });

  it("unlikeList removes a like", async () => {
    vi.mocked(db.readingListLike.deleteMany).mockResolvedValue({ count: 1 } as any);
    await unlikeList("l1", "m1");
    expect(db.readingListLike.deleteMany).toHaveBeenCalledWith({
      where: { listId: "l1", memberId: "m1" },
    });
  });

  it("followList creates a follow", async () => {
    vi.mocked(db.readingListFollow.upsert).mockResolvedValue({} as any);
    await followList("l1", "m1");
    expect(db.readingListFollow.upsert).toHaveBeenCalled();
  });

  it("unfollowList removes a follow", async () => {
    vi.mocked(db.readingListFollow.deleteMany).mockResolvedValue({ count: 1 } as any);
    await unfollowList("l1", "m1");
    expect(db.readingListFollow.deleteMany).toHaveBeenCalled();
  });
});

describe("reading-lists: retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getReadingList", () => {
    it("returns null when list not found", async () => {
      vi.mocked(db.readingList.findUnique).mockResolvedValue(null);
      const result = await getReadingList("l1", "m1");
      expect(result).toBeNull();
    });

    it("returns null for private list to non-owner", async () => {
      vi.mocked(db.readingList.findUnique).mockResolvedValue({
        id: "l1",
        memberId: "m2",
        visibility: "PRIVATE",
        title: "Secret",
        description: null,
        category: "CUSTOM",
        coverColor: "#000",
        coverEmoji: "📚",
        tags: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
        member: { id: "m2", fullName: "X", user: { role: "STUDENT" } },
        items: [],
        _count: { likes: 0, follows: 0 },
      } as any);
      const result = await getReadingList("l1", "m1");
      expect(result).toBeNull();
    });

    it("returns public list to anyone", async () => {
      vi.mocked(db.readingList.findUnique).mockResolvedValue({
        id: "l1",
        memberId: "m2",
        visibility: "PUBLIC",
        title: "Public List",
        description: "Test",
        category: "THEMED",
        coverColor: "#000",
        coverEmoji: "📚",
        tags: '["tag1"]',
        createdAt: new Date(),
        updatedAt: new Date(),
        member: { id: "m2", fullName: "Owner", user: { role: "LIBRARIAN" } },
        items: [
          {
            bookId: "b1",
            position: 0,
            addedAt: new Date(),
            book: { id: "b1", title: "Book A", author: "X", coverColor: "#fff", coverImage: null },
          },
        ],
        _count: { likes: 5, follows: 3 },
      } as any);
      vi.mocked(db.readingListLike.findUnique).mockResolvedValue({} as any);
      vi.mocked(db.readingListFollow.findUnique).mockResolvedValue(null);

      const result = await getReadingList("l1", "m1");
      expect(result?.title).toBe("Public List");
      expect(result?.bookCount).toBe(1);
      expect(result?.likeCount).toBe(5);
      expect(result?.isLiked).toBe(true);
      expect(result?.isFollowed).toBe(false);
      expect(result?.tags).toEqual(["tag1"]);
      expect(result?.books[0].title).toBe("Book A");
    });
  });

  describe("listPublicReadingLists", () => {
    it("returns paginated public lists", async () => {
      vi.mocked(db.readingList.findMany).mockResolvedValue([
        {
          id: "l1",
          memberId: "m1",
          visibility: "PUBLIC",
          title: "List 1",
          description: null,
          category: "RECOMMENDED",
          coverColor: "#000",
          coverEmoji: "⭐",
          tags: "[]",
          createdAt: new Date(),
          updatedAt: new Date(),
          member: { id: "m1", fullName: "A", user: { role: "LIBRARIAN" } },
          items: [{ bookId: "b1" }, { bookId: "b2" }],
          _count: { likes: 10, follows: 5 },
        },
      ] as any);
      vi.mocked(db.readingList.count).mockResolvedValue(1);

      const result = await listPublicReadingLists({ limit: 10 });
      expect(result.lists).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.lists[0].bookCount).toBe(2);
      expect(result.lists[0].likeCount).toBe(10);
    });

    it("filters by category", async () => {
      vi.mocked(db.readingList.findMany).mockResolvedValue([]);
      vi.mocked(db.readingList.count).mockResolvedValue(0);
      await listPublicReadingLists({ category: "GENRE" });
      expect(db.readingList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "GENRE" }),
        })
      );
    });

    it("searches by title", async () => {
      vi.mocked(db.readingList.findMany).mockResolvedValue([]);
      vi.mocked(db.readingList.count).mockResolvedValue(0);
      await listPublicReadingLists({ search: "fantasi" });
      expect(db.readingList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe("getMemberLists", () => {
    it("returns all lists for own profile", async () => {
      vi.mocked(db.readingList.findMany).mockResolvedValue([
        {
          id: "l1",
          memberId: "m1",
          visibility: "PRIVATE",
          title: "Private",
          description: null,
          category: "CUSTOM",
          coverColor: "#000",
          coverEmoji: "📚",
          tags: "[]",
          createdAt: new Date(),
          updatedAt: new Date(),
          member: { id: "m1", fullName: "Me", user: { role: "STUDENT" } },
          items: [],
          _count: { likes: 0, follows: 0 },
        },
      ] as any);

      const result = await getMemberLists("m1", "m1");
      expect(result).toHaveLength(1);
    });

    it("filters out private for other viewers", async () => {
      vi.mocked(db.readingList.findMany).mockResolvedValue([]);
      await getMemberLists("m1", "m2");
      expect(db.readingList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ visibility: "PUBLIC" }),
        })
      );
    });
  });

  describe("getFollowedLists", () => {
    it("returns followed lists", async () => {
      vi.mocked(db.readingListFollow.findMany).mockResolvedValue([
        {
          list: {
            id: "l1",
            memberId: "m2",
            visibility: "PUBLIC",
            title: "Followed",
            description: null,
            category: "THEMED",
            coverColor: "#000",
            coverEmoji: "📚",
            tags: "[]",
            createdAt: new Date(),
            updatedAt: new Date(),
            member: { id: "m2", fullName: "Owner", user: { role: "LIBRARIAN" } },
            items: [{ bookId: "b1" }],
            _count: { likes: 3, follows: 7 },
          },
        },
      ] as any);

      const result = await getFollowedLists("m1");
      expect(result).toHaveLength(1);
      expect(result[0].isFollowed).toBe(true);
    });
  });
});

describe("reading-lists: comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commentOnList creates a comment", async () => {
    vi.mocked(db.readingListComment.create).mockResolvedValue({ id: "c1" } as any);
    const id = await commentOnList("l1", "m1", "Great list!");
    expect(id).toBe("c1");
  });

  it("rejects deleting other user's comment", async () => {
    vi.mocked(db.readingListComment.findUnique).mockResolvedValue({ memberId: "m2" } as any);
    await expect(deleteListComment("c1", "m1")).rejects.toThrow();
  });

  it("allows owner to delete", async () => {
    vi.mocked(db.readingListComment.findUnique).mockResolvedValue({ memberId: "m1" } as any);
    vi.mocked(db.readingListComment.delete).mockResolvedValue({} as any);
    const result = await deleteListComment("c1", "m1");
    expect(result).toBe(true);
  });

  it("getListComments returns recent first", async () => {
    vi.mocked(db.readingListComment.findMany).mockResolvedValue([
      { id: "c1", memberId: "m1", comment: "First", createdAt: new Date(), member: { id: "m1", fullName: "A", photo: null } },
    ] as any);
    const result = await getListComments("l1");
    expect(result).toHaveLength(1);
  });
});

describe("reading-lists: seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seedCuratedLists returns 0 when no librarian", async () => {
    vi.mocked(db.member.findMany).mockResolvedValue([]);
    const result = await seedCuratedLists();
    expect(result).toBe(0);
  });

  it("seedCuratedLists creates 3 lists", async () => {
    vi.mocked(db.member.findMany).mockResolvedValue([{ id: "lib1" }] as any);
    vi.mocked(db.readingList.create).mockResolvedValue({ id: "new" } as any);
    const result = await seedCuratedLists();
    expect(result).toBe(3);
  });

  it("continues on duplicate errors", async () => {
    vi.mocked(db.member.findMany).mockResolvedValue([{ id: "lib1" }] as any);
    vi.mocked(db.readingList.create)
      .mockRejectedValueOnce(new Error("duplicate"))
      .mockResolvedValueOnce({ id: "new" } as any)
      .mockResolvedValueOnce({ id: "new" } as any);
    const result = await seedCuratedLists();
    expect(result).toBe(2);
  });
});
