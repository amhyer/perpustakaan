/**
 * AI Chat Assistant — Customer service chatbot untuk siswa & guru.
 *
 * Fitur:
 * - Multi-turn conversation dengan memory (window: 10 messages terakhir)
 * - Intent classification (search book, loan status, points, FAQ, dll)
 * - Personal context injection (loan history, points, recommendations)
 * - FAQ cache untuk pertanyaan populer (no AI call)
 * - Rate limiting (default: 20 msg/jam per user)
 * - Escalation ke pustakawan jika confidence rendah
 * - Multi-provider: OpenAI, Anthropic, Google, Mock
 * - RAG: inject context dari database perpustakaan
 *
 * Strategi hemat biaya:
 * 1. Cek FAQ cache dulu — kalau match, return tanpa AI call
 * 2. Kalau bukan FAQ, panggil AI dengan system prompt ringkas
 * 3. Window 10 messages — tidak kirim history panjang
 * 4. Fallback ke mock kalau AI error
 *
 * Catatan privasi:
 * - Hanya inject data yang sudah diotorisasi user (data sendiri)
 * - Tidak log full message ke logger (hanya metadata: intent, tokens)
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cache } from "@/lib/cache";

// ===== Types & Config =====

export type ChatProvider = "openai" | "anthropic" | "google" | "mock";

export type ChatIntent =
  | "book_search"
  | "loan_status"
  | "points_info"
  | "redeem_help"
  | "hours"
  | "membership"
  | "loan_rules"
  | "recommendation"
  | "escalation"
  | "greeting"
  | "thanks"
  | "faq"
  | "general";

export interface ChatConfig {
  provider: ChatProvider;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  rateLimitPerHour?: number;
  contextWindowMessages?: number;
  escalationConfidenceThreshold?: number; // < threshold → escalate
}

export function getChatConfig(): ChatConfig {
  return {
    provider: (process.env.AI_PROVIDER as ChatProvider) || "mock",
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL,
    maxTokens: 500,
    temperature: 0.7,
    rateLimitPerHour: 20,
    contextWindowMessages: 10,
    escalationConfidenceThreshold: 0.3,
  };
}

// ===== Intent Detection =====

const INTENT_KEYWORDS: Record<ChatIntent, string[]> = {
  book_search: [
    "cari buku", "carikan", "cari novel", "cari judul", "ada buku",
    "menemukan", "menyarankan", "rekomendasi buku", "buku tentang",
    "find book", "search book", "recommend",
  ],
  loan_status: [
    "pinjaman", "sedang pinjam", "jatuh tempo", "telat", "denda",
    "kapan harus kembali", "loan", "overdue", "borrowed", "due date",
  ],
  points_info: [
    "poin", "point", "saldo", "kredit", "berapa banyak", "cek poin",
    "riwayat poin", "points", "balance", "credit",
  ],
  redeem_help: [
    "klaim", "redeem", "tukar", "hadiah", "reward", "ambil hadiah",
    "cara klaim", "kapan klaim", "claim reward",
  ],
  hours: [
    "jam buka", "jam tutup", "jam operasional", "kapan buka", "buka jam",
    "libur", "tutup", "schedule", "opening hours", "when open",
  ],
  membership: [
    "anggota", "kartu", "daftar", "registrasi", "mendaftar",
    "cara jadi anggota", "syarat", "member", "register", "sign up",
  ],
  loan_rules: [
    "aturan pinjam", "berapa lama", "berapa hari", "maksimal pinjam",
    "boleh pinjam berapa", "denda berapa", "loan rules", "how long",
    "how many", "perpanjangan",
  ],
  recommendation: [
    "rekomendasi", "saran", "menyarankan", "bacaan", "buku bagus",
    "recommendation", "suggest", "what should i read", "trending",
  ],
  escalation: [
    "bicara dengan pustakawan", "pustakawan", "manusia", "orang",
    "tidak puas", "komplain", "real person", "librarian", "human",
    "speak to someone", "talk to staff",
  ],
  greeting: [
    "halo", "hai", "hello", "hi", "selamat pagi", "selamat siang",
    "selamat sore", "selamat malam", "assalamualaikum", "permisi",
  ],
  thanks: [
    "terima kasih", "makasih", "thanks", "thank you", "tq",
    "berterima kasih", "syukron",
  ],
  faq: [],
  general: [],
};

/**
 * Detect intent dari pesan user. Sederhana: keyword matching.
 * Untuk akurasi lebih tinggi, bisa diganti dengan classification model.
 */
