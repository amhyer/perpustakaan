/**
 * Natural Language Search — Query parser & semantic search enhancer.
 *
 * Sprint N - Tier 2 #5: AI-Powered Search.
 *
 * Features:
 * - Parse natural language queries (Indonesian)
 * - Extract: topic, age group, genre, level, mood
 * - Smart query expansion with synonyms
 * - Boost matching books by relevance score
 * - Pure logic, no external AI needed (regex + dictionary)
 * - Optional AI enhancement for ambiguous queries
 *
 * Examples:
 *   "Cari buku tentang persahabatan untuk anak SMP"
 *     → { topic: "persahabatan", level: "SMP", keywords: ["sahabat", "teman"] }
 *   "novel romance untuk remaja putri"
 *     → { genre: "romance", audience: "remaja-putri", type: "novel" }
 *   "buku matematika kelas 10"
 *     → { subject: "matematika", grade: 10 }
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ===== Types =====

export interface ParsedQuery {
  /** Original query */
  original: string;
  /** Cleaned search terms */
  keywords: string[];
  /** Extracted metadata */
  topic: string | null;
  genre: string | null;
  audience: string | null; // "anak", "remaja", "dewasa"
  level: string | null; // "SD", "SMP", "SMA", "PT"
  grade: number | null; // 1-12
  subject: string | null; // "matematika", "fisika"
  type: string | null; // "novel", "komik", "ensiklopedia"
  language: string | null;
  mood: string | null; // "seru", "mengharukan"
  /** Boost hints for matching */
  boosts: QueryBoost[];
  /** Confidence 0-1 */
  confidence: number;
}

export interface QueryBoost {
  field: string;
  value: string;
  weight: number; // 0-1
  reason: string;
}

export interface ScoredBook {
  bookId: string;
  title: string;
  author: string;
  score: number; // 0-1
  matchReasons: string[];
  highlights: Record<string, string>; // field → highlighted text
}

// ===== Dictionaries =====

const TOPIC_SYNONYMS: Record<string, string[]> = {
  persahabatan: ["sahabat", "teman", "pertemanan", "friendship", "kawan", "sobat"],
  cinta: ["romantis", "romance", "kasmaran", "sayang", "cinta", "love"],
  petualangan: ["petualangan", "adventure", "perjalanan", "ekspedisi", "jelajah"],
  misteri: ["mystery", "teka-teki", "rahasia", "detektif", "investigasi"],
  keluarga: ["family", "orangtua", "ayah", "ibu", "saudara", "kakak", "adik"],
  sekolah: ["sekolah", "kampus", "pelajaran", "pendidikan", "belajar"],
  sejarah: ["history", "sejarah", "historical", "masa lalu"],
  sains: ["science", "ilmu pengetahuan", "pengetahuan"],
  teknologi: ["technology", "komputer", "digital", "coding", "programming"],
  agama: ["islam", "kristen", "hindu", "budha", "religi", "spiritual"],
  motivasi: ["motivational", "inspirasi", "semangat", "sukses", "berhasil"],
  humor: ["lucu", "komedi", "comedy", "tertawa"],
};

const GENRE_SYNONYMS: Record<string, string[]> = {
  fiksi: ["fiksi", "fiction", "novel", "cerita"],
  nonfiksi: ["non-fiksi", "nonfiksi", "nonfiction", "faktual", "biografi"],
  fantasi: ["fantasi", "fantasy", "magic", "sihir", "peri"],
  romance: ["romance", "romantis", "cinta", "cinta"],
  thriller: ["thriller", "suspense", "action"],
  "fiksi-ilmiah": ["sci-fi", "science fiction", "fiksi ilmiah", "futuristik"],
  misteri: ["mystery", "misteri", "detektif"],
  horor: ["horor", "horror", "seram", "menakutkan"],
  komik: ["komik", "comic", "manga", "graphic novel"],
  puisi: ["puisi", "poetry", "syair"],
};

