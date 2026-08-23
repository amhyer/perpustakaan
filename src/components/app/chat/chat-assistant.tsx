"use client";

/**
 * Chat Assistant — Floating AI customer service widget.
 *
 * Features:
 * - Floating button di bottom-right (kecuali di mobile, tetap accessible)
 * - Expandable chat panel dengan conversation history
 * - Markdown-like formatting (bold, bullets, code)
 * - Quick reply suggestions
 * - Thumbs up/down feedback per message
 * - Star rating saat close conversation
 * - Multi-language (id, en, ar) via useLocale
 * - Accessibility: ARIA labels, keyboard navigation, focus management
 * - Connection status indicator (online/offline)
 *
 * Pakai:
 *   <ChatAssistant />
 *
 * Props:
 *   - position: "bottom-right" | "bottom-left" (default: "bottom-right")
 *   - autoOpen: boolean (default: false)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Star,
  Minimize2,
  AlertCircle,
  ExternalLink,
  History,
  RefreshCw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { useAppStore } from "@/store/use-app-store";

// ===== Types =====

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  confidence?: number;
  createdAt: string;
  isHelpful?: boolean | null;
  isPending?: boolean;
  error?: string;
}

interface SuggestedAction {
  action: string;
  label: string;
  params?: Record<string, string>;
}

interface ChatResponse {
  conversationId: string;
  userMessageId: string;
  assistantMessage: string;
  intent: string;
  confidence: number;
  provider: string;
  model: string;
  tokens: number;
  latencyMs: number;
  fromCache: boolean;
  shouldEscalate: boolean;
  suggestedActions?: SuggestedAction[];
}

interface ChatAssistantProps {
  position?: "bottom-right" | "bottom-left";
  autoOpen?: boolean;
}

// ===== i18n strings =====

const STRINGS = {
  id: {
    title: "Jendela Assistant",
    subtitle: "Asisten perpustakaan AI",
    placeholder: "Tanya tentang buku, pinjaman, poin...",
    send: "Kirim",
    newChat: "Chat Baru",
    history: "Riwayat",
    online: "Online",
    typing: "Sedang mengetik...",
    rateLimitTitle: "Terlalu banyak pesan",
    rateLimitBody: "Tunggu sebentar sebelum kirim lagi.",
    escalate: "Bicara dengan pustakawan",
    helpful: "Membantu",
    notHelpful: "Tidak membantu",
    rateConversation: "Beri rating",
    rateThanks: "Terima kasih atas feedbacknya!",
    escalateNotice: "Pertanyaan kamu akan diteruskan ke pustakawan untuk jawaban lebih lengkap.",
    quickReplies: "Pertanyaan Cepat",
    quickRepliesList: [
      "Jam buka perpustakaan?",
      "Cara pinjam buku?",
      "Cara daftar anggota?",
      "Berapa poin saya?",
    ],
    welcome: "Halo! 👋 Saya Jendela, asisten perpustakaan. Ada yang bisa saya bantu?",
    loadError: "Gagal mengirim pesan. Coba lagi.",
    closeChat: "Tutup chat",
    minimize: "Kecilkan",
    open: "Buka chat",
    copy: "Salin",
    copied: "Disalin!",
    navAction: "Buka",
    errorGeneric: "Maaf, ada masalah. Coba lagi nanti.",
  },
  en: {
    title: "Jendela Assistant",
    subtitle: "AI library assistant",
    placeholder: "Ask about books, loans, points...",
    send: "Send",
    newChat: "New Chat",
    history: "History",
    online: "Online",
    typing: "Typing...",
    rateLimitTitle: "Too many messages",
    rateLimitBody: "Please wait before sending again.",
    escalate: "Talk to a librarian",
    helpful: "Helpful",
    notHelpful: "Not helpful",
    rateConversation: "Rate this chat",
    rateThanks: "Thanks for your feedback!",
    escalateNotice: "Your question will be forwarded to a librarian for a more complete answer.",
    quickReplies: "Quick Questions",
    quickRepliesList: [
      "Library hours?",
      "How to borrow a book?",
      "How to register as member?",
      "What's my point balance?",
    ],
    welcome: "Hello! 👋 I'm Jendela, your library assistant. How can I help?",
    loadError: "Failed to send message. Try again.",
    closeChat: "Close chat",
    minimize: "Minimize",
    open: "Open chat",
    copy: "Copy",
    copied: "Copied!",
    navAction: "Open",
    errorGeneric: "Sorry, something went wrong. Try again later.",
  },
  ar: {
    title: "مساعد Jendela",
    subtitle: "مساعد المكتبة الذكي",
    placeholder: "اسأل عن الكتب أو الإعارة أو النقاط...",
    send: "إرسال",
    newChat: "محادثة جديدة",
    history: "السجل",
    online: "متصل",
    typing: "يكتب...",
    rateLimitTitle: "رسائل كثيرة جداً",
    rateLimitBody: "يرجى الانتظار قبل الإرسال مرة أخرى.",
    escalate: "تحدث إلى أمين المكتبة",
    helpful: "مفيد",
    notHelpful: "غير مفيد",
    rateConversation: "قيّم هذه المحادثة",
    rateThanks: "شكراً على ملاحظاتك!",
    escalateNotice: "سيتم توجيه سؤالك إلى أمين المكتبة للحصول على إجابة أكثر اكتمالاً.",
    quickReplies: "أسئلة سريعة",
    quickRepliesList: [
      "ساعات عمل المكتبة؟",
      "كيف أستعير كتاباً؟",
      "كيف أسجل كعضو؟",
      "كم رصيد نقاطي؟",
    ],
    welcome: "مرحباً! 👋 أنا Jendela، مساعدك في المكتبة. كيف يمكنني مساعدتك؟",
    loadError: "فشل إرسال الرسالة. حاول مرة أخرى.",
    closeChat: "إغلاق الدردشة",
    minimize: "تصغير",
    open: "فتح الدردشة",
    copy: "نسخ",
    copied: "تم النسخ!",
    navAction: "فتح",
    errorGeneric: "عذراً، حدث خطأ. حاول مرة أخرى لاحقاً.",
  },
};

// ===== Simple markdown renderer =====
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    // Bold
    if (line.match(/^\s*-\s+/) || line.match(/^\s*\*\s+/)) {
      const content = line.replace(/^\s*[-*]\s+/, "");
      elements.push(
        <div key={idx} className="flex gap-2 ml-2 my-0.5">
          <span className="text-current opacity-60">•</span>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(content) }} />
        </div>
      );
    } else if (line.match(/^\d+\.\s+/)) {
      const match = line.match(/^(\d+)\.\s+(.*)/);
      if (match) {
        elements.push(
          <div key={idx} className="flex gap-2 ml-2 my-0.5">
            <span className="text-current opacity-60 font-semibold">{match[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: inlineFormat(match[2]) }} />
          </div>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={idx} className="h-2" />);
    } else {
      elements.push(
        <p key={idx} className="my-1" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
  });

  return <>{elements}</>;
}

function inlineFormat(text: string): string {
  // Escape HTML
  let s = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
  // Italic
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-black/10 rounded text-xs font-mono">$1</code>');

  return s;
}

// ===== Main Component =====

export function ChatAssistant({ position = "bottom-right", autoOpen = false }: ChatAssistantProps) {
  const { locale, setLocale } = useLocale();
  const setView = useAppStore((s) => s.setView);
  const t = STRINGS[locale as keyof typeof STRINGS] || STRINGS.id;

  const [isOpen, setIsOpen] = useState(autoOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ resetIn: number } | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [submittedRating, setSubmittedRating] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: t.welcome,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, locale]);

  // Load conversation history from API
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      return data.items || [];
    } catch {
      return [];
    }
  }, []);

  // Load specific conversation
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages`);
      if (!res.ok) return false;
      const data = await res.json();
      const items: ChatMessage[] = (data.items || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        intent: m.intent,
        confidence: m.confidence,
        createdAt: m.createdAt,
        isHelpful: m.isHelpful,
      }));
      setMessages(items);
      setConversationId(id);
      setShowHistory(false);
      setShowRating(false);
      setSubmittedRating(false);
      setEscalated(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text || input).trim();
      if (!content || isLoading) return;

      setError(null);
      setInput("");
      setShowRating(false);

      // Optimistic add user message
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        isPending: true,
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId,
            locale,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (errData.code === "RATE_LIMIT") {
            setRateLimitInfo({ resetIn: 5 });
            throw new Error(t.rateLimitBody);
          }
          throw new Error(errData.error || t.loadError);
        }

        const data: ChatResponse = await res.json();

        // Replace temp message with real one
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          {
            id: data.userMessageId,
            role: "user",
            content,
            createdAt: new Date().toISOString(),
          },
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.assistantMessage,
            intent: data.intent,
            confidence: data.confidence,
            createdAt: new Date().toISOString(),
          },
        ]);

        setConversationId(data.conversationId);
        if (data.shouldEscalate) {
          setEscalated(true);
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempUserMsg.id
              ? { ...m, error: err instanceof Error ? err.message : t.errorGeneric }
              : m
          )
        );
        setError(err instanceof Error ? err.message : t.errorGeneric);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, conversationId, locale, t]
  );

  // Save feedback (thumbs up/down)
  const handleFeedback = useCallback(
    async (messageId: string, isHelpful: boolean) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isHelpful } : m))
      );
      try {
        await fetch(`/api/chat/messages/${messageId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHelpful }),
        });
      } catch {
        // ignore
      }
    },
    []
  );

  // Submit conversation rating
  const submitRating = useCallback(
    async (rating: number) => {
      if (!conversationId) {
        // Just close locally
        setShowRating(false);
        setSubmittedRating(true);
        return;
      }
      try {
        await fetch(`/api/chat/conversations/${conversationId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        });
        setShowRating(false);
        setSubmittedRating(true);
      } catch {
        setShowRating(false);
      }
    },
    [conversationId]
  );

  // Start new chat
  const startNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content: t.welcome,
        createdAt: new Date().toISOString(),
      },
    ]);
    setShowHistory(false);
    setShowRating(false);
    setSubmittedRating(false);
    setEscalated(false);
    setError(null);
  }, [t.welcome]);

  // Close & rate
  const handleClose = useCallback(async () => {
    if (messages.length > 2 && !submittedRating) {
      setShowRating(true);
      return;
    }
    setIsOpen(false);
  }, [messages.length, submittedRating]);

  // Handle action button click
  const handleAction = useCallback(
    (action: SuggestedAction) => {
      if (action.action === "navigate" && action.params?.view) {
        setView(action.params.view as any, action.params);
        setIsOpen(false);
      }
    },
    [setView]
  );

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Position classes
  const positionClass = position === "bottom-left" ? "left-4 sm:left-6" : "right-4 sm:right-6";

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 sm:bottom-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "flex items-center justify-center transition-all hover:scale-110",
          "focus:outline-none focus:ring-4 focus:ring-primary/30",
          positionClass
        )}
        aria-label={t.open}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={cn(
          "fixed bottom-4 sm:bottom-6 z-50 px-4 py-3 rounded-full shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "flex items-center gap-2 transition-all",
          positionClass
        )}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-medium">{t.title}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 sm:bottom-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-[calc(100vw-2rem)]",
        "h-[600px] max-h-[calc(100vh-8rem)] flex flex-col",
        "bg-background border rounded-2xl shadow-2xl",
        "animate-in slide-in-from-bottom-4 duration-200",
        positionClass
      )}
      role="dialog"
      aria-label={t.title}
      dir={(locale as string) === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t.title}</h3>
            <p className="text-xs opacity-80">{t.subtitle} · {t.online}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 hover:bg-white/20 rounded"
            aria-label={t.history}
            title={t.history}
          >
            <History className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-white/20 rounded"
            aria-label={t.minimize}
            title={t.minimize}
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/20 rounded"
            aria-label={t.closeChat}
            title={t.closeChat}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory ? (
        <HistoryPanel
          onSelect={(id) => {
            loadConversation(id);
          }}
          onNew={startNewChat}
          t={t}
          locale={locale}
        />
      ) : (
        <>
          {/* Escalation Notice */}
          {escalated && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t.escalateNotice}</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onFeedback={handleFeedback}
                onAction={handleAction}
                t={t}
                locale={locale}
              />
            ))}

            {isLoading && (
              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.typing}</span>
              </div>
            )}

            {/* Quick replies (only if first assistant message) */}
            {messages.length === 1 && messages[0].role === "assistant" && !isLoading && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t.quickReplies}</p>
                <div className="flex flex-wrap gap-2">
                  {t.quickRepliesList.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rate limit warning */}
            {rateLimitInfo && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <strong>{t.rateLimitTitle}:</strong> {t.rateLimitBody} ({rateLimitInfo.resetIn}m)
              </div>
            )}

            {/* Rating panel */}
            {showRating && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">{t.rateConversation}</p>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => submitRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                      aria-label={`${star} stars`}
                    >
                      <Star className="h-6 w-6 text-amber-400 fill-amber-400 hover:text-amber-500" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowRating(false);
                    setIsOpen(false);
                  }}
                  className="text-xs text-muted-foreground hover:underline w-full text-center"
                >
                  Skip
                </button>
              </div>
            )}

            {submittedRating && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{t.rateThanks}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder}
                rows={1}
                disabled={isLoading || !!rateLimitInfo}
                className={cn(
                  "flex-1 resize-none px-3 py-2 border rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "max-h-24 text-sm"
                )}
                aria-label={t.placeholder}
              />
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label={t.send}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ===== Sub-components =====

