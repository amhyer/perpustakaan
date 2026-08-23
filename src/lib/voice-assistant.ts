/**
 * Voice Assistant Integration
 *
 * Foundation untuk integrasi dengan voice assistants:
 * - Amazon Alexa (Alexa Skills)
 * - Google Assistant (Actions on Google)
 * - Apple Siri (Intents)
 * - Web Speech API (browser-native)
 *
 * Konsep: Skills/Actions yang bisa dipanggil user:
 * - "Alexa, tanya perpustakaan berapa buku tersedia"
 * - "Ok Google, cari buku Laskar Pelangi"
 * - "Hey Siri, pinjam Atomic Habits"
 *
 * Implementasi:
 * - Webhook endpoints untuk Alexa/Google fulfillment
 * - NLP intent parsing
 * - Query ke database
 * - Format response (SSML untuk voice)
 *
 * Untuk saat ini: stub functions + utility untuk intent detection.
 * Real production perlu setup di Alexa Developer Console / Actions Console.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// =========================================================================
// TYPES
// =========================================================================

export type VoicePlatform = "alexa" | "google" | "siri" | "web-speech";

export interface VoiceIntent {
  name:
    | "SearchBook"
    | "CheckAvailability"
    | "MyLoans"
    | "DueSoon"
    | "Points"
    | "Recommend"
    | "Greeting"
    | "Fallback";
  confidence: number;
  parameters: Record<string, string>;
}

export interface VoiceResponse {
  text: string;
  ssml?: string; // Speech Synthesis Markup Language
  card?: {
    title: string;
    content: string;
    imageUrl?: string;
  };
  shouldEndSession: boolean;
}

// =========================================================================
// INTENT PARSING
// =========================================================================

/**
 * Parse natural language ke VoiceIntent.
 * Pattern matching sederhana (untuk production, pakai Dialogflow/Lex).
 */
export function parseIntent(text: string): VoiceIntent {
  const lower = text.toLowerCase().trim();

  // Search book
  if (
    lower.includes("cari") ||
    lower.includes("search") ||
    lower.includes("find") ||
    lower.includes("ada buku") ||
    lower.includes("where is")
  ) {
    // Extract book title (heuristic: ambil semua setelah "cari")
    const match = lower.match(/(?:cari|search|find|ada buku) (.+?)(?:\?|$)/);
    return {
      name: "SearchBook",
      confidence: 0.8,
      parameters: { query: match?.[1] || lower },
    };
  }

  // Check availability
  if (
    lower.includes("tersedia") ||
    lower.includes("available") ||
    lower.includes("bisa pinjam") ||
    lower.includes("stock")
  ) {
    const match = lower.match(/(?:tersedia|available|stock)(?: buku)? (.+?)(?:\?|$)/);
    return {
      name: "CheckAvailability",
      confidence: 0.75,
      parameters: { query: match?.[1] || lower },
    };
  }

  // My loans
  if (
    lower.includes("pinjaman saya") ||
    lower.includes("my loans") ||
    lower.includes("apa yang saya pinjam") ||
    lower.includes("bukuku")
  ) {
    return {
      name: "MyLoans",
      confidence: 0.85,
      parameters: {},
    };
  }

  // Due soon
  if (
    lower.includes("jatuh tempo") ||
    lower.includes("due") ||
    lower.includes("kapan harus dikembalikan") ||
    lower.includes("besok")
  ) {
    return {
      name: "DueSoon",
      confidence: 0.8,
      parameters: {},
    };
  }

  // Points
  if (
    lower.includes("poin") ||
    lower.includes("points") ||
    lower.includes("berapa poin") ||
    lower.includes("skor")
  ) {
    return {
      name: "Points",
      confidence: 0.85,
      parameters: {},
    };
  }

  // Recommend
  if (
    lower.includes("rekomendasi") ||
    lower.includes("recommend") ||
    lower.includes("buku bagus") ||
    lower.includes("apa yang bagus")
  ) {
    return {
      name: "Recommend",
      confidence: 0.8,
      parameters: {},
    };
  }

  // Greeting
  if (
    lower.includes("halo") ||
    lower.includes("hello") ||
    lower.includes("hi") ||
    lower.includes("مرحبا")
  ) {
    return {
      name: "Greeting",
      confidence: 0.95,
      parameters: {},
    };
  }

  return {
    name: "Fallback",
    confidence: 0,
    parameters: { originalText: text },
  };
}

// =========================================================================
// INTENT HANDLERS
// =========================================================================

interface HandleIntentOptions {
  intent: VoiceIntent;
  memberId?: string; // Optional, kalau user authenticated
  locale?: "id" | "en" | "ar";
}

