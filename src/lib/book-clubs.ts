/**
 * Book Clubs — Komunitas baca online.
 *
 * Sprint R - Tier 2 #6: Social Reading (lanjutan).
 *
 * Features:
 * - Create/join book clubs
 * - Currently reading book (synchronized across members)
 * - Discussion threads per book
 * - Reading schedule (weekly chapter targets)
 * - Member roles: OWNER, MODERATOR, MEMBER
 * - Public/private clubs
 * - Book club activity feed
 *
 * Use case: "Komunitas Buku Mingguan" — 20 siswa membaca 1 buku
 * yang sama, diskusi per chapter, jadwal reading.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ===== Types =====

export type ClubVisibility = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export type ClubMemberRole = "OWNER" | "MODERATOR" | "MEMBER";
export type ClubMemberStatus = "ACTIVE" | "PENDING" | "BANNED";

export interface BookClub {
  id: string;
  name: string;
  description: string;
  coverEmoji: string;
  coverColor: string;
  visibility: ClubVisibility;
  currentBookId: string | null;
  currentBookTitle: string | null;
  memberCount: number;
  discussionCount: number;
  createdById: string;
  createdByName: string;
  createdAt: Date;
  tags: string[];
}

export interface BookClubMember {
  clubId: string;
  memberId: string;
  memberName: string;
  memberPhoto: string | null;
  role: ClubMemberRole;
  status: ClubMemberStatus;
  progress: number; // 0-100 (pages or chapters read)
  joinedAt: Date;
  lastActiveAt: Date | null;
}

export interface ClubDiscussion {
  id: string;
  clubId: string;
  memberId: string;
  memberName: string;
  content: string;
  parentId: string | null; // For replies
  createdAt: Date;
  likeCount: number;
  replyCount: number;
}

export interface ReadingSchedule {
  id: string;
  clubId: string;
  bookId: string;
  startDate: Date;
  endDate: Date;
  chapterRange: string; // "Ch 1-5"
  targetProgress: number; // 0-100
  description: string;
}

export interface CreateClubInput {
  name: string;
  description: string;
  coverEmoji?: string;
  coverColor?: string;
  visibility: ClubVisibility;
  tags?: string[];
}

// ===== Club Management =====

/**
 * Create a new book club.
 */
export async function createBookClub(
  memberId: string,
  input: CreateClubInput
): Promise<string> {
  const club = await db.bookClub.create({
    data: {
      name: input.name,
      description: input.description,
      coverEmoji: input.coverEmoji || "📚",
      coverColor: input.coverColor || "#3b82f6",
      visibility: input.visibility,
      tags: JSON.stringify(input.tags || []),
      createdById: memberId,
    },
  });

  // Auto-add creator as OWNER
  await db.bookClubMember.create({
    data: {
      clubId: club.id,
      memberId,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  logger.info("Book club created", { clubId: club.id, memberId });
  return club.id;
}

/**
 * Update club details (OWNER/MODERATOR only).
 */
export async function updateBookClub(
  clubId: string,
  memberId: string,
  input: Partial<CreateClubInput> & { currentBookId?: string }
): Promise<boolean> {
  // Verify role
  const member = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId } },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "MODERATOR")) {
    throw new Error("Hanya OWNER atau MODERATOR yang dapat mengedit club");
  }

  await db.bookClub.update({
    where: { id: clubId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.coverEmoji !== undefined && { coverEmoji: input.coverEmoji }),
      ...(input.coverColor !== undefined && { coverColor: input.coverColor }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
      ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
      ...(input.currentBookId !== undefined && { currentBookId: input.currentBookId }),
    },
  });
  return true;
}

/**
 * Delete a book club (OWNER only).
 */
export async function deleteBookClub(clubId: string, memberId: string): Promise<boolean> {
  const member = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId } },
  });
  if (!member || member.role !== "OWNER") {
    throw new Error("Hanya OWNER yang dapat menghapus club");
  }

  await db.$transaction([
    db.bookClubMember.deleteMany({ where: { clubId } }),
    db.bookClubDiscussion.deleteMany({ where: { clubId } }),
    db.readingSchedule.deleteMany({ where: { clubId } }),
    db.bookClub.delete({ where: { id: clubId } }),
  ]);
  return true;
}

// ===== Membership =====

/**
 * Join a book club.
 */
export async function joinClub(
  clubId: string,
  memberId: string
): Promise<{ success: boolean; status: ClubMemberStatus }> {
  const club = await db.bookClub.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Club tidak ditemukan");

  if (club.visibility === "PRIVATE") {
    throw new Error("Club ini private, butuh undangan");
  }

  // Check if already member
  const existing = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId } },
  });

  if (existing) {
    return { success: true, status: existing.status as ClubMemberStatus };
  }

  const status: ClubMemberStatus = club.visibility === "INVITE_ONLY" ? "PENDING" : "ACTIVE";

  await db.bookClubMember.create({
    data: {
      clubId,
      memberId,
      role: "MEMBER",
      status,
    },
  });

  return { success: true, status };
}

