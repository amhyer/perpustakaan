/**
 * Unit tests untuk src/lib/chat-assistant.ts
 *
 * Test intent detection, rate limiting, config, FAQ matching.
 * DB di-mock untuk test pure logic tanpa Prisma client.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db BEFORE importing chat-assistant
vi.mock("../db", () => ({
  db: {
    chatFAQ: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    chatConversation: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "conv-1", ...data })
      ),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    chatMessage: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: `msg-${Date.now()}`, ...data })
      ),
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    loan: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { fineAmount: 0, finePaid: 0 } }),
    },
    pointTransaction: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    rewardRedemption: {
      count: vi.fn().mockResolvedValue(0),
    },
    recommendation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock cache to be in-memory only
vi.mock("../cache", () => ({
  cache: {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  },
}));

import {
  detectIntent,
  checkRateLimit,
  getChatConfig,
  ChatError,
} from "../chat-assistant";

describe("chat-assistant: detectIntent", () => {
  it("detects greeting in Indonesian", () => {
    const result = detectIntent("Halo, apa kabar?");
    expect(result.intent).toBe("greeting");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects greeting in English", () => {
    const result = detectIntent("Hello there!");
    expect(result.intent).toBe("greeting");
  });

  it("detects greeting in Arabic", () => {
    const result = detectIntent("Assalamualaikum");
    expect(result.intent).toBe("greeting");
  });

  it("detects book_search intent", () => {
    const result = detectIntent("Carikan novel fiksi romantis");
    expect(result.intent).toBe("book_search");
  });

  it("detects loan_status from overdue question", () => {
    const result = detectIntent("Kapan saya harus kembalikan buku? Saya takut telat");
    expect(result.intent).toBe("loan_status");
  });

  it("detects points_info", () => {
    const result = detectIntent("Berapa saldo poin saya sekarang?");
    expect(result.intent).toBe("points_info");
  });

  it("detects redeem_help", () => {
    const result = detectIntent("Bagaimana cara klaim hadiah?");
    expect(result.intent).toBe("redeem_help");
  });

  it("detects hours", () => {
    const result = detectIntent("Jam buka perpustakaan sampai jam berapa?");
    expect(result.intent).toBe("hours");
  });

  it("detects membership", () => {
    const result = detectIntent("Bagaimana cara jadi anggota perpustakaan?");
    expect(result.intent).toBe("membership");
  });

  it("detects loan_rules", () => {
    const result = detectIntent("Berapa lama siswa boleh pinjam buku?");
    expect(result.intent).toBe("loan_rules");
  });

  it("detects recommendation", () => {
    const result = detectIntent("Buku apa yang bagus untuk dibaca? Beri rekomendasi");
    expect(result.intent).toBe("recommendation");
  });

  it("detects escalation request", () => {
    const result = detectIntent("Saya mau bicara dengan pustakawan");
    expect(result.intent).toBe("escalation");
  });

  it("detects thanks", () => {
    const result = detectIntent("Terima kasih banyak!");
    expect(result.intent).toBe("thanks");
  });

  it("falls back to general for unknown", () => {
    const result = detectIntent("asdfgh random text");
    expect(result.intent).toBe("general");
    expect(result.confidence).toBe(0);
  });

  it("returns confidence 0 for empty message", () => {
    const result = detectIntent("");
    expect(result.intent).toBe("general");
    expect(result.confidence).toBe(0);
  });

  it("is case-insensitive", () => {
    const r1 = detectIntent("HALO");
    const r2 = detectIntent("halo");
    expect(r1.intent).toBe(r2.intent);
  });

  it("trims whitespace", () => {
    const result = detectIntent("  halo   ");
    expect(result.intent).toBe("greeting");
  });

  it("confidence is bounded 0-1", () => {
    const result = detectIntent("halo halo halo halo halo");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("handles Indonesian loan questions", () => {
    const result = detectIntent("Saya ada pinjaman yang terlambat, dendanya berapa?");
    expect(["loan_status", "loan_rules"]).toContain(result.intent);
  });

  it("handles mixed Indonesian and English", () => {
    const result = detectIntent("Find book novel fiksi");
    expect(result.intent).toBe("book_search");
  });

  it("handles very long messages", () => {
    const longMsg = "halo ".repeat(200);
    const result = detectIntent(longMsg);
    expect(result.intent).toBe("greeting");
  });

  it("handles special characters", () => {
    const result = detectIntent("Halo! @#$%^&*()");
    expect(result.intent).toBe("greeting");
  });

  it("handles newlines in message", () => {
    const result = detectIntent("Halo,\napakah ini bekerja?");
    expect(result.intent).toBe("greeting");
  });
});

describe("chat-assistant: checkRateLimit", () => {
  beforeEach(() => {
    // Each test gets a unique userId, so no need to clear
  });

  it("allows first message from new user", async () => {
    const userId = `user-${Date.now()}-${Math.random()}`;
    const result = await checkRateLimit(userId, 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.resetIn).toBe(60);
  });

  it("tracks multiple messages", async () => {
    const userId = `user-${Date.now()}-${Math.random()}-2`;
    await checkRateLimit(userId, 10);
    await checkRateLimit(userId, 10);
    const result = await checkRateLimit(userId, 10);
    expect(result.remaining).toBe(7);
  });

  it("blocks when limit reached", async () => {
    const userId = `user-${Date.now()}-${Math.random()}-3`;
    // Fill up to limit
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(userId, 5);
    }
    const result = await checkRateLimit(userId, 5);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it("isolates rate limits per user", async () => {
    const userA = `user-A-${Date.now()}`;
    const userB = `user-B-${Date.now()}`;
    await checkRateLimit(userA, 2);
    await checkRateLimit(userA, 2);
    const resultA = await checkRateLimit(userA, 2);
    const resultB = await checkRateLimit(userB, 2);
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it("returns resetIn as positive minutes", async () => {
    const userId = `user-${Date.now()}-reset`;
    const result = await checkRateLimit(userId, 5);
    expect(result.resetIn).toBeGreaterThan(0);
    expect(result.resetIn).toBeLessThanOrEqual(60);
  });
});

describe("chat-assistant: getChatConfig", () => {
  it("returns config with defaults", () => {
    const config = getChatConfig();
    expect(config.provider).toBeDefined();
    expect(config.maxTokens).toBe(500);
    expect(config.temperature).toBeCloseTo(0.7);
    expect(config.rateLimitPerHour).toBe(20);
    expect(config.contextWindowMessages).toBe(10);
  });

  it("respects env provider", () => {
    const original = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "openai";
    const config = getChatConfig();
    expect(config.provider).toBe("openai");
    process.env.AI_PROVIDER = original;
  });

  it("respects env model", () => {
    const original = process.env.AI_MODEL;
    process.env.AI_MODEL = "gpt-4-turbo";
    const config = getChatConfig();
    expect(config.model).toBe("gpt-4-turbo");
    process.env.AI_MODEL = original;
  });
});

describe("chat-assistant: ChatError", () => {
  it("creates error with code and message", () => {
    const err = new ChatError("RATE_LIMIT", "Too many requests", 429);
    expect(err.code).toBe("RATE_LIMIT");
    expect(err.message).toBe("Too many requests");
    expect(err.statusCode).toBe(429);
    expect(err.name).toBe("ChatError");
  });

  it("default statusCode is 500", () => {
    const err = new ChatError("UNKNOWN", "Something failed");
    expect(err.statusCode).toBe(500);
  });

  it("is instanceof Error", () => {
    const err = new ChatError("X", "msg");
    expect(err).toBeInstanceOf(Error);
  });
});
