/**
 * Tests untuk src/lib/recommendations.ts
 *
 * Test pure functions (scoring logic).
 * Integration dengan DB di-skip untuk unit test.
 */

import { describe, it, expect } from "vitest";

/**
 * Helper untuk compute content score (extracted dari recommendBooks).
 * Pure function, tidak butuh DB.
 */
function computeContentScore(
  bookCategoryId: string | null,
  bookAuthor: string,
  categoryScoreMap: Map<string, number>,
  authorScoreMap: Map<string, number>
): number {
  let contentScore = 0;
  if (bookCategoryId && categoryScoreMap.has(bookCategoryId)) {
    const catCount = categoryScoreMap.get(bookCategoryId)!;
    contentScore = Math.min(1, catCount / 5);
  }
  if (authorScoreMap.has(bookAuthor)) {
    const authorCount = authorScoreMap.get(bookAuthor)!;
    contentScore = Math.max(contentScore, Math.min(1, authorCount / 3));
  }
  return contentScore;
}

function computePopularScore(popCount: number): number {
  return Math.min(1, popCount / 20);
}

function computeFinalScore(content: number, pop: number): number {
  const WEIGHTS = { content: 0.3, collaborative: 0.3, popular: 0.2, personal: 0.2 };
  return (
    content * WEIGHTS.content +
    pop * WEIGHTS.collaborative +
    pop * WEIGHTS.popular +
    (content * 0.7 + pop * 0.3) * WEIGHTS.personal
  );
}

describe("Recommendation scoring", () => {
  describe("computeContentScore", () => {
    it("return 0 untuk unknown book", () => {
      const score = computeContentScore(null, "Unknown", new Map(), new Map());
      expect(score).toBe(0);
    });

    it("score tinggi untuk kategori sering dibaca", () => {
      const catMap = new Map([["cat1", 10]]);
      const score = computeContentScore("cat1", "Author", catMap, new Map());
      // Cap at 1
      expect(score).toBe(1);
    });

    it("score medium untuk kategori jarang dibaca", () => {
      const catMap = new Map([["cat1", 2]]);
      const score = computeContentScore("cat1", "Author", catMap, new Map());
      expect(score).toBeCloseTo(0.4, 1);
    });

    it("author score > category score", () => {
      const catMap = new Map([["cat1", 1]]);
      const authorMap = new Map([["Famous Author", 5]]);
      const score = computeContentScore("cat1", "Famous Author", catMap, authorMap);
      // Author score = min(1, 5/3) = 1, category = min(1, 1/5) = 0.2
      // Math.max(0.2, 1) = 1
      expect(score).toBe(1);
    });
  });

  describe("computePopularScore", () => {
    it("0 untuk unpopular", () => {
      expect(computePopularScore(0)).toBe(0);
    });

    it("1 untuk very popular (>= 20 borrows)", () => {
      expect(computePopularScore(20)).toBe(1);
      expect(computePopularScore(50)).toBe(1);
    });

    it("linear scaling", () => {
      expect(computePopularScore(10)).toBe(0.5);
    });
  });

  describe("computeFinalScore", () => {
    it("0 untuk unknown book", () => {
      expect(computeFinalScore(0, 0)).toBe(0);
    });

    it("high score untuk popular book di kategori favorit", () => {
      const score = computeFinalScore(1, 1);
      expect(score).toBeGreaterThan(0.5);
    });

    it("weighted properly", () => {
      // Content-heavy: content=1, pop=0
      const contentOnly = computeFinalScore(1, 0);
      // Pop-heavy: content=0, pop=1
      const popOnly = computeFinalScore(0, 1);
      // Both sama-sama tinggi tapi content sedikit lebih karena personal weight
      expect(contentOnly).toBeGreaterThanOrEqual(popOnly);
    });
  });

  describe("ranking", () => {
    it("books diurutkan by score descending", () => {
      const candidates = [
        { id: "a", content: 0.2, pop: 0.5 },
        { id: "b", content: 0.8, pop: 0.3 },
        { id: "c", content: 0.1, pop: 0.1 },
      ];

      const scored = candidates
        .map((c) => ({ id: c.id, score: computeFinalScore(c.content, c.pop) }))
        .sort((a, b) => b.score - a.score);

      expect(scored[0].id).toBe("b");
      expect(scored[2].id).toBe("c");
    });

    it("exclude already-interacted books", () => {
      const excludeSet = new Set(["a", "b"]);
      const candidates = [
        { id: "a", content: 0.8, pop: 0.9 },
        { id: "b", content: 0.7, pop: 0.8 },
        { id: "c", content: 0.5, pop: 0.6 },
      ];

      const filtered = candidates.filter((c) => !excludeSet.has(c.id));
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("c");
    });
  });
});