export async function handleIntent(options: HandleIntentOptions): Promise<VoiceResponse> {
  const { intent, memberId, locale = "id" } = options;

  try {
    switch (intent.name) {
      case "SearchBook":
        return await handleSearchBook(intent.parameters.query || "", locale);

      case "CheckAvailability":
        return await handleCheckAvailability(intent.parameters.query || "", locale);

      case "MyLoans":
        if (!memberId) return guestResponse("myLoans", locale);
        return await handleMyLoans(memberId, locale);

      case "DueSoon":
        if (!memberId) return guestResponse("dueSoon", locale);
        return await handleDueSoon(memberId, locale);

      case "Points":
        if (!memberId) return guestResponse("points", locale);
        return await handlePoints(memberId, locale);

      case "Recommend":
        return await handleRecommend(locale);

      case "Greeting":
        return greetingResponse(locale);

      case "Fallback":
      default:
        return fallbackResponse(intent.parameters.originalText || "", locale);
    }
  } catch (err) {
    logger.error("Voice intent handler failed", { intent: intent.name, error: String(err) });
    return errorResponse(locale);
  }
}

// =========================================================================
// HANDLER IMPLEMENTATIONS
// =========================================================================

async function handleSearchBook(query: string, locale: string): Promise<VoiceResponse> {
  const books = await db.book.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        { author: { contains: query } },
      ],
    },
    take: 3,
    select: { title: true, author: true, synopsis: true },
  });

  if (books.length === 0) {
    return {
      text: locale === "en"
        ? `Sorry, I couldn't find a book matching "${query}".`
        : locale === "ar"
        ? `عذراً، لم أجد كتاباً يطابق "${query}".`
        : `Maaf, saya tidak menemukan buku yang cocok dengan "${query}".`,
      shouldEndSession: false,
    };
  }

  const first = books[0];
  const more = books.length > 1 ? ` Ada ${books.length - 1} buku lainnya.` : "";

  return {
    text: locale === "en"
      ? `I found "${first.title}" by ${first.author}.${more}`
      : locale === "ar"
      ? `وجدت "${first.title}" لـ ${first.author}.${more}`
      : `Saya menemukan "${first.title}" karya ${first.author}.${more}`,
    card: {
      title: first.title,
      content: `${first.author}\n${first.synopsis?.slice(0, 200) || ""}...`,
    },
    shouldEndSession: false,
  };
}

async function handleCheckAvailability(query: string, locale: string): Promise<VoiceResponse> {
  const items = await db.bookItem.findMany({
    where: {
      status: "AVAILABLE",
      book: { title: { contains: query } },
    },
    take: 10,
  });

  const text = locale === "en"
    ? `${items.length} copies of "${query}" are available right now.`
    : locale === "ar"
    ? `${items.length} نسخة من "${query}" متاحة الآن.`
    : `${items.length} eksemplar "${query}" tersedia saat ini.`;

  return { text, shouldEndSession: true };
}

async function handleMyLoans(memberId: string, locale: string): Promise<VoiceResponse> {
  const loans = await db.loan.findMany({
    where: { memberId, status: "LOANED" },
    include: { bookItem: { include: { book: true } } },
    take: 5,
  });

  if (loans.length === 0) {
    return {
      text: locale === "en"
        ? "You have no active loans."
        : locale === "ar"
        ? "ليس لديك استعارات نشطة."
        : "Anda tidak punya pinjaman aktif.",
      shouldEndSession: true,
    };
  }

  const titles = loans.map((l) => l.bookItem.book.title).join(", ");
  return {
    text: locale === "en"
      ? `You have ${loans.length} active loans: ${titles}.`
      : locale === "ar"
      ? `لديك ${loans.length} استعارات نشطة: ${titles}.`
      : `Anda memiliki ${loans.length} pinjaman aktif: ${titles}.`,
    shouldEndSession: true,
  };
}

async function handleDueSoon(memberId: string, locale: string): Promise<VoiceResponse> {
  const weekFromNow = new Date(Date.now() + 7 * 86400000);
  const loans = await db.loan.findMany({
    where: {
      memberId,
      status: "LOANED",
      dueDate: { lte: weekFromNow, gte: new Date() },
    },
    include: { bookItem: { include: { book: true } } },
  });

  if (loans.length === 0) {
    return {
      text: locale === "en"
        ? "You have no loans due in the next 7 days."
        : locale === "ar"
        ? "لا توجد استعارات مستحقة خلال 7 أيام."
        : "Tidak ada pinjaman yang jatuh tempo dalam 7 hari ke depan.",
      shouldEndSession: true,
    };
  }

  return {
    text: locale === "en"
      ? `You have ${loans.length} loan(s) due soon: ${loans.map((l) => l.bookItem.book.title).join(", ")}.`
      : locale === "ar"
      ? `لديك ${loans.length} استعارة مستحقة قريباً: ${loans.map((l) => l.bookItem.book.title).join(", ")}.`
      : `Anda punya ${loans.length} pinjaman yang akan jatuh tempo: ${loans.map((l) => l.bookItem.book.title).join(", ")}.`,
    shouldEndSession: true,
  };
}