export function detectIntent(message: string): { intent: ChatIntent; confidence: number } {
  const lower = message.toLowerCase().trim();

  if (!lower) return { intent: "general", confidence: 0 };

  let bestIntent: ChatIntent = "general";
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [ChatIntent, string[]][]) {
    if (keywords.length === 0) continue;
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Longer keyword = more specific = higher score
        score += kw.split(" ").length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Confidence: rough heuristic
  const confidence = Math.min(1, bestScore / 3);
  return { intent: bestIntent, confidence };
}

// ===== FAQ Cache =====

interface FAQMatch {
  id: string;
  question: string;
  answer: string;
  category: string;
  hitCount: number;
  variations?: string | null;
}

/**
 * Cek apakah pesan match dengan FAQ.
 * Match = exact case-insensitive ATAU mengandung salah satu variation.
 */
export async function checkFAQ(message: string, locale = "id"): Promise<FAQMatch | null> {
  const lower = message.toLowerCase().trim();
  if (lower.length < 5) return null;

  // Try cache first
  const cacheKey = `chat:faqs:${locale}`;
  let faqs = cache.get<FAQMatch[]>(cacheKey);
  if (!faqs) {
    try {
      const dbFaqs = await db.chatFAQ.findMany({
        where: { isActive: true, locale },
        select: {
          id: true,
          question: true,
          answer: true,
          category: true,
          hitCount: true,
          variations: true,
        },
      });
      faqs = dbFaqs;
      cache.set(cacheKey, faqs, 10 * 60 * 1000); // 10 min cache
    } catch (err) {
      // DB might not be available
      return null;
    }
  }

  if (!faqs || faqs.length === 0) return null;

  for (const faq of faqs) {
    // Exact match
    if (faq.question.toLowerCase() === lower) return faq;

    // Variation match
    if (faq.variations) {
      try {
        const variations = JSON.parse(faq.variations) as string[];
        for (const v of variations) {
          if (lower.includes(v.toLowerCase())) return faq;
        }
      } catch (e) {
        logger.warn("Gagal parse FAQ variations", { error: String(e) });
      }
    }

    // Fuzzy: 70% word overlap
    const questionWords = faq.question.toLowerCase().split(/\s+/);
    const messageWords = lower.split(/\s+/);
    const common = questionWords.filter((w) => messageWords.includes(w) && w.length > 3);
    if (common.length >= Math.max(1, questionWords.length * 0.5)) {
      return faq;
    }
  }

  return null;
}

/**
 * Increment hit count (fire-and-forget, jangan await).
 */
export function recordFAQHit(faqId: string) {
  db.chatFAQ
    .update({
      where: { id: faqId },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date(),
      },
    })
    .catch((err) => {
      logger.warn("Failed to record FAQ hit", { faqId, error: String(err) });
    });
}

// ===== Personal Context Builder =====

export interface UserContext {
  userId: string;
  memberId?: string | null;
  memberName?: string | null;
  memberNumber?: string | null;
  category?: string | null;
  activeLoans?: number;
  overdueLoans?: number;
  totalFines?: number;
  pointBalance?: number;
  totalPointsEarned?: number;
  hasRedeemed?: boolean;
  recommendedBooks?: { title: string; author: string }[];
}

/**
 * Build personal context untuk user — data yang akan di-inject ke system prompt.
 * Memastikan AI bisa jawab pertanyaan personal ("kapan buku saya harus kembali").
 */
