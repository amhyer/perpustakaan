-- Migration: Add PushSubscription, ExperimentAssignment, Recommendation
-- Tanggal: 23 Agustus 2026

-- =========================================================================
-- 1. PushSubscription - Web Push API subscriptions
-- =========================================================================
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");
CREATE INDEX "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");


-- =========================================================================
-- 2. ExperimentAssignment - A/B testing
-- =========================================================================
CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "experimentKey" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "memberId" TEXT,
    "userId" TEXT,
    "classGrade" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT
);

-- Unique: satu assignment per (experiment, member)
CREATE UNIQUE INDEX "ExperimentAssignment_experimentKey_memberId_key" ON "ExperimentAssignment"("experimentKey", "memberId");

-- Index untuk query
CREATE INDEX "ExperimentAssignment_experimentKey_variant_idx" ON "ExperimentAssignment"("experimentKey", "variant");
CREATE INDEX "ExperimentAssignment_memberId_idx" ON "ExperimentAssignment"("memberId");


-- =========================================================================
-- 3. Recommendation - ML-based book recommendations cache
-- =========================================================================
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE,
    CONSTRAINT "Recommendation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE
);

-- Unique: satu rekomendasi per (member, book)
CREATE UNIQUE INDEX "Recommendation_memberId_bookId_key" ON "Recommendation"("memberId", "bookId");

-- Index untuk query top N
CREATE INDEX "Recommendation_memberId_rank_idx" ON "Recommendation"("memberId", "rank");
