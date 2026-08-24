/**
 * Voice Search — Indonesian voice command parser.
 *
 * Sprint S - Tier 4 #14: Voice Interface (Indonesian).
 *
 * Parse Indonesian voice commands like:
 *   "Cari buku tentang persahabatan"
 *   "Pinjamkan Laskar Pelangi"
 *   "Cari novel romance untuk remaja"
 *
 * Convert speech → text → structured command
 * that can be dispatched to the appropriate action.
 *
 * Architecture:
 * - Web Speech API for browser (when available)
 * - Indonesian intent detection
 * - Confidence scoring
 * - Fallback to manual search
 */

import { logger } from "@/lib/logger";

// ===== Types =====

export type VoiceIntent =
  | "SEARCH_BOOK"
  | "BORROW_BOOK"
  | "RETURN_BOOK"
  | "CHECK_LOANS"
  | "RESERVE_BOOK"
  | "VIEW_PROFILE"
  | "VIEW_NOTIFICATIONS"
  | "OPEN_MENU"
  | "HELP"
  | "UNKNOWN";

export interface VoiceCommand {
  intent: VoiceIntent;
  rawText: string;
  entities: {
    bookTitle?: string;
    author?: string;
    topic?: string;
    genre?: string;
    audience?: string;
    menuName?: string;
  };
  confidence: number; // 0-1
  /** Suggested response (untuk voice TTS) */
  response: string;
}

// ===== Indonesian Pattern Matchers =====

const INTENT_PATTERNS: Array<{
  intent: VoiceIntent;
  patterns: RegExp[];
  entityExtractors?: Array<(text: string) => Record<string, string>>;
  confidence: number;
}> = [
  {
    intent: "SEARCH_BOOK",
    patterns: [
      /^cari\s+(buku|novel|komik)\s+(.+)/i,
      /^carikan\s+(buku|novel|komik)\s+(.+)/i,
      /^search\s+(.+)/i,
      /^temukan\s+(.+)/i,
    ],
    entityExtractors: [
      (text: string): Record<string, string> => {
        const m = text.match(/(?:cari(?:kan)?\s+(?:buku|novel|komik)\s+)(.+)/i);
        return m ? { topic: m[1].trim() } : {};
      },
    ],
    confidence: 0.85,
  },
  {
    intent: "BORROW_BOOK",
    patterns: [
      /^(?:pinjam(?:kan)?|mau\s+pinjam)\s+(.+)/i,
      /^(?:buku\s+)?(.+)\s+(?:tolong\s+)?dipinjam/i,
      /^borrow\s+(.+)/i,
    ],
    entityExtractors: [
      (text: string): Record<string, string> => {
        const m = text.match(/(?:pinjam(?:kan)?\s+|borrow\s+)(.+)/i);
        return m ? { bookTitle: m[1].trim() } : {};
      },
    ],
    confidence: 0.9,
  },
  {
    intent: "RETURN_BOOK",
    patterns: [
      /^(?:kembalikan|balikin|kembali)\s+(.+)/i,
      /^return\s+(.+)/i,
      /^(.+)\s+(?:akan\s+)?dikembalikan/i,
    ],
    entityExtractors: [
      (text: string): Record<string, string> => {
        const m = text.match(/(?:kembalikan|balikin|return\s+)(.+)/i);
        return m ? { bookTitle: m[1].trim() } : {};
      },
    ],
    confidence: 0.85,
  },
  {
    intent: "RESERVE_BOOK",
    patterns: [
      /^(?:reservasi|pesan|booking)\s+(.+)/i,
      /^(?:saya\s+)?mau\s+(?:reservasi|pesan)\s+(.+)/i,
    ],
    entityExtractors: [
      (text: string): Record<string, string> => {
        const m = text.match(/(?:reservasi|pesan|booking\s+)(.+)/i);
        return m ? { bookTitle: m[1].trim() } : {};
      },
    ],
    confidence: 0.8,
  },
  {
    intent: "CHECK_LOANS",
    patterns: [
      /^(?:cek|lihat|tampilkan)\s+(?:pinjaman|saya\s+pinjam)/i,
      /^(?:pinjaman|loan)\s+saya/i,
      /^apa\s+(?:yang\s+)?saya\s+pinjam/i,
    ],
    confidence: 0.95,
  },
  {
    intent: "VIEW_PROFILE",
    patterns: [
      /^(?:lihat|buka|tampilkan)\s+profil/i,
      /^profil\s+saya/i,
      /^(?:siapa|who)\s+(?:saya|am\s+i)/i,
    ],
    confidence: 0.9,
  },
  {
    intent: "VIEW_NOTIFICATIONS",
    patterns: [
      /^(?:lihat|buka|tampilkan)\s+notif(ikasi)?/i,
      /^(?:ada\s+)?notif(ikasi)?\s+(?:baru|terbaru)/i,
    ],
    confidence: 0.9,
  },
  {
    intent: "OPEN_MENU",
    patterns: [
      /^(?:buka|tampilkan|pergi\s+ke)\s+(katalog|anggota|peminjaman|profil|pengaturan|dashboard)/i,
    ],
    entityExtractors: [
      (text: string): Record<string, string> => {
        const m = text.match(/(?:buka|tampilkan|pergi\s+ke)\s+(\w+)/i);
        return m ? { menuName: m[1].toLowerCase() } : {};
      },
    ],
    confidence: 0.85,
  },
  {
    intent: "HELP",
    patterns: [
      /^(?:help|bantu|tolong|apa\s+yang\s+bisa\s+dilakukan)/i,
      /^(?:how|apa)\s+(?:to|guna)/i,
    ],
    confidence: 0.95,
  },
];

