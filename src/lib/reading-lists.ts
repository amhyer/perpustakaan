/**
 * Reading Lists — Public & private book collections.
 *
 * Sprint O - Tier 2 #6: Social reading features.
 *
 * Features:
 * - Create curated reading lists ("List bacaan Budi")
 * - Public / private visibility
 * - Add/remove books from list
 * - Like/favorite lists
 * - Follow lists (subscribe to updates)
 * - Comments on lists
 * - List categories (themed, recommended, genre-specific)
 * - Browse trending lists
 *
 * Pure logic library with DB operations.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ===== Types =====

export type ListVisibility = "PUBLIC" | "PRIVATE" | "FOLLOWERS_ONLY";
export type ListCategory =
  | "THEMED" // "Buku Persahabatan untuk SMP"
  | "RECOMMENDED" // "Rekomendasi Pustakawan"
  | "GENRE" // "10 Novel Romance Terbaik"
  | "ACADEMIC" // "Buku Pelajaran Wajib"
  | "BEGINNER" // "Untuk Pemula"
  | "ADVANCED" // "Tingkat Lanjut"
  | "CUSTOM";

export interface ReadingList {
  id: string;
  title: string;
  description: string | null;
  category: ListCategory;
  visibility: ListVisibility;
  coverColor: string;
  coverEmoji: string;
  bookIds: string[];
  bookCount: number;
  createdById: string;
  createdByName: string;
  createdByRole: string;
  likeCount: number;
  followerCount: number;
  isLiked: boolean;
  isFollowed: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface ListWithBooks extends ReadingList {
  books: Array<{
    bookId: string;
    title: string;
    author: string;
    coverColor: string;
    coverImage: string | null;
    position: number;
    addedAt: Date;
  }>;
}

export interface CreateListInput {
  title: string;
  description?: string;
  category: ListCategory;
  visibility: ListVisibility;
  coverColor?: string;
  coverEmoji?: string;
  tags?: string[];
}

export interface UpdateListInput {
  title?: string;
  description?: string;
  category?: ListCategory;
  visibility?: ListVisibility;
  coverColor?: string;
  coverEmoji?: string;
  tags?: string[];
}

// ===== List CRUD =====

/**
 * Create a new reading list.
 */
export async function createReadingList(
  memberId: string,
  input: CreateListInput
): Promise<string> {
  const list = await db.readingList.create({
    data: {
      memberId,
      title: input.title,
      description: input.description || null,
      category: input.category,
      visibility: input.visibility,
      coverColor: input.coverColor || "#3b82f6",
      coverEmoji: input.coverEmoji || "📚",
      tags: input.tags ? JSON.stringify(input.tags) : "[]",
    },
  });
  logger.info("Reading list created", { listId: list.id, memberId });
  return list.id;
}

/**
 * Update list metadata.
 */
export async function updateReadingList(
  listId: string,
  memberId: string,
  input: UpdateListInput
): Promise<boolean> {
  // Verify ownership
  const list = await db.readingList.findUnique({ where: { id: listId } });
  if (!list || list.memberId !== memberId) {
    throw new Error("List tidak ditemukan atau bukan milik Anda");
  }

  await db.readingList.update({
    where: { id: listId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
      ...(input.coverColor !== undefined && { coverColor: input.coverColor }),
      ...(input.coverEmoji !== undefined && { coverEmoji: input.coverEmoji }),
      ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
    },
  });
  return true;
}

/**
 * Delete a reading list.
 */
export async function deleteReadingList(listId: string, memberId: string): Promise<boolean> {
  const list = await db.readingList.findUnique({ where: { id: listId } });
  if (!list || list.memberId !== memberId) {
    throw new Error("List tidak ditemukan atau bukan milik Anda");
  }

  await db.$transaction([
    db.readingListItem.deleteMany({ where: { listId } }),
    db.readingListLike.deleteMany({ where: { listId } }),
    db.readingListFollow.deleteMany({ where: { listId } }),
    db.readingList.delete({ where: { id: listId } }),
  ]);
  return true;
}