async function handlePoints(memberId: string, locale: string): Promise<VoiceResponse> {
  const lastTxn = await db.pointTransaction.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
  const balance = lastTxn?.balanceAfter ?? 0;

  return {
    text: locale === "en"
      ? `You currently have ${balance} points.`
      : locale === "ar"
      ? `لديك حالياً ${balance} نقطة.`
      : `Anda saat ini memiliki ${balance} poin.`,
    shouldEndSession: true,
  };
}

async function handleRecommend(locale: string): Promise<VoiceResponse> {
  const popular = await db.book.findMany({
    include: { items: { where: { status: "AVAILABLE" }, take: 1 } },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  return {
    text: locale === "en"
      ? `Popular books right now: ${popular.map((b) => b.title).join(", ")}.`
      : locale === "ar"
      ? `الكتب الشائعة الآن: ${popular.map((b) => b.title).join(", ")}.`
      : `Buku populer saat ini: ${popular.map((b) => b.title).join(", ")}.`,
    shouldEndSession: true,
  };
}

function greetingResponse(locale: string): VoiceResponse {
  const greetings: Record<string, string> = {
    id: "Halo! Saya asisten perpustakaan. Anda bisa tanya tentang buku, pinjaman, atau poin. Mau bantu apa hari ini?",
    en: "Hello! I'm your library assistant. You can ask about books, loans, or points. How can I help?",
    ar: "مرحباً! أنا مساعدك في المكتبة. يمكنك السؤال عن الكتب أو الاستعارات أو النقاط. كيف يمكنني المساعدة؟",
  };
  return {
    text: greetings[locale] || greetings.id,
    shouldEndSession: false,
  };
}

function fallbackResponse(text: string, locale: string): VoiceResponse {
  const msgs: Record<string, string> = {
    id: `Maaf, saya tidak mengerti "${text}". Coba tanya tentang: cari buku, pinjaman saya, poin saya, atau rekomendasi buku.`,
    en: `Sorry, I didn't understand "${text}". Try asking about: search book, my loans, my points, or book recommendations.`,
    ar: `عذراً، لم أفهم "${text}". حاول السؤال عن: البحث عن كتاب، استعاراتي، نقاطي، أو توصيات الكتب.`,
  };
  return {
    text: msgs[locale] || msgs.id,
    shouldEndSession: false,
  };
}

function errorResponse(locale: string): VoiceResponse {
  return {
    text: locale === "en"
      ? "Sorry, an error occurred. Please try again."
      : locale === "ar"
      ? "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى."
      : "Maaf, terjadi kesalahan. Silakan coba lagi.",
    shouldEndSession: true,
  };
}

function guestResponse(intent: string, locale: string): VoiceResponse {
  return {
    text: locale === "en"
      ? "Please log in first to use this feature."
      : locale === "ar"
      ? "يرجى تسجيل الدخول أولاً لاستخدام هذه الميزة."
      : "Silakan login dulu untuk fitur ini.",
    shouldEndSession: true,
  };
}

// =========================================================================
// WEBHOOK ENDPOINTS
// =========================================================================

/**
 * Format response untuk Alexa Skills Kit.
 */
export function toAlexaResponse(response: VoiceResponse): any {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: `<speak>${response.ssml || response.text}</speak>`,
      },
      card: response.card
        ? {
            type: "Simple",
            title: response.card.title,
            content: response.card.content,
          }
        : undefined,
      shouldEndSession: response.shouldEndSession,
    },
  };
}

/**
 * Format response untuk Google Assistant.
 */
export function toGoogleResponse(response: VoiceResponse): any {
  return {
    fulfillmentText: response.text,
    fulfillmentMessages: response.card
      ? [
          {
            card: {
              title: response.card.title,
              subtitle: "",
              image: { url: response.card.imageUrl || "" },
              text: response.card.content,
              buttonText: "Buka Perpustakaan",
              buttonUrl: "https://perpustakaan.sekolah.sch.id/",
            },
          },
        ]
      : undefined,
    expectUserResponse: !response.shouldEndSession,
  };
}