function MessageBubble({
  message,
  onFeedback,
  onAction,
  t,
  locale,
}: {
  message: ChatMessage;
  onFeedback: (id: string, isHelpful: boolean) => void;
  onAction: (action: SuggestedAction) => void;
  t: typeof STRINGS.id;
  locale: string;
}) {
  const isUser = message.role === "user";

  if (message.error) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] p-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
          {message.error}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className="flex-1 max-w-[85%] space-y-1">
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-muted"
          )}
        >
          {renderMarkdown(message.content)}
        </div>

        {/* Feedback buttons for assistant messages */}
        {!isUser && message.id !== "welcome" && message.id !== "welcome-new" && (
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => onFeedback(message.id, true)}
              className={cn(
                "p-1 rounded hover:bg-muted transition-colors",
                message.isHelpful === true && "text-green-600"
              )}
              aria-label={t.helpful}
              title={t.helpful}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onFeedback(message.id, false)}
              className={cn(
                "p-1 rounded hover:bg-muted transition-colors",
                message.isHelpful === false && "text-red-600"
              )}
              aria-label={t.notHelpful}
              title={t.notHelpful}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-primary-foreground text-xs font-medium">
          U
        </div>
      )}
    </div>
  );
}

function HistoryPanel({
  onSelect,
  onNew,
  t,
  locale,
}: {
  onSelect: (id: string) => void;
  onNew: () => void;
  t: typeof STRINGS.id;
  locale: string;
}) {
  const [conversations, setConversations] = useState<
    { id: string; title: string; messageCount: number; updatedAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chat/conversations?limit=20")
      .then((r) => r.json())
      .then((d) => setConversations(d.items || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t.history}</h3>
        <Button size="sm" variant="outline" onClick={onNew}>
          <RefreshCw className="h-3 w-3 mr-1" />
          {t.newChat}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Belum ada riwayat chat
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="text-sm font-medium line-clamp-1">{c.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {c.messageCount} pesan · {new Date(c.updatedAt).toLocaleDateString(locale === "id" ? "id-ID" : locale)}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