// ===== List Items (Books) =====

/**
 * Add a book to a list.
 */
export async function addBookToList(
  listId: string,
  bookId: string,
  memberId: string
): Promise<boolean> {
  const list = await db.readingList.findUnique({ where: { id: listId } });
  if (!list) throw new Error("List tidak ditemukan");
  if (list.memberId !== memberId) {
    throw new Error("Hanya pemilik yang bisa menambah buku");
  }

  // Get current max position
  const lastItem = await db.readingListItem.findFirst({
    where: { listId },
    orderBy: { position: "desc" },
  });
  const nextPosition = (lastItem?.position ?? -1) + 1;

  await db.readingListItem.upsert({
    where: { listId_bookId: { listId, bookId } },
    create: { listId, bookId, position: nextPosition },
    update: {},
  });
  return true;
}

/**
 * Remove a book from a list.
 */
export async function removeBookFromList(
  listId: string,
  bookId: string,
  memberId: string
): Promise<boolean> {
  const list = await db.readingList.findUnique({ where: { id: listId } });
  if (!list) throw new Error("List tidak ditemukan");
  if (list.memberId !== memberId) {
    throw new Error("Hanya pemilik yang bisa menghapus buku");
  }

  await db.readingListItem.deleteMany({
    where: { listId, bookId },
  });
  return true;
}

/**
 * Reorder books in a list.
 */
export async function reorderListBooks(
  listId: string,
  bookIds: string[],
  memberId: string
): Promise<boolean> {
  const list = await db.readingList.findUnique({ where: { id: listId } });
  if (!list) throw new Error("List tidak ditemukan");
  if (list.memberId !== memberId) {
    throw new Error("Hanya pemilik yang bisa reorder");
  }

  await db.$transaction(
    bookIds.map((bookId, idx) =>
      db.readingListItem.update({
        where: { listId_bookId: { listId, bookId } },
        data: { position: idx },
      })
    )
  );
  return true;
}

// ===== Likes & Follows =====

/**
 * Like a list.
 */
export async function likeList(listId: string, memberId: string): Promise<boolean> {
  await db.readingListLike.upsert({
    where: { listId_memberId: { listId, memberId } },
    create: { listId, memberId },
    update: {},
  });
  return true;
}

/**
 * Unlike a list.
 */
export async function unlikeList(listId: string, memberId: string): Promise<boolean> {
  await db.readingListLike.deleteMany({
    where: { listId, memberId },
  });
  return true;
}

/**
 * Follow a list (subscribe to updates).
 */
export async function followList(listId: string, memberId: string): Promise<boolean> {
  await db.readingListFollow.upsert({
    where: { listId_memberId: { listId, memberId } },
    create: { listId, memberId },
    update: {},
  });
  return true;
}

/**
 * Unfollow a list.
 */
export async function unfollowList(listId: string, memberId: string): Promise<boolean> {
  await db.readingListFollow.deleteMany({
    where: { listId, memberId },
  });
  return true;
}

// ===== Retrieval =====

/**
 * Get a single list with all details.
 */