const AUDIENCE_KEYWORDS: Record<string, string[]> = {
  anak: ["anak", "anak-anak", "kids", "child", "balita", "tk", "paud"],
  "remaja-putri": ["putri", "cewek", "gadis", "wanita"],
  "remaja-putra": ["putra", "cowok", "pria", "laki-laki"],
  remaja: ["remaja", "teen", "teenager", "abg"],
  dewasa: ["dewasa", "adult", "mature"],
};

const LEVEL_KEYWORDS: Record<string, string[]> = {
  TK: ["tk", "taman kanak-kanak", "paud"],
  SD: ["sd", "sekolah dasar", "elementary"],
  SMP: ["smp", "sekolah menengah pertama", "middle school"],
  SMA: ["sma", "sekolah menengah atas", "high school"],
  UMUM: ["umum", "semua umur", "all ages"],
};

const GRADE_REGEX = /\bkelas\s*(\d+)\b|\bgrade\s*(\d+)\b|\bkls\s*(\d+)\b/i;

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  matematika: ["matematika", "math", "aljabar", "geometri", "kalkulus"],
  fisika: ["fisika", "physics"],
  kimia: ["kimia", "chemistry"],
  biologi: ["biologi", "biology", "sains"],
  bahasa: ["bahasa", "language", "indonesia", "inggris"],
  sejarah: ["sejarah", "history", "historical"],
  geografi: ["geografi", "geography"],
  ekonomi: ["ekonomi", "economics", "akuntansi"],
  "bahasa-inggris": ["inggris", "english", "toefl", "ielts"],
};

const TYPE_KEYWORDS: Record<string, string[]> = {
  novel: ["novel", "fiksi"],
  komik: ["komik", "manga", "comic"],
  ensiklopedia: ["ensiklopedia", "encyclopedia"],
  kamus: ["kamus", "dictionary"],
  atlas: ["atlas", "peta"],
  modul: ["modul", "bahan ajar"],
  "buku-pelajaran": ["buku pelajaran", "textbook", "pelajaran"],
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  seru: ["seru", "menegangkan", "action-packed"],
  mengharukan: ["mengharukan", "sedih", "emotional", "touching"],
  lucu: ["lucu", "humor", "comedy", "tertawa"],
  inspiratif: ["inspiratif", "motivasi", "menginspirasi"],
};

// ===== Parser =====

/**
 * Parse a natural language query into structured form.
 */