// ===== Speech Recognition =====

export interface SpeechRecognitionConfig {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

const DEFAULT_CONFIG: SpeechRecognitionConfig = {
  lang: "id-ID",
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
};

/**
 * Check if browser supports Web Speech API.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/**
 * Create a speech recognition instance.
 */
export function createSpeechRecognition(
  config: Partial<SpeechRecognitionConfig> = {}
): any | null {
  if (typeof window === "undefined") return null;
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  recognition.lang = finalConfig.lang;
  recognition.continuous = finalConfig.continuous;
  recognition.interimResults = finalConfig.interimResults;
  recognition.maxAlternatives = finalConfig.maxAlternatives;

  return recognition;
}

// ===== Intent Parsing =====

/**
 * Parse a voice command text into a structured command.
 */
export function parseVoiceCommand(text: string): VoiceCommand {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Try each intent pattern
  for (const pattern of INTENT_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(trimmed) || regex.test(lower)) {
        const entities: VoiceCommand["entities"] = {};
        for (const extractor of pattern.entityExtractors || []) {
          Object.assign(entities, extractor(trimmed));
        }

        // Detect audience
        if (entities.topic) {
          if (/\b(?:untuk|for)\s+(?:anak|remaja|dewasa)\b/i.test(entities.topic)) {
            const m = entities.topic.match(/(?:untuk|for)\s+(\w+)/i);
            if (m) {
              entities.audience = m[1].toLowerCase();
              entities.topic = entities.topic.replace(/(?:untuk|for)\s+\w+/i, "").trim();
            }
          }
        }

        return {
          intent: pattern.intent,
          rawText: trimmed,
          entities,
          confidence: pattern.confidence,
          response: getResponseForIntent(pattern.intent, entities),
        };
      }
    }
  }

  // Fallback: treat as search
  return {
    intent: "UNKNOWN",
    rawText: trimmed,
    entities: {},
    confidence: 0.3,
    response: `Maaf, saya tidak mengerti "${trimmed}". Coba: "Cari buku persahabatan" atau "Pinjam Laskar Pelangi".`,
  };
}

/**
 * Generate friendly response for voice assistant.
 */
function getResponseForIntent(intent: VoiceIntent, entities: VoiceCommand["entities"]): string {
  switch (intent) {
    case "SEARCH_BOOK":
      return entities.topic
        ? `Mencari buku tentang ${entities.topic}...`
        : "Mencari buku...";
    case "BORROW_BOOK":
      return entities.bookTitle
        ? `Mencari buku "${entities.bookTitle}" untuk dipinjam...`
        : "Mau pinjam buku apa?";
    case "RETURN_BOOK":
      return entities.bookTitle
        ? `Mencatat pengembalian "${entities.bookTitle}"...`
        : "Buku apa yang mau dikembalikan?";
    case "RESERVE_BOOK":
      return entities.bookTitle
        ? `Mereservasi "${entities.bookTitle}"...`
        : "Buku apa yang mau direservasi?";
    case "CHECK_LOANS":
      return "Menampilkan daftar peminjaman Anda...";
    case "VIEW_PROFILE":
      return "Membuka profil Anda...";
    case "VIEW_NOTIFICATIONS":
      return "Menampilkan notifikasi terbaru...";
    case "OPEN_MENU":
      return entities.menuName
        ? `Membuka menu ${entities.menuName}...`
        : "Menu apa yang mau dibuka?";
    case "HELP":
      return "Anda bisa bilang: cari buku, pinjam [judul], kembalikan, atau buka profil.";
    default:
      return "Maaf, saya tidak mengerti. Coba lagi.";
  }
}

// ===== Voice Session =====

export interface VoiceSession {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
}

/**
 * Hook-friendly voice session manager.
 * (UI components use this in custom hook form)
 */
export function createVoiceSession(): {
  start: () => void;
  stop: () => void;
  onResult: (callback: (command: VoiceCommand) => void) => void;
  onError: (callback: (error: string) => void) => void;
} {
  let recognition: any = null;
  let resultCallback: ((cmd: VoiceCommand) => void) | null = null;
  let errorCallback: ((err: string) => void) | null = null;

  const start = () => {
    if (!isSpeechRecognitionSupported()) {
      errorCallback?.("Browser tidak mendukung voice recognition");
      return;
    }
    recognition = createSpeechRecognition();
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const command = parseVoiceCommand(transcript);
      resultCallback?.(command);
    };

    recognition.onerror = (event: any) => {
      errorCallback?.(event.error || "Unknown error");
    };

    recognition.start();
  };

  const stop = () => {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
  };

  return {
    start,
    stop,
    onResult: (cb) => { resultCallback = cb; },
    onError: (cb) => { errorCallback = cb; },
  };
}
