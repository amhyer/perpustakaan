/**
 * Tests for donation library.
 *
 * Sprint R - Tier 4 #16: Donation & Book Exchange.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    donation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    exchangeOffer: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  createDonation,
  approveDonation,
  rejectDonation,
  markReceived,
  cancelDonation,
  getDonation,
  listDonations,
  getMemberDonationStats,
  getLibraryDonationStats,
  createExchangeOffer,
  acceptOffer,
  rejectOffer,
  DEFAULT_REWARDS,
  type BookCondition,
} from "../donations";

describe("donations: validation & creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a donation", async () => {
    vi.mocked(db.donation.create).mockResolvedValue({ id: "d1" } as any);
    const id = await createDonation("m1", {
      type: "DONATION",
      title: "Laskar Pelangi",
      author: "Andrea Hirata",
      condition: "GOOD",
    });
    expect(id).toBe("d1");
  });

  it("rejects invalid donation type", async () => {
    await expect(
      createDonation("m1", {
        type: "INVALID" as any,
        title: "X",
        author: "Y",
        condition: "GOOD",
      })
    ).rejects.toThrow("Invalid donation type");
  });

  it("rejects invalid condition", async () => {
    await expect(
      createDonation("m1", {
        type: "DONATION",
        title: "X",
        author: "Y",
        condition: "INVALID" as any,
      })
    ).rejects.toThrow("Invalid condition");
  });

  it("rejects empty title or author", async () => {
    await expect(
      createDonation("m1", {
        type: "DONATION",
        title: "",
        author: "Y",
        condition: "GOOD",
      })
    ).rejects.toThrow("Title");
    await expect(
      createDonation("m1", {
        type: "DONATION",
        title: "X",
        author: "  ",
        condition: "GOOD",
      })
    ).rejects.toThrow("Title");
  });

  it("trims title and author", async () => {
    vi.mocked(db.donation.create).mockResolvedValue({ id: "d1" } as any);
    await createDonation("m1", {
      type: "DONATION",
      title: "  Laskar Pelangi  ",
      author: "  Andrea Hirata  ",
      condition: "GOOD",
    });
    expect(db.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Laskar Pelangi",
          author: "Andrea Hirata",
        }),
      })
    );
  });
});

describe("donations: approval workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("approveDonation", () => {
    it("approves PENDING donation and awards points", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        id: "d1",
        status: "PENDING",
        condition: "GOOD",
        donorId: "m1",
      } as any);
      vi.mocked(db.donation.update).mockResolvedValue({} as any);

      const result = await approveDonation("d1", "lib1");
      expect(result.rewardPoints).toBe(50); // GOOD = 50
    });

    it("rejects already-processed donation", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        status: "APPROVED",
      } as any);
      await expect(approveDonation("d1", "lib1")).rejects.toThrow("sudah diproses");
    });

    it("rejects non-existent donation", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue(null);
      await expect(approveDonation("d1", "lib1")).rejects.toThrow("tidak ditemukan");
    });

    it("awards different points by condition", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        status: "PENDING",
        condition: "NEW",
        donorId: "m1",
      } as any);
      vi.mocked(db.donation.update).mockResolvedValue({} as any);

      const result = await approveDonation("d1", "lib1");
      expect(result.rewardPoints).toBe(100);
    });
  });

  describe("rejectDonation", () => {
    it("rejects with reason", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        status: "PENDING",
      } as any);
      vi.mocked(db.donation.update).mockResolvedValue({} as any);
      const result = await rejectDonation("d1", "lib1", "Buku rusak");
      expect(result).toBe(true);
    });

    it("rejects already-processed", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        status: "REJECTED",
      } as any);
      await expect(rejectDonation("d1", "lib1", "X")).rejects.toThrow();
    });
  });

  describe("markReceived", () => {
    it("marks APPROVED donation as RECEIVED", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        status: "APPROVED",
      } as any);
      vi.mocked(db.donation.update).mockResolvedValue({} as any);
      const result = await markReceived("d1");
      expect(result).toBe(true);
    });

    it("rejects non-APPROVED donation", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        status: "PENDING",
      } as any);
      await expect(markReceived("d1")).rejects.toThrow("APPROVED");
    });
  });

  describe("cancelDonation", () => {
    it("allows donor to cancel PENDING", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        donorId: "m1",
        status: "PENDING",
      } as any);
      vi.mocked(db.donation.update).mockResolvedValue({} as any);
      const result = await cancelDonation("d1", "m1");
      expect(result).toBe(true);
    });

    it("rejects non-donor", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        donorId: "m2",
        status: "PENDING",
      } as any);
      await expect(cancelDonation("d1", "m1")).rejects.toThrow(/bukan donasi Anda/i);
    });

    it("rejects already-approved", async () => {
      vi.mocked(db.donation.findUnique).mockResolvedValue({
        donorId: "m1",
        status: "APPROVED",
      } as any);
      await expect(cancelDonation("d1", "m1")).rejects.toThrow("sudah diproses");
    });
  });
});

describe("donations: retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDonation returns null for missing", async () => {
    vi.mocked(db.donation.findUnique).mockResolvedValue(null);
    const result = await getDonation("d1");
    expect(result).toBeNull();
  });

  it("getDonation returns full data with parsed images", async () => {
    vi.mocked(db.donation.findUnique).mockResolvedValue({
      id: "d1",
      type: "DONATION",
      title: "Book A",
      author: "Author",
      isbn: "123",
      condition: "GOOD",
      description: "X",
      status: "APPROVED",
      categoryId: "c1",
      donorId: "m1",
      donor: { id: "m1", fullName: "Donor", memberNumber: "M001" },
      approvedById: "lib1",
      approvedBy: { id: "lib1", name: "Librarian" },
      rewardPoints: 50,
      receivedAt: null,
      rejectionReason: null,
      createdAt: new Date(),
      category: { id: "c1", name: "Fiksi" },
      images: '["a.jpg","b.jpg"]',
    } as any);

    const result = await getDonation("d1");
    expect(result).not.toBeNull();
    expect(result?.images).toEqual(["a.jpg", "b.jpg"]);
    expect(result?.categoryName).toBe("Fiksi");
    expect(result?.approvedByName).toBe("Librarian");
  });

  it("listDonations applies filters", async () => {
    vi.mocked(db.donation.findMany).mockResolvedValue([] as any);
    vi.mocked(db.donation.count).mockResolvedValue(0);

    await listDonations({ type: "EXCHANGE", status: "PENDING" });
    expect(db.donation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "EXCHANGE",
          status: "PENDING",
        }),
      })
    );
  });
});

describe("donations: stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getMemberDonationStats calculates correctly", async () => {
    vi.mocked(db.donation.findMany).mockResolvedValue([
      { status: "RECEIVED", condition: "NEW", type: "DONATION", rewardPoints: 100 } as any,
      { status: "APPROVED", condition: "GOOD", type: "EXCHANGE", rewardPoints: 50 } as any,
      { status: "PENDING", condition: "GOOD", type: "DONATION", rewardPoints: 0 } as any,
    ] as any);

    const stats = await getMemberDonationStats("m1");
    expect(stats.totalDonations).toBe(3);
    expect(stats.totalReceived).toBe(1);
    expect(stats.totalPoints).toBe(150);
    expect(stats.byCondition.NEW).toBe(1);
    expect(stats.byCondition.GOOD).toBe(2);
    expect(stats.byType.DONATION).toBe(2);
    expect(stats.byType.EXCHANGE).toBe(1);
  });

  it("getLibraryDonationStats finds top donors", async () => {
    vi.mocked(db.donation.findMany).mockResolvedValue([
      { status: "RECEIVED", rewardPoints: 100, donor: { id: "m1", fullName: "A" } } as any,
      { status: "RECEIVED", rewardPoints: 100, donor: { id: "m1", fullName: "A" } } as any,
      { status: "RECEIVED", rewardPoints: 50, donor: { id: "m2", fullName: "B" } } as any,
    ] as any);

    const stats = await getLibraryDonationStats();
    expect(stats.totalPointsAwarded).toBe(250);
    expect(stats.topDonors[0].memberId).toBe("m1");
    expect(stats.topDonors[0].count).toBe(2);
    expect(stats.topDonors[0].points).toBe(200);
  });
});

describe("donations: exchange offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createExchangeOffer creates pending offer", async () => {
    vi.mocked(db.exchangeOffer.create).mockResolvedValue({ id: "o1" } as any);
    const id = await createExchangeOffer("listing1", "m1", "My Book", "Tukar yuk");
    expect(id).toBe("o1");
  });

  it("acceptOffer requires owner", async () => {
    vi.mocked(db.exchangeOffer.findUnique).mockResolvedValue({
      listing: { donorId: "m2" },
      status: "PENDING",
    } as any);
    await expect(acceptOffer("o1", "m1")).rejects.toThrow(/bukan listing Anda/i);
  });

  it("acceptOffer succeeds for owner", async () => {
    vi.mocked(db.exchangeOffer.findUnique).mockResolvedValue({
      listing: { donorId: "m1" },
      status: "PENDING",
    } as any);
    vi.mocked(db.exchangeOffer.update).mockResolvedValue({} as any);
    vi.mocked(db.donation.update).mockResolvedValue({} as any);

    const result = await acceptOffer("o1", "m1");
    expect(result).toBe(true);
    // Listing marked as APPROVED
    expect(db.donation.update).toHaveBeenCalled();
  });

  it("rejectOffer succeeds for owner", async () => {
    vi.mocked(db.exchangeOffer.findUnique).mockResolvedValue({
      listing: { donorId: "m1" },
    } as any);
    vi.mocked(db.exchangeOffer.update).mockResolvedValue({} as any);
    const result = await rejectOffer("o1", "m1");
    expect(result).toBe(true);
  });
});

describe("donations: DEFAULT_REWARDS", () => {
  it("has rewards for all conditions", () => {
    const conditions: BookCondition[] = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"];
    conditions.forEach((c) => {
      expect(DEFAULT_REWARDS.points[c]).toBeGreaterThan(0);
    });
  });

  it("NEW gets highest reward", () => {
    expect(DEFAULT_REWARDS.points.NEW).toBeGreaterThan(DEFAULT_REWARDS.points.POOR);
  });
});