export function parseQuery(query: string): ParsedQuery {
  const original = query;
  const lower = query.toLowerCase().trim();

  const result: ParsedQuery = {
    original,
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

  // Extract grade (kelas 10, grade 5, etc.)
  const gradeMatch = lower.match(GRADE_REGEX);
  if (gradeMatch) {
    const grade = parseInt(gradeMatch[1] || gradeMatch[2] || gradeMatch[3], 10);
    if (grade >= 1 && grade <= 12) {
      result.grade = grade;
      result.level = gradeToLevel(grade);
      result.confidence += 0.2;
    }
  }

  // Extract audience
  for (const [audience, kws] of Object.entries(AUDIENCE_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) {
      result.audience = audience;
      result.confidence += 0.15;
      break;
    }
  }

  // Extract level
  if (!result.level) {
    for (const [level, kws] of Object.entries(LEVEL_KEYWORDS)) {
      if (kws.some((k) => lower.includes(k))) {
        result.level = level;
        result.confidence += 0.15;
        break;
      }
    }
  }

  // Extract topic (from synonyms)
  for (const [topic, kws] of Object.entries(TOPIC_SYNONYMS)) {
    const matched = kws.find((k) => lower.includes(k));
    if (matched) {
      result.topic = topic;
      result.boosts.push({
        field: "topic",
        value: topic,
        weight: 0.4,
        reason: `Topik "${matched}"`,
      });
      result.keywords.push(...kws.slice(0, 3));
      result.confidence += 0.25;
      break;
    }
  }

  // Extract genre
  for (const [genre, kws] of Object.entries(GENRE_SYNONYMS)) {
    if (kws.some((k) => lower.includes(k))) {
      result.genre = genre;
      result.boosts.push({
        field: "genre",
        value: genre,
        weight: 0.3,
        reason: `Genre ${genre}`,
      });
      result.keywords.push(...kws.slice(0, 2));
      result.confidence += 0.2;
      break;
    }
  }

  // Extract subject
  for (const [subject, kws] of Object.entries(SUBJECT_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) {
      result.subject = subject;
      result.boosts.push({
        field: "subject",
        value: subject,
        weight: 0.5,
        reason: `Pelajaran ${subject}`,
      });
      result.keywords.push(...kws.slice(0, 2));
      result.confidence += 0.3;
      break;
    }
  }

  // Extract type
  for (const [type, kws] of Object.entries(TYPE_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) {
      result.type = type;
      result.boosts.push({
        field: "type",
        value: type,
        weight: 0.25,
        reason: `Tipe: ${type}`,
      });
      result.confidence += 0.15;
      break;
    }
  }

  // Extract mood
  for (const [mood, kws] of Object.entries(MOOD_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) {
      result.mood = mood;
      result.confidence += 0.1;
      break;
    }
  }

  // Extract language
  if (lower.includes("bahasa inggris") || lower.includes("english")) {
    result.language = "en";
    result.confidence += 0.1;
  }

  // Fallback: extract keywords (remove stop words)
  if (result.keywords.length === 0) {
    const stopWords = new Set([
      "cari", "carikan", "tolong", "yang", "untuk", "anak", "remaja",
      "buku", "novel", "dong", "mau", "ingin", "aku", "kamu", "saya",
      "di", "ke", "dari", "pada", "dengan", "dan", "atau", "ini", "itu",
      "ada", "tidak", "ga", "gak", "nggak", "ya",
    ]);
    const words = lower
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    result.keywords = [...new Set(words)].slice(0, 5);
    if (result.keywords.length > 0) {
      result.confidence += 0.2;
    }
  }

  // Cap confidence
  result.confidence = Math.min(1, result.confidence);

  return result;
}

/**
 * Map grade number to school level.
 */
function gradeToLevel(grade: number): string {
  if (grade <= 0) return "TK";
  if (grade <= 6) return "SD";
  if (grade <= 9) return "SMP";
  if (grade <= 12) return "SMA";
  return "UMUM";
}

// ===== Scoring =====

/**
 * Score a book against parsed query.
 * Returns 0-1 relevance score.
 */
export function scoreBook(
  book: {
    id: string;
    title: string;
    author: string;
    description?: string | null;
    category?: { name: string } | null;
    tags?: string[];
  },
  parsed: ParsedQuery
): { score: number; matchReasons: string[]; highlights: Record<string, string> } {
  let score = 0;
  const matchReasons: string[] = [];
  const highlights: Record<string, string> = {};

  // Base keyword match
  const titleLower = book.title.toLowerCase();
  const authorLower = book.author.toLowerCase();
  const descLower = (book.description || "").toLowerCase();
  const catLower = (book.category?.name || "").toLowerCase();

  for (const kw of parsed.keywords) {
    if (titleLower.includes(kw)) {
      score += 0.3;
      matchReasons.push(`Judul mengandung "${kw}"`);
      highlights.title = highlightText(book.title, kw);
    } else if (authorLower.includes(kw)) {
      score += 0.2;
      matchReasons.push(`Pengarang "${kw}"`);
    } else if (descLower.includes(kw)) {
      score += 0.1;
      matchReasons.push(`Deskripsi mengandung "${kw}"`);
    } else if (catLower.includes(kw)) {
      score += 0.15;
      matchReasons.push(`Kategori mengandung "${kw}"`);
    }
  }

  // Apply boosts
  for (const boost of parsed.boosts) {
    if (boost.field === "topic" && (descLower.includes(boost.value) || titleLower.includes(boost.value))) {
      score += boost.weight;
      matchReasons.push(boost.reason);
    }
    if (boost.field === "subject" && catLower.includes(boost.value)) {
      score += boost.weight;
      matchReasons.push(boost.reason);
    }
    if (boost.field === "genre" && catLower.includes(boost.value)) {
      score += boost.weight * 0.5; // Genres rarely match categories exactly
    }
  }

  // Audience match (heuristic: simple title check)
  if (parsed.audience === "anak" && /\banak|kids?\b/i.test(book.title)) {
    score += 0.1;
    matchReasons.push("Cocok untuk anak");
  }
  if (parsed.audience === "remaja" && /\bremaja|teen/i.test(book.title)) {
    score += 0.1;
  }

  // Mood/genre soft matches via description
  if (parsed.mood === "lucu" && /\blucu|humor|kocak|comedy/i.test(descLower)) {
    score += 0.1;
    matchReasons.push("Humor/lucu");
  }
  if (parsed.mood === "inspiratif" && /\binspirasi|motivasi|sukses/i.test(descLower)) {
    score += 0.1;
    matchReasons.push("Inspiratif");
  }

  // Cap score
  score = Math.min(1, score);

  return { score, matchReasons, highlights };
}

/**
 * Highlight matched text with mark tag.
 */
function highlightText(text: string, query: string): string {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) + "»" + text.slice(idx, idx + query.length) + "«" + text.slice(idx + query.length);
}

