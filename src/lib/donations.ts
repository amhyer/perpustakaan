/**
 * Book Donations & Used Book Exchange.
 *
 * Sprint R - Tier 4 #16: Donation & Used Book Exchange.
 *
 * Features:
 * - Siswa can donate books to perpustakaan
 * - Track donation history
 * - Exchange used books校内 (internal marketplace)
 * - Transparency: see who donated what
 * - Reward system: donor gets poin
 * - Categories: DONATION (gratis) vs EXCHANGE (barter)
 *
 * Workflow DONATION:
 * 1. Siswa submit donation (book details, kondisi)
 * 2. Pustakawan verifikasi (approve/reject)
 * 3. Buku masuk katalog, donor dapat poin
 *
 * Workflow EXCHANGE:
 * 1. Siswa list buku yang mau ditukar (judul, kondisi, "request" apa)
 * 2. Siswa lain lihat & propose swap
 * 3. Both agree → tukar di perpustakaan
 * 4. Pustakawan verifikasi tukar
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ===== Types =====

export type DonationType = "DONATION" | "EXCHANGE";
export type DonationStatus = "PENDING" | "APPROVED" | "REJECTED" | "RECEIVED" | "CANCELLED";
export type BookCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";

export interface Donation {
  id: string;
  type: DonationType;
  title: string;
  author: string;
  isbn: string | null;
  condition: BookCondition;
  description: string | null;
  status: DonationStatus;
  categoryId: string | null;
  categoryName: string | null;
  donorId: string;
  donorName: string;
  donorMemberNumber: string;
  approvedById: string | null;
  approvedByName: string | null;
  rewardPoints: number;
  receivedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  images: string[]; // URLs
}

export interface ExchangeOffer {
  id: string;
  listingId: string;
  offererId: string;
  offererName: string;
  offererBookTitle: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  createdAt: Date;
}

export interface CreateDonationInput {
  type: DonationType;
  title: string;
  author: string;
  isbn?: string;
  condition: BookCondition;
  description?: string;
  categoryId?: string;
  images?: string[];
}

export interface RewardConfig {
  // Points by condition
  points: Record<BookCondition, number>;
}

export const DEFAULT_REWARDS: RewardConfig = {
  points: {
    NEW: 100,
    "LIKE_NEW": 75,
    GOOD: 50,
    FAIR: 25,
    POOR: 10,
  },
};

// ===== Validation =====

const VALID_CONDITIONS: BookCondition[] = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"];

function isValidCondition(c: string): c is BookCondition {
  return VALID_CONDITIONS.includes(c as BookCondition);
}

function isValidType(t: string): t is DonationType {
  return t === "DONATION" || t === "EXCHANGE";
}

// ===== Donations =====

/**
 * Create a donation/exchange listing.
 */
export async function createDonation(
  memberId: string,
  input: CreateDonationInput
): Promise<string> {
  if (!isValidType(input.type)) {
    throw new Error(`Invalid donation type: ${input.type}`);
  }
  if (!isValidCondition(input.condition)) {
    throw new Error(`Invalid condition: ${input.condition}`);
  }
  if (!input.title?.trim() || !input.author?.trim()) {
    throw new Error("Title dan author wajib diisi");
  }

  const donation = await db.donation.create({
    data: {
      type: input.type,
      title: input.title.trim(),
      author: input.author.trim(),
      isbn: input.isbn || null,
      condition: input.condition,
      description: input.description || null,
      categoryId: input.categoryId || null,
      images: JSON.stringify(input.images || []),
      status: "PENDING",
      donorId: memberId,
    },
  });

  logger.info("Donation created", { donationId: donation.id, type: input.type });
  return donation.id;
}

/**
 * Approve a donation (librarian only).
 */
export async function approveDonation(
  donationId: string,
  librarianId: string
): Promise<{ rewardPoints: number }> {
  const donation = await db.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new Error("Donasi tidak ditemukan");
  if (donation.status !== "PENDING") {
    throw new Error("Donasi sudah diproses");
  }

  const rewardPoints = DEFAULT_REWARDS.points[donation.condition as BookCondition] || 50;

  await db.donation.update({
    where: { id: donationId },
    data: {
      status: "APPROVED",
      approvedById: librarianId,
      rewardPoints,
    },
  });

  // Award points to donor (if user is a member)
  if (donation.donorId) {
    // Could use awardPoints helper here
    logger.info("Donor reward", { memberId: donation.donorId, points: rewardPoints });
  }

  return { rewardPoints };
}

