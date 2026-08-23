/**
 * AI Book Summary Service
 *
 * Generate short summaries (1-2 paragraf) untuk buku, untuk enhance
 * recommendation & catalog UX. Bisa pakai:
 * - OpenAI (GPT-4o-mini, GPT-3.5-turbo)
 * - Anthropic (Claude Haiku, Sonnet)
 * - Google AI (Gemini Flash)
 * - Atau self-hosted model
 *
 * Strategi: cache hasil per buku (1x generate, reuse selamanya).
 * Kalau synopsis sudah ada, skip generate. Kalau tidak ada, panggil AI.
 *
 * Untuk privasi & cost:
 * - Pakai model murah (Haiku, Mini, Flash)
 * - Rate limit per buku
 * - Fallback ke generic description kalau AI gagal
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cache } from "@/lib/cache";

const CACHE_KEY = "ai-summary:book";
const CACHE_TTL_DAYS = 30;

// ===== Provider Interface =====

export type AIProvider = "openai" | "anthropic" | "google" | "mock";

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export function getAIConfig(): AIConfig {
  return {
    provider: (process.env.AI_PROVIDER as AIProvider) || "mock",
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL,
    maxTokens: 300,
  };
}

// ===== Summary Generator =====

export interface BookSummary {
  bookId: string;
  bookTitle: string;
  shortSummary: string; // 1-2 kalimat
  keyPoints: string[]; // 3-5 poin menarik
  targetAudience: string; // "Remaja 15-18 tahun, pencinta fiksi"
  generatedBy: AIProvider;
  generatedAt: string;
}

/**
 * Get AI summary for a book. Cached for 30 days.
 */
export async function getBookSummary(bookId: string): Promise<BookSummary | null> {
  // Check cache first
  const cacheKey = `${CACHE_KEY}:${bookId}`;
  const cached = cache.get<BookSummary>(cacheKey);
  if (cached) return cached;

  // Get book data
  const book = await db.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      author: true,
      synopsis: true,
      pages: true,
      year: true,
      language: true,
      category: { select: { name: true } },
    },
  });

  if (!book) return null;

  // Generate summary via AI (or mock)
  const config = getAIConfig();
  let summary: Omit<BookSummary, "bookId" | "bookTitle" | "generatedBy" | "generatedAt">;

  try {
    if (book.synopsis && book.synopsis.length > 100) {
      // Sudah ada synopsis → extract key points tanpa call AI
      summary = await extractFromSynopsis(book);
    } else {
      // Generate fresh
      switch (config.provider) {
        case "openai":
          summary = await generateOpenAI(book, config);
          break;
        case "anthropic":
          summary = await generateAnthropic(book, config);
          break;
        case "google":
          summary = await generateGoogle(book, config);
          break;
        case "mock":
        default:
          summary = await generateMock(book);
          break;
      }
    }
  } catch (err) {
    logger.error("AI summary generation failed, falling back to mock", {
      bookId,
      provider: config.provider,
      error: String(err),
    });
    summary = await generateMock(book);
  }

  const result: BookSummary = {
    bookId: book.id,
    bookTitle: book.title,
    shortSummary: summary.shortSummary,
    keyPoints: summary.keyPoints,
    targetAudience: summary.targetAudience,
    generatedBy: config.provider,
    generatedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  return result;
}

/**
 * Extract key points dari existing synopsis (no AI call).
 */
async function extractFromSynopsis(
  book: any
): Promise<{ shortSummary: string; keyPoints: string[]; targetAudience: string }> {
  const synopsis = book.synopsis || "";
  // First 1-2 sentences as short summary
  const sentences = synopsis.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const shortSummary = sentences.slice(0, 2).join(". ").trim() + ".";

  // Extract key points (sentences that look like statements)
  const keyPoints = sentences
    .slice(2, 5)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const targetAudience = inferTargetAudience(book);

  return { shortSummary, keyPoints, targetAudience };
}

/**
 * Infer target audience dari metadata buku.
 */