/**
 * Leave a book club.
 */
export async function leaveClub(clubId: string, memberId: string): Promise<boolean> {
  const member = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId } },
  });
  if (!member) return false;
  if (member.role === "OWNER") {
    throw new Error("OWNER harus transfer ownership atau delete club dulu");
  }

  await db.bookClubMember.delete({
    where: { clubId_memberId: { clubId, memberId } },
  });
  return true;
}

/**
 * Approve pending member (MODERATOR+ only).
 */
export async function approveMember(
  clubId: string,
  memberId: string,
  approverId: string
): Promise<boolean> {
  const approver = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId: approverId } },
  });
  if (!approver || (approver.role !== "OWNER" && approver.role !== "MODERATOR")) {
    throw new Error("Tidak punya akses");
  }

  await db.bookClubMember.update({
    where: { clubId_memberId: { clubId, memberId } },
    data: { status: "ACTIVE" },
  });
  return true;
}

/**
 * Update member role (OWNER only).
 */
export async function updateMemberRole(
  clubId: string,
  memberId: string,
  newRole: ClubMemberRole,
  actorId: string
): Promise<boolean> {
  const actor = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId: actorId } },
  });
  if (!actor || actor.role !== "OWNER") {
    throw new Error("Hanya OWNER yang dapat mengubah role");
  }

  await db.bookClubMember.update({
    where: { clubId_memberId: { clubId, memberId } },
    data: { role: newRole },
  });
  return true;
}

// ===== Discussions =====

/**
 * Post a discussion message.
 */
export async function postDiscussion(
  clubId: string,
  memberId: string,
  content: string,
  parentId: string | null = null
): Promise<string> {
  // Verify membership
  const member = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId } },
  });
  if (!member || member.status !== "ACTIVE") {
    throw new Error("Anda bukan anggota aktif club ini");
  }

  const d = await db.bookClubDiscussion.create({
    data: { clubId, memberId, content, parentId },
  });

  // Update last active
  await db.bookClubMember.update({
    where: { clubId_memberId: { clubId, memberId } },
    data: { lastActiveAt: new Date() },
  });

  return d.id;
}

/**
 * Delete a discussion (own message or MODERATOR+).
 */
export async function deleteDiscussion(
  discussionId: string,
  memberId: string
): Promise<boolean> {
  const d = await db.bookClubDiscussion.findUnique({
    where: { id: discussionId },
  });
  if (!d) throw new Error("Diskusi tidak ditemukan");

  const member = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId: d.clubId, memberId } },
  });

  if (d.memberId !== memberId && (!member || (member.role !== "OWNER" && member.role !== "MODERATOR"))) {
    throw new Error("Tidak punya akses untuk menghapus");
  }

  await db.bookClubDiscussion.delete({ where: { id: discussionId } });
  return true;
}

/**
 * Like a discussion.
 */
export async function likeDiscussion(
  discussionId: string,
  memberId: string
): Promise<boolean> {
  await db.bookClubDiscussionLike.upsert({
    where: { discussionId_memberId: { discussionId, memberId } },
    create: { discussionId, memberId },
    update: {},
  });
  return true;
}

// ===== Reading Schedule =====

/**
 * Create a reading schedule entry.
 */
export async function createSchedule(
  clubId: string,
  memberId: string,
  input: {
    bookId: string;
    startDate: Date;
    endDate: Date;
    chapterRange: string;
    targetProgress: number;
    description: string;
  }
): Promise<string> {
  // Verify moderator+
  const m = await db.bookClubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId } },
  });
  if (!m || (m.role !== "OWNER" && m.role !== "MODERATOR")) {
    throw new Error("Hanya moderator+ yang dapat membuat schedule");
  }

  const s = await db.readingSchedule.create({
    data: {
      clubId,
      bookId: input.bookId,
      startDate: input.startDate,
      endDate: input.endDate,
      chapterRange: input.chapterRange,
      targetProgress: input.targetProgress,
      description: input.description,
    },
  });
  return s.id;
}

/**
 * Update member's reading progress.
 */
export async function updateProgress(
  clubId: string,
  memberId: string,
  progress: number
): Promise<boolean> {
  if (progress < 0 || progress > 100) {
    throw new Error("Progress harus 0-100");
  }

  await db.bookClubMember.update({
    where: { clubId_memberId: { clubId, memberId } },
    data: { progress, lastActiveAt: new Date() },
  });
  return true;
}

// ===== Retrieval =====

/**
 * Get a single book club with full details.
 */
export async function getBookClub(clubId: string): Promise<BookClub | null> {
  const club = await db.bookClub.findUnique({
    where: { id: clubId },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      members: { where: { status: "ACTIVE" } },
      discussions: true,
      currentBook: { select: { id: true, title: true } },
    },
  });

  if (!club) return null;

  return {
    id: club.id,
    name: club.name,
    description: club.description,
    coverEmoji: club.coverEmoji,
    coverColor: club.coverColor,
    visibility: club.visibility as ClubVisibility,
    currentBookId: club.currentBookId,
    currentBookTitle: club.currentBook?.title || null,
    memberCount: club.members.length,
    discussionCount: club.discussions.length,
    createdById: club.createdById,
    createdByName: club.createdBy.fullName,
    createdAt: club.createdAt,
    tags: JSON.parse(club.tags || "[]") as string[],
  };
}