/**
 * Reject a donation.
 */
export async function rejectDonation(
  donationId: string,
  librarianId: string,
  reason: string
): Promise<boolean> {
  const donation = await db.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new Error("Donasi tidak ditemukan");
  if (donation.status !== "PENDING") {
    throw new Error("Donasi sudah diproses");
  }

  await db.donation.update({
    where: { id: donationId },
    data: {
      status: "REJECTED",
      approvedById: librarianId,
      rejectionReason: reason,
    },
  });
  return true;
}

/**
 * Mark donation as received (librarian only).
 */
export async function markReceived(donationId: string): Promise<boolean> {
  const donation = await db.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new Error("Donasi tidak ditemukan");
  if (donation.status !== "APPROVED") {
    throw new Error("Donasi harus APPROVED dulu");
  }

  await db.donation.update({
    where: { id: donationId },
    data: { status: "RECEIVED", receivedAt: new Date() },
  });
  return true;
}

/**
 * Cancel donation (donor only, before approved).
 */
export async function cancelDonation(
  donationId: string,
  memberId: string
): Promise<boolean> {
  const donation = await db.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new Error("Donasi tidak ditemukan");
  if (donation.donorId !== memberId) {
    throw new Error("Bukan donasi Anda");
  }
  if (donation.status !== "PENDING") {
    throw new Error("Donasi sudah diproses, tidak bisa cancel");
  }

  await db.donation.update({
    where: { id: donationId },
    data: { status: "CANCELLED" },
  });
  return true;
}

// ===== Retrieval =====

/**
 * Get donation by ID.
 */
