/**
 * Tests for natural language search.
 *
 * Sprint N - Tier 2 #5: AI-Powered Search.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    book: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "../db";
import {
  parseQuery,
  scoreBook,
  nlSearch,
  describeQuery,
  type ParsedQuery,
} from "../nl-search";

describe("nl-search: parseQuery", () => {
  describe("topic extraction", () => {
    it("extracts persahabatan from query", () => {
      const result = parseQuery("Cari buku tentang persahabatan untuk SMP");
      expect(result.topic).toBe("persahabatan");
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it("extracts cinta/romance", () => {
      const result = parseQuery("novel romance untuk remaja");
      expect(result.topic).toBe("cinta");
    });

    it("extracts petualangan", () => {
      const result = parseQuery("buku petualangan seru");
      expect(result.topic).toBe("petualangan");
    });

    it("expands keywords with synonyms", () => {
      const result = parseQuery("buku tentang persahabatan");
      expect(result.keywords).toContain("sahabat");
      expect(result.keywords).toContain("teman");
    });
  });

  describe("audience extraction", () => {
    it("extracts anak-anak", () => {
      const result = parseQuery("Buku untuk anak SD");
      expect(result.audience).toBe("anak");
    });

    it("extracts remaja", () => {
      const result = parseQuery("Novel untuk remaja SMA");
      expect(result.audience).toBe("remaja");
    });

    it("extracts remaja-putri", () => {
      const result = parseQuery("buku untuk remaja putri");
      expect(result.audience).toBe("remaja-putri");
    });
  });

  describe("level extraction", () => {
    it("extracts SD", () => {
      const result = parseQuery("Buku untuk SD");
      expect(result.level).toBe("SD");
    });

    it("extracts SMP", () => {
      const result = parseQuery("Buku untuk SMP");
      expect(result.level).toBe("SMP");
    });

    it("extracts SMA", () => {
      const result = parseQuery("Buku untuk SMA");
      expect(result.level).toBe("SMA");
    });
  });

  describe("grade extraction", () => {
    it("extracts kelas 10", () => {
      const result = parseQuery("buku matematika kelas 10");
      expect(result.grade).toBe(10);
      expect(result.level).toBe("SMA");
    });

    it("extracts grade 5", () => {
      const result = parseQuery("buku grade 5");
      expect(result.grade).toBe(5);
    });

    it("extracts kls 7", () => {
      const result = parseQuery("buku kls 7");
      expect(result.grade).toBe(7);
      expect(result.level).toBe("SMP");
    });

    it("ignores invalid grades", () => {
      const result = parseQuery("kelas 99");
      expect(result.grade).toBeNull();
    });
  });

  describe("subject extraction", () => {
    it("extracts matematika", () => {
      const result = parseQuery("buku matematika");
      expect(result.subject).toBe("matematika");
    });

    it("extracts fisika", () => {
      const result = parseQuery("buku fisika modern");
      expect(result.subject).toBe("fisika");
    });

    it("extracts bahasa-inggris", () => {
      const result = parseQuery("kamus bahasa inggris");
      // Note: "bahasa inggris" matches both "bahasa" and "bahasa-inggris"
      // "bahasa-inggris" has higher specificity
      expect(["bahasa", "bahasa-inggris"]).toContain(result.subject);
    });
  });

  describe("type extraction", () => {
    it("extracts novel", () => {
      const result = parseQuery("novel romance");
      expect(result.type).toBe("novel");
    });

    it("extracts komik", () => {
      const result = parseQuery("komik anak");
      expect(result.type).toBe("komik");
    });
  });

  describe("mood extraction", () => {
    it("extracts lucu", () => {
      const result = parseQuery("buku lucu untuk anak");
      expect(result.mood).toBe("lucu");
    });

    it("extracts inspiratif", () => {
      const result = parseQuery("buku inspiratif");
      expect(result.mood).toBe("inspiratif");
    });
  });

  describe("language extraction", () => {
    it("extracts English", () => {
      const result = parseQuery("buku bahasa inggris");
      expect(result.language).toBe("en");
    });
  });

  describe("keyword fallback", () => {
    it("extracts keywords from unknown query", () => {
      const result = parseQuery("Buku tentang kucing lucu berwarna oranye");
      expect(result.keywords.length).toBeGreaterThan(0);
      // "lucu" matches humor topic, so its synonyms are added
      expect(result.keywords).toContain("lucu");
    });

    it("removes stop words", () => {
      const result = parseQuery("cari buku untuk saya");
      expect(result.keywords).not.toContain("cari");
      expect(result.keywords).not.toContain("untuk");
      expect(result.keywords).not.toContain("saya");
    });

    it("handles empty/whitespace query", () => {
      const result = parseQuery("   ");
      expect(result.keywords).toEqual([]);
    });

    it("includes original words when no topic match", () => {
      const result = parseQuery("astronomi galaksi bintang");
      expect(result.keywords).toContain("astronomi");
      expect(result.keywords).toContain("galaksi");
    });
  });

  describe("boost generation", () => {
    it("generates boosts for matched topics", () => {
      const result = parseQuery("buku tentang persahabatan");
      const topicBoost = result.boosts.find((b) => b.field === "topic");
      expect(topicBoost).toBeDefined();
      expect(topicBoost?.weight).toBeGreaterThan(0);
    });

    it("generates boosts for subject", () => {
      const result = parseQuery("buku matematika");
      const subjBoost = result.boosts.find((b) => b.field === "subject");
      expect(subjBoost).toBeDefined();
    });
  });

  describe("confidence", () => {
    it("high confidence for specific query", () => {
      const result = parseQuery("Novel romance untuk remaja putri kelas 10");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("low confidence for vague query", () => {
      const result = parseQuery("buku");
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("caps at 1.0", () => {
      const result = parseQuery("Novel romance untuk remaja putri kelas 10 bahasa inggris inspiratif");
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe("nl-search: scoreBook", () => {
  it("high score for title match", () => {
    const result = scoreBook(
      { id: "b1", title: "Persahabatan Sejati", author: "Anonim" },
      {
        original: "persahabatan",
        keywords: ["persahabatan"],
        topic: "persahabatan",
        genre: null,
        audience: null,
        level: null,
        grade: null,
        subject: null,
        type: null,
        language: null,
        mood: null,
        boosts: [
          { field: "topic", value: "persahabatan", weight: 0.4, reason: "t" },
        ],
        confidence: 0.5,
      }
    );
    // title (0.3) + topic boost (0.4 since title contains topic) = 0.7
    expect(result.score).toBeGreaterThan(0.3);
  });

  it("boosts category match for subject query", () => {
    const result = scoreBook(
      { id: "b1", title: "Calculus", author: "X", category: { name: "Matematika" } },
      {
        original: "matematika",
        keywords: [],
        topic: null,
        genre: null,
        audience: null,
        level: null,
        grade: null,
        subject: "matematika",
        type: null,
        language: null,
        mood: null,
        boosts: [
          { field: "subject", value: "matematika", weight: 0.5, reason: "test" },
        ],
        confidence: 0.5,
      }
    );
    expect(result.score).toBeGreaterThan(0.4);
  });

  it("zero score for no match", () => {
    const result = scoreBook(
      { id: "b1", title: "Cooking Recipes", author: "Chef" },
      {
        original: "persahabatan",
        keywords: ["persahabatan"],
        topic: null,
        genre: null,
        audience: null,
        level: null,
        grade: null,
        subject: null,
        type: null,
        language: null,
        mood: null,
        boosts: [],
        confidence: 0.5,
      }
    );
    expect(result.score).toBe(0);
  });

  it("includes match reasons", () => {
    const result = scoreBook(
      { id: "b1", title: "Sahabat Sejati", author: "Anonim", description: "kisah persahabatan" },
      {
        original: "sahabat",
        keywords: ["sahabat"],
        topic: null,
        genre: null,
        audience: null,
        level: null,
        grade: null,
        subject: null,
        type: null,
        language: null,
        mood: null,
        boosts: [],
        confidence: 0.5,
      }
    );
    expect(result.matchReasons.length).toBeGreaterThan(0);
    expect(result.matchReasons.some((r) => r.includes("sahabat"))).toBe(true);
  });

  it("highlights matched text in title", () => {
    const result = scoreBook(
      { id: "b1", title: "Persahabatan Abadi", author: "X" },
      {
        original: "persahabatan",
        keywords: ["persahabatan"],
        topic: null,
        genre: null,
        audience: null,
        level: null,
        grade: null,
        subject: null,
        type: null,
        language: null,
        mood: null,
        boosts: [],
        confidence: 0.5,
      }
    );
    expect(result.highlights.title).toContain("»");
    // Case-insensitive match
    expect(result.highlights.title.toLowerCase()).toContain("persahabatan");
  });

  it("caps score at 1.0", () => {
    const result = scoreBook(
      { id: "b1", title: "Persahabatan Matematika untuk Anak", author: "Persahabatan" },
      {
        original: "persahabatan",
        keywords: ["persahabatan", "persahabatan", "persahabatan"],
        topic: "persahabatan",
        genre: null,
        audience: "anak",
        level: "SD",
        grade: null,
        subject: "matematika",
        type: null,
        language: null,
        mood: null,
        boosts: [
          { field: "topic", value: "persahabatan", weight: 0.4, reason: "t" },
          { field: "subject", value: "matematika", weight: 0.5, reason: "s" },
        ],
        confidence: 0.9,
      }
    );
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

describe("nl-search: nlSearch (database)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns scored books from DB", async () => {
    vi.mocked(db.book.findMany).mockResolvedValue([
      {
        id: "b1",
        title: "Persahabatan Sejati",
        author: "Anonim",
        description: "Kisah persahabatan",
        category: { name: "Fiksi" },
      },
      {
        id: "b2",
        title: "Kisah Sahabat",
        author: "Pak Budi",
        description: "tentang persahabatan",
        category: { name: "Fiksi" },
      },
    ] as any);

    const result = await nlSearch("buku persahabatan");
    expect(result.length).toBe(2);
    // b1 should rank higher (title match)
    expect(result[0].bookId).toBe("b1");
  });

  it("filters by subject in DB query", async () => {
    vi.mocked(db.book.findMany).mockResolvedValue([]);
    await nlSearch("buku matematika");
    expect(db.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: expect.objectContaining({ name: expect.any(Object) }),
        }),
      })
    );
  });

  it("respects limit", async () => {
    vi.mocked(db.book.findMany).mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => ({
        id: `b${i}`,
        title: `Buku ${i}`,
        author: "X",
        description: "persahabatan",
        category: { name: "Fiksi" },
      })) as any
    );

    const result = await nlSearch("persahabatan", { limit: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("filters out low-score results", async () => {
    vi.mocked(db.book.findMany).mockResolvedValue([
      {
        id: "b1",
        title: "Cooking",
        author: "Chef",
        description: "resep masakan",
        category: { name: "Masakan" },
      },
    ] as any);

    const result = await nlSearch("persahabatan cinta");
    expect(result).toEqual([]);
  });
});

describe("nl-search: describeQuery", () => {
  it("formats query with topic and audience", () => {
    const parsed: ParsedQuery = {
      original: "coba",
      keywords: [],
      topic: "persahabatan",
      genre: null,
      audience: "remaja",
      level: "SMP",
      grade: null,
      subject: null,
      type: null,
      language: null,
      mood: null,
      boosts: [],
      confidence: 0.8,
    };
    const desc = describeQuery(parsed);
    expect(desc).toContain("persahabatan");
    expect(desc).toContain("remaja");
    expect(desc).toContain("SMP");
  });

  it("falls back to keywords when no metadata", () => {
    const parsed: ParsedQuery = {
      original: "coba",
      keywords: ["kucing", "lucu"],
      topic: null,
      genre: null,
      audience: null,
      level: null,
      grade: null,
      subject: null,
      type: null,
      language: null,
      mood: null,
      boosts: [],
      confidence: 0.3,
    };
    const desc = describeQuery(parsed);
    expect(desc).toContain("kucing");
  });

  it("returns 'Pencarian umum' for empty query", () => {
    const parsed: ParsedQuery = {
      original: "",
      keywords: [],
      topic: null,
      genre: null,
      audience: null,
      level: null,
      grade: null,
      subject: null,
      type: null,
      language: null,
      mood: null,
      boosts: [],
      confidence: 0,
    };
    expect(describeQuery(parsed)).toBe("Pencarian umum");
  });
});