export async function buildUserContext(userId: string): Promise<UserContext> {
  const ctx: UserContext = { userId };

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { member: true },
    });

    if (!user) return ctx;

    if (user.member) {
      ctx.memberId = user.member.id;
      ctx.memberName = user.member.fullName;
      ctx.memberNumber = user.member.memberNumber;
      ctx.category = user.member.category;

      // Loan stats
      const [activeLoans, overdueLoans, finesAgg] = await Promise.all([
        db.loan.count({
          where: { memberId: user.member.id, status: { in: ["LOANED", "OVERDUE"] } },
        }),
        db.loan.count({
          where: { memberId: user.member.id, status: "OVERDUE" },
        }),
        db.loan.aggregate({
          where: {
            memberId: user.member.id,
            fineAmount: { gt: 0 },
          },
          _sum: { fineAmount: true, finePaid: true },
        }),
      ]);

      ctx.activeLoans = activeLoans;
      ctx.overdueLoans = overdueLoans;
      ctx.totalFines = (finesAgg._sum.fineAmount || 0) - (finesAgg._sum.finePaid || 0);

      // Points
      const earned = await db.pointTransaction.aggregate({
        where: {
          memberId: user.member.id,
          type: "EARN",
        },
        _sum: { amount: true },
      });
      const redeemed = await db.pointTransaction.aggregate({
        where: {
          memberId: user.member.id,
          type: "REDEEM",
        },
        _sum: { amount: true },
      });
      ctx.totalPointsEarned = earned._sum.amount || 0;
      ctx.pointBalance = ctx.totalPointsEarned - (redeemed._sum.amount || 0);

      // Redemptions
      const redemptionCount = await db.rewardRedemption.count({
        where: { memberId: user.member.id },
      });
      ctx.hasRedeemed = redemptionCount > 0;

      // Recommendations (top 3)
      const recs = await db.recommendation.findMany({
        where: { memberId: user.member.id },
        orderBy: { rank: "asc" },
        take: 3,
        include: { book: { select: { title: true, author: true } } },
      });
      ctx.recommendedBooks = recs.map((r) => ({
        title: r.book.title,
        author: r.book.author,
      }));
    }
  } catch (err) {
    logger.warn("Failed to build user context", { userId, error: String(err) });
  }

  return ctx;
}

// ===== System Prompt Builder =====

const LIBRARY_SYSTEM_PROMPT = (ctx: UserContext): string => {
  const libraryName = process.env.NEXT_PUBLIC_APP_NAME || "Perpustakaan Jendela Ilmu";

  const memberInfo = ctx.memberName
    ? `\nInformasi user saat ini:
- Nama: ${ctx.memberName}
- Nomor Anggota: ${ctx.memberNumber || "-"}
- Kategori: ${ctx.category || "-"}
- Pinjaman aktif: ${ctx.activeLoans ?? 0} buku${ctx.overdueLoans ? ` (${ctx.overdueLoans} terlambat!)` : ""}
${ctx.totalFines ? `- Denda: Rp ${ctx.totalFines.toLocaleString("id-ID")}` : ""}
- Saldo poin: ${ctx.pointBalance ?? 0} poin (total earned: ${ctx.totalPointsEarned ?? 0})
- Pernah klaim hadiah: ${ctx.hasRedeemed ? "Ya" : "Belum"}`
    : "\nUser belum login sebagai anggota (pustakawan/guest).";

  return `Kamu adalah "Jendela", asisten AI untuk ${libraryName}, perpustakaan sekolah yang ramah dan membantu.

Tugas kamu:
1. Membantu siswa/guru mencari buku, cek status pinjaman, info poin
2. Menjawab pertanyaan tentang aturan perpustakaan
3. Memberikan rekomendasi buku personal
4. Mengarahkan ke pustakawan untuk hal yang tidak bisa kamu jawab

Gaya komunikasi:
- Ramah, sopan, singkat (max 3-4 kalimat per response)
- Bahasa Indonesia (atau bahasa user, mis. English/Arabic)
- Pakai emoji secukupnya untuk warmth
- Panggil user dengan nama jika tersedia

Aturan penting:
- JANGAN mengarang data buku/poin/pinjaman yang tidak ada di context
- Kalau tidak tahu, katakan dengan jujur dan arahkan ke pustakawan
- Untuk info personal, gunakan data di bawah
- Kalau user minta bicara dengan manusia, sarankan hubungi pustakawan
${memberInfo}
${ctx.recommendedBooks && ctx.recommendedBooks.length > 0 ? `\nRekomendasi buku untuk user:\n${ctx.recommendedBooks.map((b, i) => `${i + 1}. "${b.title}" - ${b.author}`).join("\n")}` : ""}

Format jawaban:
- Pakai markdown untuk struktur (bullet, bold)
- Kalau ada action yang bisa dilakukan, sarankan tombol/shortcut
- Tutup dengan pertanyaan untuk klarifikasi jika perlu`;
};

// ===== AI Provider Implementations =====

