/**
 * Tests for book recognition library.
 *
 * Sprint T - Tier 4 #13: AR Book Discovery.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    book: { findFirst: vi.fn() },
    coverSignature: { findMany: vi.fn(), upsert: vi.fn() },
    aRTreasureHunt: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  lookupByISBN,
  lookupByTitle,
  lookupByVisualHash,
  lookupByColors,
  saveCoverSignature,
  scanBook,
  generateBookshelf,
  createARTreasureHunt,
  markTreasureFound,
  getActiveTreasureHunts,
  hammingDistance,
  colorDistance,
  colorSimilarity,
  hexToRgb,
} from "../book-recognition";

describe("book-recognition: pure helpers", () => {
  describe("hammingDistance", () => {
    it("returns 0 for identical hashes", () => {
      expect(hammingDistance("abcdef", "abcdef")).toBe(0);
    });

    it("counts differing bits", () => {
      // 0xF vs 0x1: 1111 XOR 0001 = 1110, 3 bits set
      expect(hammingDistance("f", "1")).toBe(3);
    });

    it("returns Infinity for different lengths", () => {
      expect(hammingDistance("abc", "abcd")).toBe(Infinity);
    });
  });

  describe("hexToRgb", () => {
    it("parses hex color", () => {
      expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    });

    it("handles without #", () => {
      expect(hexToRgb("ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("returns null for invalid hex", () => {
      expect(hexToRgb("invalid")).toBeNull();
      expect(hexToRgb("#fff")).toBeNull();
    });
  });

  describe("colorDistance", () => {
    it("returns 0 for same color", () => {
      expect(colorDistance("#ff0000", "#ff0000")).toBe(0);
    });

    it("returns 1 for opposite (black vs white)", () => {
      expect(colorDistance("#000000", "#ffffff")).toBeCloseTo(1, 1);
    });

    it("returns small value for similar colors", () => {
      const d = colorDistance("#ff0000", "#fe0000");
      expect(d).toBeLessThan(0.1);
    });
  });

  describe("colorSimilarity", () => {
    it("returns 1 for identical palettes", () => {
      expect(colorSimilarity(["#ff0000"], ["#ff0000"])).toBe(1);
    });

    it("returns 0 for empty arrays", () => {
      expect(colorSimilarity([], ["#ff0000"])).toBe(0);
      expect(colorSimilarity(["#ff0000"], [])).toBe(0);
    });

    it("returns moderate value for similar palettes", () => {
      const sim = colorSimilarity(
        ["#ff0000", "#00ff00"],
        ["#fe0000", "#01ff00"]
      );
      expect(sim).toBeGreaterThan(0.9);
    });
  });
});

describe("book-recognition: ISBN lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for empty ISBN", async () => {
    expect(await lookupByISBN("")).toBeNull();
  });

  it("returns null for short ISBN", async () => {
    expect(await lookupByISBN("123")).toBeNull();
  });

  it("strips dashes and spaces", async () => {
    vi.mocked(db.book.findFirst).mockResolvedValue({
      id: "b1",
      title: "Test Book",
      authors: [{ author: { name: "Author" } }],
    } as any);

    await lookupByISBN("978-1-234-56789-0");
    expect(db.book.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ isbn: "9781234567890" }),
          ]),
        }),
      })
    );
  });

  it("returns match when ISBN found", async () => {
    vi.mocked(db.book.findFirst).mockResolvedValue({
      id: "b1",
      title: "Laskar Pelangi",
      authors: [{ author: { name: "Andrea Hirata" } }],
    } as any);

    const result = await lookupByISBN("9781234567890");
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe(0.95);
    expect(result?.matchType).toBe("ISBN");
    expect(result?.title).toBe("Laskar Pelangi");
  });

  it("returns null when not found", async () => {
    vi.mocked(db.book.findFirst).mockResolvedValue(null);
    const result = await lookupByISBN("0000000000");
    expect(result).toBeNull();
  });
});

describe("book-recognition: title lookup (OCR)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for short title", async () => {
    expect(await lookupByTitle("ab")).toBeNull();
  });

  it("finds exact match", async () => {
    vi.mocked(db.book.findFirst).mockResolvedValue({
      id: "b1",
      title: "Laskar Pelangi",
      authors: [{ author: { name: "Andrea Hirata" } }],
    } as any);

    const result = await lookupByTitle("laskar pelangi");
    expect(result).not.toBeNull();
    expect(result?.matchType).toBe("TITLE_OCR");
  });

  it("falls back to prefix search for OCR errors", async () => {
    vi.mocked(db.book.findFirst)
      .mockResolvedValueOnce(null) // exact match fails
      .mockResolvedValueOnce({
        id: "b1",
        title: "Laskar Pelangi",
        authors: [{ author: { name: "Andrea Hirata" } }],
      } as any);

    const result = await lookupByTitle("laskar pe1angi");
    expect(result).not.toBeNull();
  });
});

describe("book-recognition: visual hash matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid hash length", async () => {
    expect(await lookupByVisualHash("abc")).toBeNull();
  });

  it("finds exact match (distance 0)", async () => {
    vi.mocked(db.coverSignature.findMany).mockResolvedValue([
      {
        perceptualHash: "0000000000000000",
        book: {
          id: "b1",
          title: "Test",
          authors: [{ author: { name: "A" } }],
        },
      },
    ] as any);

    const result = await lookupByVisualHash("0000000000000000");
    expect(result?.confidence).toBe(1);
  });

  it("returns lower confidence for distance", async () => {
    vi.mocked(db.coverSignature.findMany).mockResolvedValue([
      {
        perceptualHash: "0000000000000000",
        book: {
          id: "b1",
          title: "Test",
          authors: [{ author: { name: "A" } }],
        },
      },
    ] as any);

    // 0xF000 = 4 bits diff from 0x0000
    const result = await lookupByVisualHash("f000000000000000");
    expect(result?.confidence).toBeLessThan(1);
  });

  it("returns null when no signatures exist", async () => {
    vi.mocked(db.coverSignature.findMany).mockResolvedValue([]);
    const result = await lookupByVisualHash("0000000000000000");
    expect(result).toBeNull();
  });
});

describe("book-recognition: color matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects empty colors", async () => {
    expect(await lookupByColors([])).toBeNull();
  });

  it("returns null for low similarity", async () => {
    vi.mocked(db.coverSignature.findMany).mockResolvedValue([
      {
        perceptualHash: "x",
        dominantColors: JSON.stringify(["#ffffff", "#cccccc"]),
        book: { id: "b1", title: "T", authors: [{ author: { name: "A" } }] },
      },
    ] as any);

    const result = await lookupByColors(["#000000", "#111111"]);
    expect(result).toBeNull();
  });

  it("matches similar colors", async () => {
    vi.mocked(db.coverSignature.findMany).mockResolvedValue([
      {
        perceptualHash: "x",
        dominantColors: JSON.stringify(["#ff0000", "#00ff00"]),
        book: { id: "b1", title: "T", authors: [{ author: { name: "A" } }] },
      },
    ] as any);

    const result = await lookupByColors(["#fe0000", "#00ff01"]);
    expect(result).not.toBeNull();
    expect(result?.matchType).toBe("COLOR_SIMILARITY");
  });
});

describe("book-recognition: saveCoverSignature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves signature for book", async () => {
    vi.mocked(db.coverSignature.upsert).mockResolvedValue({} as any);
    await saveCoverSignature("b1", {
      perceptualHash: "0123456789abcdef",
      dominantColors: ["#ff0000", "#00ff00"],
      aspectRatio: 0.66,
    });
    expect(db.coverSignature.upsert).toHaveBeenCalled();
  });
});

describe("book-recognition: scanBook (combined)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("combines multiple signals", async () => {
    vi.mocked(db.book.findFirst).mockResolvedValue({
      id: "b1",
      title: "Book",
      authors: [{ author: { name: "A" } }],
    } as any);
    vi.mocked(db.coverSignature.findMany).mockResolvedValue([] as any);

    const result = await scanBook({
      isbn: "9781234567890",
      ocrText: "Book",
      perceptualHash: "0000000000000000",
    });
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("returns suggestions when no match", async () => {
    vi.mocked(db.book.findFirst).mockResolvedValue(null);
    vi.mocked(db.coverSignature.findMany).mockResolvedValue([] as any);

    const result = await scanBook({ isbn: "0000000000" });
    expect(result.matches).toEqual([]);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("bestMatch is null if confidence < 0.6", async () => {
    vi.mocked(db.book.findFirst).mockResolvedValue(null);
    vi.mocked(db.coverSignature.findMany).mockResolvedValue([] as any);

    const result = await scanBook({ ocrText: "X" });
    expect(result.bestMatch).toBeNull();
  });

  it("tracks duration", async () => {
    const result = await scanBook({});
    expect(result.scanDurationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("book-recognition: generateBookshelf", () => {
  it("generates 3D-ready positions", () => {
    const books = [
      { id: "b1", title: "A", author: "X", coverColor: "#fff", coverImage: null },
      { id: "b2", title: "B", author: "Y", coverColor: "#000", coverImage: null },
      { id: "b3", title: "C", author: "Z", coverColor: "#f00", coverImage: null },
    ];
    const items = generateBookshelf(books, { shelfWidth: 2 });
    expect(items).toHaveLength(3);
    expect(items[0].position).toEqual({ row: 0, col: 0 });
    expect(items[2].position).toEqual({ row: 1, col: 0 });
  });

  it("respects shelfWidth", () => {
    const books = Array.from({ length: 10 }, (_, i) => ({
      id: `b${i}`,
      title: `B${i}`,
      author: "X",
      coverColor: "#fff",
      coverImage: null,
    }));
    const items = generateBookshelf(books, { shelfWidth: 3 });
    expect(items[0].position.col).toBe(0);
    expect(items[3].position.col).toBe(0);
    expect(items[3].position.row).toBe(1);
  });

  it("rotation is between -5 and 5", () => {
    const books = Array.from({ length: 20 }, (_, i) => ({
      id: `b${i}`, title: "T", author: "X", coverColor: "#fff", coverImage: null,
    }));
    const items = generateBookshelf(books);
    items.forEach((item) => {
      expect(item.rotation).toBeGreaterThanOrEqual(-5);
      expect(item.rotation).toBeLessThanOrEqual(5);
    });
  });
});

describe("book-recognition: AR Treasure Hunt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates treasure hunt", async () => {
    vi.mocked(db.aRTreasureHunt.create).mockResolvedValue({ id: "h1" } as any);
    const id = await createARTreasureHunt("b1", "Hunt A", "Find the blue book", 100, new Date());
    expect(id).toBe("h1");
  });

  it("markTreasureFound for new finder", async () => {
    vi.mocked(db.aRTreasureHunt.findUnique).mockResolvedValue({
      foundBy: "[]",
      rewardPoints: 100,
    } as any);
    vi.mocked(db.aRTreasureHunt.update).mockResolvedValue({} as any);

    const result = await markTreasureFound("h1", "m1");
    expect(result.success).toBe(true);
    expect(result.alreadyFound).toBe(false);
    expect(result.rewardPoints).toBe(100);
  });

  it("markTreasureFound for already-finder", async () => {
    vi.mocked(db.aRTreasureHunt.findUnique).mockResolvedValue({
      foundBy: '["m1"]',
      rewardPoints: 100,
    } as any);

    const result = await markTreasureFound("h1", "m1");
    expect(result.alreadyFound).toBe(true);
    expect(result.rewardPoints).toBe(0);
  });

  it("markTreasureFound for missing hunt", async () => {
    vi.mocked(db.aRTreasureHunt.findUnique).mockResolvedValue(null);
    const result = await markTreasureFound("nonexistent", "m1");
    expect(result.success).toBe(false);
  });

  it("getActiveTreasureHunts returns non-expired", async () => {
    vi.mocked(db.aRTreasureHunt.findMany).mockResolvedValue([
      {
        id: "h1", bookId: "b1", name: "Hunt", description: "D", hint: "H",
        rewardPoints: 50, expiresAt: new Date(Date.now() + 86400000),
        foundBy: "[]",
        book: { id: "b1", title: "Book" },
      },
    ] as any);
    const hunts = await getActiveTreasureHunts();
    expect(hunts).toHaveLength(1);
  });
});