// ===== Database Search =====

/**
 * Search books using natural language query.
 * Combines parsed metadata with full-text search.
 */
export async function nlSearch(
  query: string,
  options: { limit?: number; minScore?: number } = {}
): Promise<ScoredBook[]> {
  const limit = options.limit ?? 20;
  const minScore = options.minScore ?? 0.1;
  const parsed = parseQuery(query);

  logger.info("NL search", { query, parsed: { topic: parsed.topic, level: parsed.level } });

  // Build DB query
  const where: any = {};

  // Add keyword search
  if (parsed.keywords.length > 0) {
    where.OR = parsed.keywords.flatMap((kw) => [
      { title: { contains: kw } },
      { author: { contains: kw } },
      { description: { contains: kw } },
    ]);
  }

  // Add metadata filters
  if (parsed.subject) {
    where.category = { name: { contains: parsed.subject } };
  }

  const books = await db.book.findMany({
    where,
    include: { category: { select: { name: true } } },
    take: 200, // Pre-filter limit
  });

  // Score each book
  const scored: ScoredBook[] = books
    .map((book) => {
      const result = scoreBook(
        {
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.synopsis,
          category: book.category,
        },
        parsed
      );
      return {
        bookId: book.id,
        title: book.title,
        author: book.author,
        score: result.score,
        matchReasons: result.matchReasons,
        highlights: result.highlights,
      };
    })
    .filter((b) => b.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * Format parsed query as a human-readable description.
 */
export function describeQuery(parsed: ParsedQuery): string {
  const parts: string[] = [];
  if (parsed.topic) parts.push(`topik ${parsed.topic}`);
  if (parsed.genre) parts.push(`genre ${parsed.genre}`);
  if (parsed.audience) parts.push(`untuk ${parsed.audience}`);
  if (parsed.level) parts.push(`level ${parsed.level}`);
  if (parsed.grade) parts.push(`kelas ${parsed.grade}`);
  if (parsed.subject) parts.push(`pelajaran ${parsed.subject}`);
  if (parsed.type) parts.push(`tipe ${parsed.type}`);
  if (parsed.mood) parts.push(`suasana ${parsed.mood}`);

  if (parts.length === 0 && parsed.keywords.length > 0) {
    return `Pencarian: ${parsed.keywords.slice(0, 3).join(", ")}`;
  }
  return parts.length > 0 ? parts.join(" • ") : "Pencarian umum";
}