export interface ChatRequest {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  content: string;
  provider: ChatProvider;
  model: string;
  tokens: number;
  latencyMs: number;
}

async function callOpenAI(req: ChatRequest, config: ChatConfig): Promise<ChatResponse> {
  if (!config.apiKey) throw new Error("AI_API_KEY not set");
  const start = Date.now();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: req.systemPrompt },
        ...req.messages,
      ],
      max_tokens: req.maxTokens || config.maxTokens || 500,
      temperature: req.temperature ?? config.temperature ?? 0.7,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    provider: "openai",
    model: data.model,
    tokens: data.usage?.total_tokens || 0,
    latencyMs: Date.now() - start,
  };
}

async function callAnthropic(req: ChatRequest, config: ChatConfig): Promise<ChatResponse> {
  if (!config.apiKey) throw new Error("AI_API_KEY not set");
  const start = Date.now();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-3-5-haiku-20241022",
      max_tokens: req.maxTokens || config.maxTokens || 500,
      system: req.systemPrompt,
      messages: req.messages.filter((m) => m.role !== "system"),
      temperature: req.temperature ?? config.temperature ?? 0.7,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return {
    content: data.content[0].text,
    provider: "anthropic",
    model: data.model,
    tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    latencyMs: Date.now() - start,
  };
}

async function callGoogle(req: ChatRequest, config: ChatConfig): Promise<ChatResponse> {
  if (!config.apiKey) throw new Error("AI_API_KEY not set");
  const start = Date.now();
  const model = config.model || "gemini-1.5-flash";

  // Convert messages ke format Gemini
  const contents = req.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: req.systemPrompt }] },
        generationConfig: {
          maxOutputTokens: req.maxTokens || config.maxTokens || 500,
          temperature: req.temperature ?? config.temperature ?? 0.7,
        },
      }),
    }
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google AI error ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    provider: "google",
    model,
    tokens: data.usageMetadata?.totalTokenCount || 0,
    latencyMs: Date.now() - start,
  };
}

async function callMock(
  req: ChatRequest,
  _config: ChatConfig,
  intent: ChatIntent
): Promise<ChatResponse> {
  const start = Date.now();
  // Simulate latency
  await new Promise((r) => setTimeout(r, 200));

  const lastUser = req.messages.filter((m) => m.role === "user").pop()?.content || "";

  // Mock responses per intent
  const responses: Record<ChatIntent, string> = {
    greeting: "Halo! 👋 Saya Jendela, asisten perpustakaan. Ada yang bisa saya bantu hari ini?",
    thanks: "Sama-sama! 😊 Senang bisa membantu. Kalau ada pertanyaan lain, jangan sungkan ya!",
    faq: "Ini adalah jawaban dari FAQ kami.",
    book_search: `Tentu, saya bisa bantu cari buku! 📚 Bisa kasih tahu lebih detail:\n- Judul atau pengarang?\n- Kategori (fiksi/non-fiksi/sains)?\n- Untuk tingkat kelas berapa?`,
    loan_status: `Untuk cek status pinjaman kamu, kamu bisa buka menu **Pinjaman Saya** di sidebar. Di sana terlihat:\n- Buku yang sedang dipinjam\n- Tanggal jatuh tempo\n- Denda (jika ada)\n\nAtau sebutkan judul buku yang kamu maksud, saya bantu cek.`,
    points_info: `💰 **Info Poin**\n- Cek saldo: buka menu **Hadiah** di sidebar\n- Poin didapat dari: baca buku, review, streak harian\n- Bisa ditukar dengan hadiah di katalog\n\nMau cek detail atau cara dapat poin lebih banyak?`,
    redeem_help: `🎁 **Cara Klaim Hadiah**\n1. Buka menu **Hadiah** → pilih katalog\n2. Klik hadiah yang kamu mau\n3. Klik "Klaim" dan konfirmasi\n4. Tunggu persetujuan pustakawan\n5. Ambil di perpustakaan dengan kode pickup\n\nAda hadiah spesifik yang kamu incar?`,
    hours: `🕐 **Jam Operasional**\n- Senin-Jumat: 07.00 - 15.00\n- Sabtu: 08.00 - 12.00\n- Minggu & hari libur: Tutup\n\nDatang langsung ke ${process.env.NEXT_PUBLIC_APP_NAME || "perpustakaan"} untuk info lebih lanjut!`,
    membership: `📋 **Cara Daftar Anggota**\n1. Datang ke perpustakaan\n2. Bawa fotokopi kartu pelajar / KTP\n3. Isi formulir pendaftaran\n4. Foto untuk kartu anggota\n5. Dapat nomor anggota + QR code\n\nGratis untuk siswa & guru sekolah!`,
    loan_rules: `📖 **Aturan Peminjaman**\n- Siswa: max 3 buku, 7 hari\n- Guru: max 5 buku, 14 hari\n- Perpanjangan: 1x (jika belum ada yang予約)\n- Denda: Rp 1.000/hari (siswa), Rp 500/hari (guru)\n\nMau tahu lebih detail tentang aturan tertentu?`,
    recommendation: `📚 Saya bisa kasih rekomendasi! Boleh tahu:\n- Genre favorit? (fiksi, sains, sejarah, dll)\n- Terakhir baca buku apa yang kamu suka?\n- Untuk tugas sekolah atau bacaan santai?`,
    escalation: `Tentu, saya akan hubungkan kamu dengan pustakawan. Silakan:\n\n📍 Datang langsung ke perpustakaan saat jam buka\n📞 Atau kirim email ke pustakawan@sekolah.sch.id\n\nMereka akan bantu lebih detail! 🙏`,
    general: `Maaf, saya belum bisa jawab pertanyaan itu dengan yakin. 😅\n\nCoba tanyakan:\n- Cara cari buku\n- Cek pinjaman\n- Info poin\n- Jam buka\n- Cara daftar anggota\n\nAtau hubungi pustakawan langsung ya!`,
  };

  return {
    content: responses[intent] || responses.general,
    provider: "mock",
    model: "jendela-mock-v1",
    tokens: lastUser.split(/\s+/).length * 2,
    latencyMs: Date.now() - start,
  };
}