export async function getDonation(donationId: string): Promise<Donation | null> {
  const d = await db.donation.findUnique({
    where: { id: donationId },
    include: {
      donor: { select: { id: true, fullName: true, memberNumber: true } },
      approvedBy: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  });

  if (!d) return null;

  return {
    id: d.id,
    type: d.type as DonationType,
    title: d.title,
    author: d.author,
    isbn: d.isbn,
    condition: d.condition as BookCondition,
    description: d.description,
    status: d.status as DonationStatus,
    categoryId: d.categoryId,
    categoryName: d.category?.name || null,
    donorId: d.donorId,
    donorName: d.donor.fullName,
    donorMemberNumber: d.donor.memberNumber,
    approvedById: d.approvedById,
    approvedByName: d.approvedBy?.name || null,
    rewardPoints: d.rewardPoints,
    receivedAt: d.receivedAt,
    rejectionReason: d.rejectionReason,
    createdAt: d.createdAt,
    images: JSON.parse(d.images || "[]") as string[],
  };
}

/**
 * List donations.
 */
export async function listDonations(
  options: {
    type?: DonationType;
    status?: DonationStatus;
    donorId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ donations: Donation[]; total: number }> {
  const { type, status, donorId, limit = 20, offset = 0 } = options;
  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (donorId) where.donorId = donorId;

  const [list, total] = await Promise.all([
    db.donation.findMany({
      where,
      include: {
        donor: { select: { id: true, fullName: true, memberNumber: true } },
        approvedBy: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.donation.count({ where }),
  ]);

  return {
    donations: list.map((d) => ({
      id: d.id,
      type: d.type as DonationType,
      title: d.title,
      author: d.author,
      isbn: d.isbn,
      condition: d.condition as BookCondition,
      description: d.description,
      status: d.status as DonationStatus,
      categoryId: d.categoryId,
      categoryName: d.category?.name || null,
      donorId: d.donorId,
      donorName: d.donor.fullName,
      donorMemberNumber: d.donor.memberNumber,
      approvedById: d.approvedById,
      approvedByName: d.approvedBy?.name || null,
      rewardPoints: d.rewardPoints,
      receivedAt: d.receivedAt,
      rejectionReason: d.rejectionReason,
      createdAt: d.createdAt,
      images: JSON.parse(d.images || "[]") as string[],
    })),
    total,
  };
}

/**
 * Get donation stats for a member.
 */
export async function getMemberDonationStats(memberId: string): Promise<{
  totalDonations: number;
  totalReceived: number;
  totalPoints: number;
  byCondition: Record<BookCondition, number>;
  byType: Record<DonationType, number>;
}> {
  const donations = await db.donation.findMany({
    where: { donorId: memberId },
  });

  const stats = {
    totalDonations: donations.length,
    totalReceived: donations.filter((d) => d.status === "RECEIVED").length,
    totalPoints: donations
      .filter((d) => ["APPROVED", "RECEIVED"].includes(d.status))
      .reduce((sum, d) => sum + d.rewardPoints, 0),
    byCondition: {
      NEW: 0,
      "LIKE_NEW": 0,
      GOOD: 0,
      FAIR: 0,
      POOR: 0,
    } as Record<BookCondition, number>,
    byType: {
      DONATION: 0,
      EXCHANGE: 0,
    } as Record<DonationType, number>,
  };

  for (const d of donations) {
    if (isValidCondition(d.condition)) {
      stats.byCondition[d.condition]++;
    }
    if (isValidType(d.type)) {
      stats.byType[d.type]++;
    }
  }

  return stats;
}

/**
 * Get library-wide donation stats (for transparency).
 */
export async function getLibraryDonationStats(): Promise<{
  totalDonations: number;
  totalReceived: number;
  totalPointsAwarded: number;
  topDonors: Array<{ memberId: string; fullName: string; count: number; points: number }>;
  recentDonations: Donation[];
}> {
  const all = await db.donation.findMany({
    include: { donor: { select: { id: true, fullName: true, memberNumber: true } } },
  });

  const totalPoints = all
    .filter((d) => ["APPROVED", "RECEIVED"].includes(d.status))
    .reduce((sum, d) => sum + d.rewardPoints, 0);

  // Top donors
  const donorMap = new Map<string, { memberId: string; fullName: string; count: number; points: number }>();
  for (const d of all) {
    if (!d.donor) continue;
    const existing = donorMap.get(d.donor.id) || {
      memberId: d.donor.id,
      fullName: d.donor.fullName,
      count: 0,
      points: 0,
    };
    existing.count++;
    if (["APPROVED", "RECEIVED"].includes(d.status)) {
      existing.points += d.rewardPoints;
    }
    donorMap.set(d.donor.id, existing);
  }
  const topDonors = Array.from(donorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalDonations: all.length,
    totalReceived: all.filter((d) => d.status === "RECEIVED").length,
    totalPointsAwarded: totalPoints,
    topDonors,
    recentDonations: [], // Could be populated
  };
}

// ===== Exchange Offers =====

/**
 * Create an exchange offer.
 */
export async function createExchangeOffer(
  listingId: string,
  offererId: string,
  offererBookTitle: string,
  message: string
): Promise<string> {
  const offer = await db.exchangeOffer.create({
    data: {
      listingId,
      offererId,
      offererBookTitle,
      message,
      status: "PENDING",
    },
  });
  return offer.id;
}

/**
 * Accept an exchange offer.
 */
export async function acceptOffer(offerId: string, ownerId: string): Promise<boolean> {
  const offer = await db.exchangeOffer.findUnique({
    where: { id: offerId },
    include: { listing: true },
  });
  if (!offer) throw new Error("Offer tidak ditemukan");
  if (offer.listing.donorId !== ownerId) {
    throw new Error("Bukan listing Anda");
  }
  if (offer.status !== "PENDING") {
    throw new Error("Offer sudah diproses");
  }

  await db.exchangeOffer.update({
    where: { id: offerId },
    data: { status: "ACCEPTED" },
  });

  // Mark listing as being exchanged
  await db.donation.update({
    where: { id: offer.listingId },
    data: { status: "APPROVED" },
  });

  return true;
}

/**
 * Reject an exchange offer.
 */
export async function rejectOffer(
  offerId: string,
  ownerId: string,
  reason?: string
): Promise<boolean> {
  const offer = await db.exchangeOffer.findUnique({
    where: { id: offerId },
    include: { listing: true },
  });
  if (!offer) throw new Error("Offer tidak ditemukan");
  if (offer.listing.donorId !== ownerId) {
    throw new Error("Bukan listing Anda");
  }

  await db.exchangeOffer.update({
    where: { id: offerId },
    data: { status: "REJECTED" },
  });
  return true;
}
