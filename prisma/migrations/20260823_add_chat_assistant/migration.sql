-- Migration: Add AI Chat Assistant
-- Tanggal: 23 Agustus 2026
--
-- Sprint F1: AI-powered customer service chatbot untuk siswa/guru.
-- Menambahkan 3 tabel:
-- 1. ChatConversation - Sesi percakapan per user
-- 2. ChatMessage - Individual messages dalam conversation
-- 3. ChatFAQ - Cached responses untuk pertanyaan yang sering ditanya
--
-- Use cases:
-- - Customer service otomatis (cek pinjaman, info poin, cari buku)
-- - Multi-turn conversation dengan memory
-- - Intent classification untuk analytics & routing
-- - Rate limiting per user
-- - Escalation ke pustakawan jika confidence rendah

-- =========================================================================
-- 1. ChatConversation — Sesi percakapan per user
-- =========================================================================
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "title" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WEB',
    "locale" TEXT NOT NULL DEFAULT 'id',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" DATETIME,
    "closedAt" DATETIME,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "userRating" INTEGER,
    "userFeedback" TEXT,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "ChatConversation_userId_createdAt_idx" ON "ChatConversation"("userId", "createdAt");
CREATE INDEX "ChatConversation_memberId_createdAt_idx" ON "ChatConversation"("memberId", "createdAt");
CREATE INDEX "ChatConversation_isActive_updatedAt_idx" ON "ChatConversation"("isActive", "updatedAt");
CREATE INDEX "ChatConversation_escalated_idx" ON "ChatConversation"("escalated");


-- =========================================================================
-- 2. ChatMessage — Individual messages dalam conversation
-- =========================================================================
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "confidence" REAL,
    "provider" TEXT,
    "model" TEXT,
    "tokens" INTEGER,
    "latencyMs" INTEGER,
    "sources" TEXT,
    "suggestedActions" TEXT,
    "isHelpful" BOOLEAN,
    "feedbackNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE
);

CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");
CREATE INDEX "ChatMessage_intent_idx" ON "ChatMessage"("intent");
CREATE INDEX "ChatMessage_role_idx" ON "ChatMessage"("role");


-- =========================================================================
-- 3. ChatFAQ — Cached FAQ responses
-- =========================================================================
CREATE TABLE "ChatFAQ" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'id',
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variations" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ChatFAQ_question_key" ON "ChatFAQ"("question");
CREATE INDEX "ChatFAQ_category_isActive_idx" ON "ChatFAQ"("category", "isActive");
CREATE INDEX "ChatFAQ_locale_isActive_idx" ON "ChatFAQ"("locale", "isActive");