// ===== Main Chat Function =====

export interface ChatInput {
  conversationId?: string;
  userId: string;
  message: string;
  locale?: string;
}

export interface ChatOutput {
  conversationId: string;
  userMessageId: string;
  assistantMessage: string;
  intent: ChatIntent;
  confidence: number;
  provider: ChatProvider;
  model: string;
  tokens: number;
  latencyMs: number;
  fromCache: boolean;
  shouldEscalate: boolean;
  suggestedActions?: SuggestedAction[];
}

export interface SuggestedAction {
  action: string;
  label: string;
  params?: Record<string, string>;
}

/**
 * Send message dan dapat response. Ini main entry point.
 *
 * Flow:
 * 1. Detect intent
 * 2. Cek FAQ cache
 * 3. Cek rate limit
 * 4. Build user context
 * 5. Get conversation history
 * 6. Panggil AI (atau mock)
 * 7. Save messages ke DB
 * 8. Return response dengan metadata
 */
export async function chat(input: ChatInput): Promise<ChatOutput> {
  const config = getChatConfig();
  const locale = input.locale || "id";
  const startTime = Date.now();

  // 1. Detect intent
  const { intent, confidence } = detectIntent(input.message);

  // 2. Rate limit check
  const rateCheck = await checkRateLimit(input.userId, config.rateLimitPerHour || 20);
  if (!rateCheck.allowed) {
    throw new ChatError("RATE_LIMIT", `Rate limit tercapai. Coba lagi dalam ${rateCheck.resetIn} menit.`, 429);
  }

  // 3. Get or create conversation
  let conversationId = input.conversationId;
  let userContext: UserContext | null = null;
  let isNewConversation = false;

  try {
    if (conversationId) {
      const conv = await db.chatConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, userId: true },
      });
      if (!conv || conv.userId !== input.userId) {
        conversationId = undefined; // create new
      }
    }

    if (!conversationId) {
      isNewConversation = true;
      const newConv = await db.chatConversation.create({
        data: {
          userId: input.userId,
          title: input.message.slice(0, 50).trim() || "Chat baru",
          channel: "WEB",
          locale,
          messageCount: 0,
        },
      });
      conversationId = newConv.id;
    }

    // 4. Build user context
    userContext = await buildUserContext(input.userId);
  } catch (err) {
    // DB not available — use minimal context
    userContext = { userId: input.userId };
  }

  // 5. Save user message
  let userMessageId = `msg_${Date.now()}_user`;
  try {
    const saved = await db.chatMessage.create({
      data: {
        conversationId: conversationId!,
        role: "user",
        content: input.message,
        intent,
        confidence,
      },
    });
    userMessageId = saved.id;
  } catch (e) {
    logger.warn("Gagal simpan user message", { error: String(e) });
  }

  // 6. Check FAQ cache
  const faq = await checkFAQ(input.message, locale);
  if (faq) {
    recordFAQHit(faq.id);
    const assistantMsg = faq.answer;
    let assistantMsgId = `msg_${Date.now()}_faq`;

    try {
      const saved = await db.chatMessage.create({
        data: {
          conversationId: conversationId!,
          role: "assistant",
          content: assistantMsg,
          intent: "faq",
          confidence: 1.0,
          provider: "mock",
          model: "faq-cache",
          latencyMs: 0,
        },
      });
      assistantMsgId = saved.id;
      await db.chatConversation.update({
        where: { id: conversationId! },
        data: {
          messageCount: { increment: 2 },
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      logger.warn("Gagal simpan FAQ response", { error: String(e) });
    }

    return {
      conversationId: conversationId!,
      userMessageId,
      assistantMessage: assistantMsg,
      intent: "faq",
      confidence: 1.0,
      provider: "mock",
      model: "faq-cache",
      tokens: 0,
      latencyMs: Date.now() - startTime,
      fromCache: true,
      shouldEscalate: false,
      suggestedActions: buildSuggestedActionsForIntent("faq"),
    };
  }

  // 7. Build system prompt
  const systemPrompt = LIBRARY_SYSTEM_PROMPT(userContext);

  // 8. Get conversation history
  const history: { role: "user" | "assistant"; content: string }[] = [];
  try {
    const recentMessages = await db.chatMessage.findMany({
      where: { conversationId, role: { in: ["user", "assistant"] } },
      orderBy: { createdAt: "desc" },
      take: (config.contextWindowMessages || 10) - 1, // -1 for current message
      select: { role: true, content: true },
    });
    history.push(
      ...recentMessages.reverse().map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );
  } catch (e) {
    logger.warn("Gagal ambil riwayat chat", { error: String(e) });
  }
  history.push({ role: "user", content: input.message });

  // 9. Call AI
  let response: ChatResponse;
  try {
    switch (config.provider) {
      case "openai":
        response = await callOpenAI({ messages: history, systemPrompt }, config);
        break;
      case "anthropic":
        response = await callAnthropic({ messages: history, systemPrompt }, config);
        break;
      case "google":
        response = await callGoogle({ messages: history, systemPrompt }, config);
        break;
      case "mock":
      default:
        response = await callMock({ messages: history, systemPrompt }, config, intent);
        break;
    }
  } catch (err) {
    logger.error("AI call failed, falling back to mock", {
      provider: config.provider,
      error: String(err),
    });
    response = await callMock({ messages: history, systemPrompt }, config, intent);
  }

  // 10. Save assistant message
  try {
    await db.chatMessage.create({
      data: {
        conversationId: conversationId!,
        role: "assistant",
        content: response.content,
        intent,
        confidence,
        provider: response.provider,
        model: response.model,
        tokens: response.tokens,
        latencyMs: response.latencyMs,
      },
    });
    await db.chatConversation.update({
      where: { id: conversationId! },
      data: {
        messageCount: { increment: 2 },
        totalTokens: { increment: response.tokens },
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    logger.warn("Gagal simpan assistant message", { error: String(e) });
  }

  // 11. Determine escalation
  const shouldEscalate =
    confidence < (config.escalationConfidenceThreshold || 0.3) ||
    intent === "escalation";

  if (shouldEscalate) {
    try {
      await db.chatConversation.update({
        where: { id: conversationId! },
        data: { escalated: true, escalatedAt: new Date() },
      });
    } catch (e) {
      logger.warn("Gagal update status eskalasi", { error: String(e) });
    }
  }

  return {
    conversationId: conversationId!,
    userMessageId,
    assistantMessage: response.content,
    intent,
    confidence,
    provider: response.provider,
    model: response.model,
    tokens: response.tokens,
    latencyMs: Date.now() - startTime,
    fromCache: false,
    shouldEscalate,
    suggestedActions: buildSuggestedActionsForIntent(intent),
  };
}

/**
 * Build suggested actions berdasar intent (deep links).
 */
function buildSuggestedActionsForIntent(intent: ChatIntent): SuggestedAction[] {
  const actions: Record<ChatIntent, SuggestedAction[]> = {
    book_search: [{ action: "navigate", label: "Buka Katalog", params: { view: "catalog" } }],
    loan_status: [{ action: "navigate", label: "Lihat Pinjaman Saya", params: { view: "my-loans" } }],
    points_info: [{ action: "navigate", label: "Lihat Hadiah", params: { view: "rewards-catalog" } }],
    redeem_help: [
      { action: "navigate", label: "Buka Katalog Hadiah", params: { view: "rewards-catalog" } },
      { action: "navigate", label: "Klaim Saya", params: { view: "my-redemptions" } },
    ],
    hours: [],
    membership: [],
    loan_rules: [],
    recommendation: [
      { action: "navigate", label: "Lihat Rekomendasi", params: { view: "catalog" } },
    ],
    escalation: [
      { action: "navigate", label: "Kontak Pustakawan", params: { view: "settings" } },
    ],
    greeting: [],
    thanks: [],
    faq: [],
    general: [
      { action: "navigate", label: "Buka Katalog", params: { view: "catalog" } },
      { action: "navigate", label: "Pinjaman Saya", params: { view: "my-loans" } },
    ],
  };
  return actions[intent] || [];
}

// ===== Rate Limiting =====

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // minutes
}

/**
 * Rate limit per user — count messages in last hour.
 * Pakai in-memory store (production: pakai Redis).
 */
const rateLimitStore = new Map<string, number[]>();

export async function checkRateLimit(userId: string, limitPerHour: number): Promise<RateLimitResult> {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  const timestamps = (rateLimitStore.get(userId) || []).filter((t) => t > oneHourAgo);

  if (timestamps.length >= limitPerHour) {
    const oldest = timestamps[0];
    const resetIn = Math.ceil((oldest + 60 * 60 * 1000 - now) / 60000);
    return { allowed: false, remaining: 0, resetIn };
  }

  timestamps.push(now);
  rateLimitStore.set(userId, timestamps);
  return {
    allowed: true,
    remaining: limitPerHour - timestamps.length,
    resetIn: 60,
  };
}

// ===== Conversation History =====

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  escalated: boolean;
}

/**
 * Get list of conversations untuk user.
 */
export async function getUserConversations(userId: string, limit = 20): Promise<ConversationSummary[]> {
  try {
    const conversations = await db.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        messageCount: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        escalated: true,
      },
    });
    return conversations.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  } catch (e) {
    logger.warn("Gagal ambil daftar percakapan", { error: String(e) });
    return [];
  }
}