export async function getReadingList(
  listId: string,
  viewerId: string | null
): Promise<ListWithBooks | null> {
  const list = await db.readingList.findUnique({
    where: { id: listId },
    include: {
      member: { select: { id: true, fullName: true, user: { select: { role: true } } } },
      items: {
        orderBy: { position: "asc" },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverColor: true,
              coverImage: true,
            },
          },
        },
      },
      _count: { select: { likes: true, follows: true } },
    },
  });

  if (!list) return null;

  // Check visibility
  if (list.visibility === "PRIVATE" && list.memberId !== viewerId) {
    return null;
  }

  // Check like/follow status for viewer
  const [isLiked, isFollowed] = viewerId
    ? await Promise.all([
        db.readingListLike.findUnique({
          where: { listId_memberId: { listId, memberId: viewerId } },
        }),
        db.readingListFollow.findUnique({
          where: { listId_memberId: { listId, memberId: viewerId } },
        }),
      ])
    : [null, null];

  const tags = JSON.parse(list.tags || "[]") as string[];

  return {
    id: list.id,
    title: list.title,
    description: list.description,
    category: list.category as ListCategory,
    visibility: list.visibility as ListVisibility,
    coverColor: list.coverColor,
    coverEmoji: list.coverEmoji,
    bookIds: list.items.map((i) => i.bookId),
    bookCount: list.items.length,
    createdById: list.memberId,
    createdByName: list.member.fullName,
    createdByRole: list.member.user.role,
    likeCount: list._count.likes,
    followerCount: list._count.follows,
    isLiked: !!isLiked,
    isFollowed: !!isFollowed,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    tags,
    books: list.items.map((i) => ({
      bookId: i.bookId,
      title: i.book.title,
      author: i.book.author,
      coverColor: i.book.coverColor,
      coverImage: i.book.coverImage,
      position: i.position,
      addedAt: i.addedAt,
    })),
  };
}

/**
 * List public reading lists (browse mode).
 */
export async function listPublicReadingLists(
  options: {
    category?: ListCategory;
    memberId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: "recent" | "popular" | "trending";
  } = {}
): Promise<{ lists: ReadingList[]; total: number }> {
  const {
    category,
    memberId,
    search,
    limit = 20,
    offset = 0,
    sortBy = "recent",
  } = options;

  const where: any = {
    visibility: "PUBLIC",
  };
  if (category) where.category = category;
  if (memberId) where.memberId = memberId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const orderBy: any =
    sortBy === "recent"
      ? { updatedAt: "desc" }
      : { likes: { _count: "desc" } };

  const [lists, total] = await Promise.all([
    db.readingList.findMany({
      where,
      include: {
        member: { select: { id: true, fullName: true, user: { select: { role: true } } } },
        items: { select: { bookId: true } },
        _count: { select: { likes: true, follows: true } },
      },
      orderBy,
      take: limit,
      skip: offset,
    }),
    db.readingList.count({ where }),
  ]);

  const result = lists.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    category: l.category as ListCategory,
    visibility: l.visibility as ListVisibility,
    coverColor: l.coverColor,
    coverEmoji: l.coverEmoji,
    bookIds: l.items.map((i) => i.bookId),
    bookCount: l.items.length,
    createdById: l.memberId,
    createdByName: l.member.fullName,
    createdByRole: l.member.user.role,
    likeCount: l._count.likes,
    followerCount: l._count.follows,
    isLiked: false, // Would need viewer ID
    isFollowed: false,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    tags: JSON.parse(l.tags || "[]") as string[],
  }));

  return { lists: result, total };
}

/**
 * Get lists created by a specific member.
 */
