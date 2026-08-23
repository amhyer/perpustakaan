/**
 * Unit tests untuk Voice Assistant intent parsing.
 */

import { describe, it, expect } from "vitest";

// Mirror of parseIntent logic (no DB deps)
function parseIntent(text: string): { name: string; confidence: number; parameters: Record<string, string> } {
  const lower = text.toLowerCase().trim();

  if (lower.includes("cari") || lower.includes("search") || lower.includes("find") || lower.includes("ada buku") || lower.includes("where is")) {
    const match = lower.match(/(?:cari|search|find|ada buku) (.+?)(?:\?|$)/);
    return { name: "SearchBook", confidence: 0.8, parameters: { query: match?.[1] || lower } };
  }
  if (lower.includes("tersedia") || lower.includes("available") || lower.includes("bisa pinjam") || lower.includes("stock")) {
    return { name: "CheckAvailability", confidence: 0.75, parameters: { query: lower } };
  }
  if (lower.includes("pinjaman saya") || lower.includes("my loans") || lower.includes("apa yang saya pinjam") || lower.includes("bukuku")) {
    return { name: "MyLoans", confidence: 0.85, parameters: {} };
  }
  if (lower.includes("jatuh tempo") || lower.includes("due") || lower.includes("kapan harus dikembalikan") || lower.includes("besok")) {
    return { name: "DueSoon", confidence: 0.8, parameters: {} };
  }
  if (lower.includes("poin") || lower.includes("points") || lower.includes("berapa poin") || lower.includes("skor")) {
    return { name: "Points", confidence: 0.85, parameters: {} };
  }
  if (lower.includes("rekomendasi") || lower.includes("recommend") || lower.includes("buku bagus") || lower.includes("apa yang bagus")) {
    return { name: "Recommend", confidence: 0.8, parameters: {} };
  }
  if (lower.includes("halo") || lower.includes("hello") || lower.includes("hi") || lower.includes("مرحبا")) {
    return { name: "Greeting", confidence: 0.95, parameters: {} };
  }

  return { name: "Fallback", confidence: 0, parameters: { originalText: text } };
}

describe("parseIntent", () => {
  it("detects SearchBook intent", () => {
    const r = parseIntent("Cari Laskar Pelangi");
    expect(r.name).toBe("SearchBook");
    expect(r.parameters.query).toBe("laskar pelangi");
  });

  it("detects SearchBook with English", () => {
    const r = parseIntent("Find Atomic Habits");
    expect(r.name).toBe("SearchBook");
  });

  it("detects MyLoans intent", () => {
    const r = parseIntent("Apa pinjaman saya");
    expect(r.name).toBe("MyLoans");
  });

  it("detects DueSoon intent", () => {
    const r = parseIntent("Kapan buku saya jatuh tempo");
    expect(r.name).toBe("DueSoon");
  });

  it("detects Points intent", () => {
    const r = parseIntent("Berapa poin saya?");
    expect(r.name).toBe("Points");
  });

  it("detects Recommend intent", () => {
    const r = parseIntent("Buku apa yang bagus untuk dibaca?");
    expect(r.name).toBe("Recommend");
  });

  it("detects Greeting", () => {
    expect(parseIntent("Halo").name).toBe("Greeting");
    expect(parseIntent("Hi").name).toBe("Greeting");
    expect(parseIntent("مرحبا").name).toBe("Greeting");
  });

  it("falls back to Fallback for unknown", () => {
    const r = parseIntent("xyz random text 12345");
    expect(r.name).toBe("Fallback");
    expect(r.confidence).toBe(0);
  });
});