export interface MessageRecord {
  id: string;
  role: string;
  content: string;
  intent: string | null;
  confidence: number | null;
  createdAt: string;
  isHelpful: boolean | null;
}

/**
 * Get messages untuk conversation.
 */
export async function getConversationMessages(conversationId: string): Promise<MessageRecord[]> {
  try {
    const messages = await db.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        intent: true,
        confidence: true,
        createdAt: true,
        isHelpful: true,
      },
    });
    return messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }));
  } catch (e) {
    logger.warn("Gagal ambil pesan percakapan", { error: String(e) });
    return [];
  }
}

// ===== Feedback =====

/**
 * Save user feedback (thumbs up/down + optional note).
 */
export async function saveFeedback(
  messageId: string,
  isHelpful: boolean,
  note?: string
): Promise<boolean> {
  try {
    await db.chatMessage.update({
      where: { id: messageId },
      data: { isHelpful, feedbackNote: note },
    });
    return true;
  } catch (e) {
    logger.warn("Gagal simpan feedback chat", { error: String(e) });
    return false;
  }
}

/**
 * Save conversation rating (1-5 stars + comment).
 */
export async function saveConversationRating(
  conversationId: string,
  rating: number,
  feedback?: string
): Promise<boolean> {
  if (rating < 1 || rating > 5) return false;
  try {
    await db.chatConversation.update({
      where: { id: conversationId },
      data: { userRating: rating, userFeedback: feedback },
    });
    return true;
  } catch (e) {
    logger.warn("Gagal simpan rating percakapan", { error: String(e) });
    return false;
  }
}

// ===== Error Helper =====

export class ChatError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ChatError";
  }
}