export async function getMemberLists(
  memberId: string,
  viewerId: string | null,
  options: { includePrivate?: boolean } = {}
): Promise<ReadingList[]> {
  const includePrivate = options.includePrivate ?? viewerId === memberId;

  const lists = await db.readingList.findMany({
    where: {
      memberId,
      ...(includePrivate ? {} : { visibility: "PUBLIC" }),
    },
    include: {
      member: { select: { id: true, fullName: true, user: { select: { role: true } } } },
      items: { select: { bookId: true } },
      _count: { select: { likes: true, follows: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return lists.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    category: l.category as ListCategory,
    visibility: l.visibility as ListVisibility,
    coverColor: l.coverColor,
    coverEmoji: l.coverEmoji,
    bookIds: l.items.map((i) => i.bookId),
    bookCount: l.items.length,
    createdById: l.memberId,
    createdByName: l.member.fullName,
    createdByRole: l.member.user.role,
    likeCount: l._count.likes,
    followerCount: l._count.follows,
    isLiked: false,
    isFollowed: false,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    tags: JSON.parse(l.tags || "[]") as string[],
  }));
}

/**
 * Get lists a member follows.
 */
export async function getFollowedLists(
  memberId: string,
  limit: number = 20
): Promise<ReadingList[]> {
  const follows = await db.readingListFollow.findMany({
    where: { memberId },
    include: {
      list: {
        include: {
          member: { select: { id: true, fullName: true, user: { select: { role: true } } } },
          items: { select: { bookId: true } },
          _count: { select: { likes: true, follows: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return follows.map((f) => {
    const l = f.list;
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      category: l.category as ListCategory,
      visibility: l.visibility as ListVisibility,
      coverColor: l.coverColor,
      coverEmoji: l.coverEmoji,
      bookIds: l.items.map((i) => i.bookId),
      bookCount: l.items.length,
      createdById: l.memberId,
      createdByName: l.member.fullName,
      createdByRole: l.member.user.role,
      likeCount: l._count.likes,
      followerCount: l._count.follows,
      isLiked: false,
      isFollowed: true,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      tags: JSON.parse(l.tags || "[]") as string[],
    };
  });
}

// ===== Comments =====

/**
 * Add a comment to a list.
 */
export async function commentOnList(
  listId: string,
  memberId: string,
  comment: string
): Promise<string> {
  const c = await db.readingListComment.create({
    data: { listId, memberId, comment },
  });
  return c.id;
}

/**
 * Delete a comment.
 */
export async function deleteListComment(commentId: string, memberId: string): Promise<boolean> {
  const c = await db.readingListComment.findUnique({ where: { id: commentId } });
  if (!c || c.memberId !== memberId) {
    throw new Error("Komentar tidak ditemukan atau bukan milik Anda");
  }
  await db.readingListComment.delete({ where: { id: commentId } });
  return true;
}

/**
 * Get comments for a list.
 */
export async function getListComments(listId: string, limit: number = 50) {
  return await db.readingListComment.findMany({
    where: { listId },
    include: {
      member: { select: { id: true, fullName: true, photo: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ===== Seed Data =====

/**
 * Create pre-defined curated lists (run on first setup).
 */
export async function seedCuratedLists(): Promise<number> {
  const librarianMembers = await db.member.findMany({
    where: { user: { role: "LIBRARIAN" } },
    take: 1,
  });
  if (librarianMembers.length === 0) return 0;
  const librarian = librarianMembers[0];

  const curatedLists: CreateListInput[] = [
    {
      title: "📖 Rekomendasi Pustakawan: Bulan Ini",
      description: "Buku-buku pilihan yang wajib dibaca bulan ini. Disusun oleh tim pustakawan.",
      category: "RECOMMENDED",
      visibility: "PUBLIC",
      coverEmoji: "⭐",
      coverColor: "#fbbf24",
      tags: ["rekomendasi", "bulan-ini", "pustakawan"],
    },
    {
      title: "🌟 Pemula: Mulai dari Sini",
      description: "Buku-buku ringan untuk siswa yang baru mulai gemar membaca.",
      category: "BEGINNER",
      visibility: "PUBLIC",
      coverEmoji: "🌱",
      coverColor: "#10b981",
      tags: ["pemula", "mudah", "ringan"],
    },
    {
      title: "📚 Wajib Baca untuk Kelas 12",
      description: "Daftar buku yang direkomendasikan untuk siswa kelas 12 menjelang kelulusan.",
      category: "ACADEMIC",
      visibility: "PUBLIC",
      coverEmoji: "🎓",
      coverColor: "#3b82f6",
      tags: ["kelas-12", "wajib", "akademik"],
    },
  ];

  let created = 0;
  for (const list of curatedLists) {
    try {
      await createReadingList(librarian.id, list);
      created++;
    } catch {
      // Skip if duplicate
    }
  }
  return created;
}