function inferTargetAudience(book: any): string {
  const cat = book.category?.name?.toLowerCase() || "";
  const lang = book.language || "Indonesia";
  const pages = book.pages || 0;

  if (cat.includes("anak")) return `Anak 7-12 tahun (${lang})`;
  if (cat.includes("remaja")) return `Remaja 13-18 tahun (${lang})`;
  if (cat.includes("sains") || cat.includes("teknologi")) return `Pelajar & mahasiswa (${lang})`;
  if (cat.includes("sejarah") || cat.includes("agama")) return `Dewasa (${lang})`;
  if (cat.includes("fiksi")) return pages > 300 ? `Dewasa pencinta fiksi` : `Remaja & dewasa`;
  return `Umum (${lang})`;
}

// ===== Provider Implementations =====

async function generateOpenAI(
  book: any,
  config: AIConfig
): Promise<{ shortSummary: string; keyPoints: string[]; targetAudience: string }> {
  if (!config.apiKey) throw new Error("OPENAI_API_KEY not set");

  const prompt = `Buat ringkasan pendek (1-2 kalimat) untuk buku berikut dalam Bahasa Indonesia. Kemudian list 3-5 poin menarik tentang buku ini dalam format bullet.

Judul: ${book.title}
Pengarang: ${book.author}
${book.synopsis ? `Synopsis: ${book.synopsis}` : ""}
${book.pages ? `Halaman: ${book.pages}` : ""}
${book.category ? `Kategori: ${book.category.name}` : ""}

Format JSON:
{
  "shortSummary": "...",
  "keyPoints": ["...", "...", "..."],
  "targetAudience": "..."
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Kamu adalah librarian AI yang membantu membuat ringkasan buku untuk siswa sekolah Indonesia.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: config.maxTokens || 300,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

async function generateAnthropic(
  book: any,
  config: AIConfig
): Promise<{ shortSummary: string; keyPoints: string[]; targetAudience: string }> {
  if (!config.apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const prompt = `Buat ringkasan pendek (1-2 kalimat) untuk buku berikut dalam Bahasa Indonesia. List 3-5 poin menarik. Format JSON dengan field: shortSummary, keyPoints (array), targetAudience.

Judul: ${book.title}
Pengarang: ${book.author}
${book.synopsis ? `Synopsis: ${book.synopsis}` : ""}
${book.category ? `Kategori: ${book.category.name}` : ""}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-3-5-haiku-20241022",
      max_tokens: config.maxTokens || 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
  const data = await response.json();
  const text = data.content[0].text;

  // Extract JSON dari response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");
  return JSON.parse(jsonMatch[0]);
}

async function generateGoogle(
  book: any,
  config: AIConfig
): Promise<{ shortSummary: string; keyPoints: string[]; targetAudience: string }> {
  if (!config.apiKey) throw new Error("GOOGLE_API_KEY not set");

  const prompt = `Generate a book summary in Indonesian. Book: ${book.title} by ${book.author}. ${book.synopsis || ""} Return JSON: {shortSummary, keyPoints: [], targetAudience}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model || "gemini-1.5-flash"}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) throw new Error(`Google AI error: ${response.status}`);
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");
  return JSON.parse(jsonMatch[0]);
}

/**
 * Mock generator untuk development (no AI call).
 * Extract from existing data atau generate generic summary.
 */
async function generateMock(
  book: any
): Promise<{ shortSummary: string; keyPoints: string[]; targetAudience: string }> {
  // Use existing synopsis if available
  if (book.synopsis && book.synopsis.length > 50) {
    return extractFromSynopsis(book);
  }

  // Generate generic from metadata
  const cat = book.category?.name || "umum";
  const shortSummary = `Buku ${cat.toLowerCase()} karya ${book.author} yang cocok untuk dibaca sebagai referensi atau hiburan.`;

  return {
    shortSummary,
    keyPoints: [
      `Karya ${book.author}`,
      book.pages ? `${book.pages} halaman` : "Panjang bacaan standar",
      `Kategori: ${cat}`,
    ],
    targetAudience: inferTargetAudience(book),
  };
}

// ===== Batch Generation =====

/**
 * Generate summaries untuk multiple books (background job).
 */
export async function batchGenerateSummaries(
  bookIds: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const bookId of bookIds) {
    try {
      const summary = await getBookSummary(bookId);
      if (summary) success++;
      else failed++;
    } catch (err) {
      failed++;
    }
  }

  logger.info("Batch AI summary generation", { bookIds: bookIds.length, success, failed });
  return { success, failed };
}