/**
 * List public book clubs.
 */
export async function listPublicClubs(
  options: { search?: string; limit?: number; offset?: number } = {}
): Promise<{ clubs: BookClub[]; total: number }> {
  const { search, limit = 20, offset = 0 } = options;
  const where: any = { visibility: "PUBLIC" };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [clubs, total] = await Promise.all([
    db.bookClub.findMany({
      where,
      include: {
        createdBy: { select: { fullName: true } },
        members: { where: { status: "ACTIVE" } },
        discussions: true,
        currentBook: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.bookClub.count({ where }),
  ]);

  return {
    clubs: clubs.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      coverEmoji: c.coverEmoji,
      coverColor: c.coverColor,
      visibility: c.visibility as ClubVisibility,
      currentBookId: c.currentBookId,
      currentBookTitle: c.currentBook?.title || null,
      memberCount: c.members.length,
      discussionCount: c.discussions.length,
      createdById: c.createdById,
      createdByName: c.createdBy.fullName,
      createdAt: c.createdAt,
      tags: JSON.parse(c.tags || "[]") as string[],
    })),
    total,
  };
}

/**
 * Get clubs a member belongs to.
 */
export async function getMemberClubs(memberId: string): Promise<BookClub[]> {
  const memberships = await db.bookClubMember.findMany({
    where: { memberId, status: "ACTIVE" },
    include: {
      club: {
        include: {
          createdBy: { select: { fullName: true } },
          members: { where: { status: "ACTIVE" } },
          discussions: true,
          currentBook: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((m) => {
    const c = m.club;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      coverEmoji: c.coverEmoji,
      coverColor: c.coverColor,
      visibility: c.visibility as ClubVisibility,
      currentBookId: c.currentBookId,
      currentBookTitle: c.currentBook?.title || null,
      memberCount: c.members.length,
      discussionCount: c.discussions.length,
      createdById: c.createdById,
      createdByName: c.createdBy.fullName,
      createdAt: c.createdAt,
      tags: JSON.parse(c.tags || "[]") as string[],
    };
  });
}

/**
 * Get club members.
 */
export async function getClubMembers(clubId: string): Promise<BookClubMember[]> {
  const members = await db.bookClubMember.findMany({
    where: { clubId, status: "ACTIVE" },
    include: { member: { select: { id: true, fullName: true, photo: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  return members.map((m) => ({
    clubId: m.clubId,
    memberId: m.memberId,
    memberName: m.member.fullName,
    memberPhoto: m.member.photo,
    role: m.role as ClubMemberRole,
    status: m.status as ClubMemberStatus,
    progress: m.progress,
    joinedAt: m.joinedAt,
    lastActiveAt: m.lastActiveAt,
  }));
}

/**
 * Get discussions for a club.
 */
export async function getClubDiscussions(
  clubId: string,
  options: { limit?: number; parentId?: string | null } = {}
): Promise<ClubDiscussion[]> {
  const { limit = 50, parentId = null } = options;
  const where: any = { clubId };
  if (parentId === null) {
    where.parentId = null; // Top-level only
  } else {
    where.parentId = parentId;
  }

  const discussions = await db.bookClubDiscussion.findMany({
    where,
    include: {
      member: { select: { fullName: true } },
      _count: { select: { likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return discussions.map((d) => ({
    id: d.id,
    clubId: d.clubId,
    memberId: d.memberId,
    memberName: d.member.fullName,
    content: d.content,
    parentId: d.parentId,
    createdAt: d.createdAt,
    likeCount: d._count.likes,
    replyCount: 0, // Would need to count
  }));
}

// ===== Activity Feed =====

export interface ClubActivity {
  id: string;
  type: "JOIN" | "DISCUSSION" | "PROGRESS" | "SCHEDULE" | "BOOK_CHANGE";
  memberId: string;
  memberName: string;
  clubId: string;
  clubName: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Get recent activity across member's clubs.
 */
export async function getClubActivityFeed(
  memberId: string,
  limit: number = 20
): Promise<ClubActivity[]> {
  // Get member's clubs
  const clubs = await getMemberClubs(memberId);
  if (clubs.length === 0) return [];

  const clubIds = clubs.map((c) => c.id);

  // Get recent discussions
  const discussions = await db.bookClubDiscussion.findMany({
    where: { clubId: { in: clubIds } },
    include: {
      member: { select: { fullName: true } },
      club: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return discussions.map((d) => ({
    id: d.id,
    type: "DISCUSSION" as const,
    memberId: d.memberId,
    memberName: d.member.fullName,
    clubId: d.clubId,
    clubName: d.club.name,
    description: d.content.slice(0, 100),
    timestamp: d.createdAt,
    metadata: { discussionId: d.id },
  }));
}
