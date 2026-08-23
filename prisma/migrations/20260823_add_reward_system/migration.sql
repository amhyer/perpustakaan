-- Migration: Add Reward System (Sistem Poin & Hadiah)
-- Tanggal: 23 Agustus 2026
--
-- Menambahkan 4 tabel:
-- 1. PointRule - Konfigurasi aturan poin (dikelola pustakawan)
-- 2. PointTransaction - Buku besar (ledger) semua transaksi poin
-- 3. Reward - Katalog hadiah
-- 4. RewardRedemption - Histori klaim hadiah
--
-- Back-relations:
-- - Member: pointTransactions, redemptions
-- - User: pointTransactionsAwarded, rewardsCreated, redemptionsApproved, redemptionsDelivered

-- =========================================================================
-- 1. PointRule — Konfigurasi Aturan Poin
-- =========================================================================
CREATE TABLE "PointRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxPerDay" INTEGER,
    "maxPerMonth" INTEGER,
    "cooldownHours" INTEGER,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "minLoanDays" INTEGER,
    "minBookPages" INTEGER,
    "requireReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Unique constraint untuk code (lookup by code)
CREATE UNIQUE INDEX "PointRule_code_key" ON "PointRule"("code");

-- Index untuk query yang sering: rule aktif by code
CREATE INDEX "PointRule_code_isActive_idx" ON "PointRule"("code", "isActive");

-- Index untuk filter rule by role
CREATE INDEX "PointRule_role_isActive_idx" ON "PointRule"("role", "isActive");


-- =========================================================================
-- 2. PointTransaction — Ledger Transaksi Poin
-- =========================================================================
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "sourceId" TEXT,
    "pointsConfigId" TEXT,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "rewardId" TEXT,
    "redemptionId" TEXT,
    "description" TEXT,
    "awardedById" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE,
    CONSTRAINT "PointTransaction_pointsConfigId_fkey" FOREIGN KEY ("pointsConfigId") REFERENCES "PointRule" ("id") ON DELETE SET NULL,
    CONSTRAINT "PointTransaction_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward" ("id") ON DELETE SET NULL,
    CONSTRAINT "PointTransaction_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "RewardRedemption" ("id") ON DELETE SET NULL,
    CONSTRAINT "PointTransaction_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User" ("id") ON DELETE SET NULL
);

-- Index untuk history per-member (paling sering dipakai)
CREATE INDEX "PointTransaction_memberId_createdAt_idx" ON "PointTransaction"("memberId", "createdAt");

-- Index untuk analytics by type
CREATE INDEX "PointTransaction_type_createdAt_idx" ON "PointTransaction"("type", "createdAt");

-- Index untuk idempotency check (anti-double-trigger)
CREATE INDEX "PointTransaction_source_sourceId_idx" ON "PointTransaction"("source", "sourceId");

-- Index untuk redemption lookup
CREATE INDEX "PointTransaction_redemptionId_idx" ON "PointTransaction"("redemptionId");

-- Index untuk expiry job (cron hapus poin expired)
CREATE INDEX "PointTransaction_expiresAt_idx" ON "PointTransaction"("expiresAt");


-- =========================================================================
-- 3. Reward — Katalog Hadiah
-- =========================================================================
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" TEXT NOT NULL,
    "pointCost" INTEGER NOT NULL,
    "minRole" TEXT NOT NULL DEFAULT 'STUDENT',
    "stock" INTEGER,
    "stockClaimed" INTEGER NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "maxPerMember" INTEGER,
    "cooldownDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reward_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT
);

-- Index untuk featured/active rewards (halaman utama)
CREATE INDEX "Reward_isActive_isFeatured_idx" ON "Reward"("isActive", "isFeatured");

-- Index untuk sorted listing
CREATE INDEX "Reward_isActive_sortOrder_idx" ON "Reward"("isActive", "sortOrder");

-- Index untuk filter by category
CREATE INDEX "Reward_category_idx" ON "Reward"("category");

-- Index untuk filter by role
CREATE INDEX "Reward_minRole_isActive_idx" ON "Reward"("minRole", "isActive");


-- =========================================================================
-- 4. RewardRedemption — Histori Klaim Hadiah
-- =========================================================================
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "rewardName" TEXT NOT NULL,
    "rewardCategory" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "pickupCode" TEXT NOT NULL,
    "deliveredAt" DATETIME,
    "deliveredById" TEXT,
    "deliveryNotes" TEXT,
    "memberNote" TEXT,
    "staffNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RewardRedemption_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE,
    CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward" ("id") ON DELETE RESTRICT,
    CONSTRAINT "RewardRedemption_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL,
    CONSTRAINT "RewardRedemption_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User" ("id") ON DELETE SET NULL
);

-- Unique constraint untuk pickupCode (saat scan harus unik)
CREATE UNIQUE INDEX "RewardRedemption_pickupCode_key" ON "RewardRedemption"("pickupCode");

-- Index untuk list redemption per-member
CREATE INDEX "RewardRedemption_memberId_status_idx" ON "RewardRedemption"("memberId", "status");
CREATE INDEX "RewardRedemption_memberId_createdAt_idx" ON "RewardRedemption"("memberId", "createdAt");

-- Index untuk approval queue (status filter)
CREATE INDEX "RewardRedemption_status_createdAt_idx" ON "RewardRedemption"("status", "createdAt");

-- Index untuk analytics by reward
CREATE INDEX "RewardRedemption_rewardId_idx" ON "RewardRedemption"("rewardId");

-- Index untuk audit (siapa approve apa)
CREATE INDEX "RewardRedemption_approvedById_idx" ON "RewardRedemption"("approvedById");
