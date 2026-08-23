-- Migration: Add IoT RFID System
-- Tanggal: 23 Agustus 2026
--
-- Sprint F4: RFID auto-checkout untuk perpustakaan sekolah.
-- Menambahkan 4 tabel:
-- 1. RFIDCard - Kartu RFID per member
-- 2. RFIDReader - Reader hardware yang terdaftar
-- 3. RFIDEvent - Log setiap tap/scan (immutable)
-- 4. BookItemTag - Tag RFID per eksemplar buku
--
-- Use cases:
-- - Auto check-in/out di pintu perpustakaan
-- - Self-service check-out
-- - Anti-theft detection
-- - Visitor counting

-- =========================================================================
-- 1. RFIDCard - Kartu RFID per member
-- =========================================================================
CREATE TABLE "RFIDCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uid" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "cardType" TEXT NOT NULL DEFAULT 'MEMBER',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RFIDCard_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "RFIDCard_uid_key" ON "RFIDCard"("uid");
CREATE INDEX "RFIDCard_memberId_isActive_idx" ON "RFIDCard"("memberId", "isActive");
CREATE INDEX "RFIDCard_uid_isActive_idx" ON "RFIDCard"("uid", "isActive");


-- =========================================================================
-- 2. RFIDReader - Reader hardware
-- =========================================================================
CREATE TABLE "RFIDReader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "model" TEXT,
    "firmware" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CHECKIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "beepOnSuccess" BOOLEAN NOT NULL DEFAULT true,
    "ledOnSuccess" TEXT NOT NULL DEFAULT 'GREEN',
    "beepOnError" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" DATETIME,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "batteryLevel" INTEGER,
    "apiKeyHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "RFIDReader_code_key" ON "RFIDReader"("code");
CREATE UNIQUE INDEX "RFIDReader_apiKeyHash_key" ON "RFIDReader"("apiKeyHash");
CREATE INDEX "RFIDReader_code_isActive_idx" ON "RFIDReader"("code", "isActive");
CREATE INDEX "RFIDReader_isOnline_idx" ON "RFIDReader"("isOnline");


-- =========================================================================
-- 3. RFIDEvent - Log events (immutable)
-- =========================================================================
CREATE TABLE "RFIDEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "readerId" TEXT NOT NULL,
    "cardId" TEXT,
    "uid" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "memberId" TEXT,
    "message" TEXT,
    "bookItemId" TEXT,
    "loanId" TEXT,
    "isDebounced" BOOLEAN NOT NULL DEFAULT false,
    "scannedAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "rawData" TEXT,
    CONSTRAINT "RFIDEvent_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "RFIDReader" ("id") ON DELETE CASCADE,
    CONSTRAINT "RFIDEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "RFIDCard" ("id") ON DELETE: SET NULL
);

CREATE INDEX "RFIDEvent_scannedAt_idx" ON "RFIDEvent"("scannedAt");
CREATE INDEX "RFIDEvent_memberId_scannedAt_idx" ON "RFIDEvent"("memberId", "scannedAt");
CREATE INDEX "RFIDEvent_eventType_status_idx" ON "RFIDEvent"("eventType", "status");
CREATE INDEX "RFIDEvent_readerId_scannedAt_idx" ON "RFIDEvent"("readerId", "scannedAt");


-- =========================================================================
-- 4. BookItemTag - RFID tag per eksemplar
-- =========================================================================
CREATE TABLE "BookItemTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookItemId" TEXT NOT NULL,
    "tagUid" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScannedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookItemTag_bookItemId_fkey" FOREIGN KEY ("bookItemId") REFERENCES "BookItem" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "BookItemTag_bookItemId_key" ON "BookItemTag"("bookItemId");
CREATE UNIQUE INDEX "BookItemTag_tagUid_key" ON "BookItemTag"("tagUid");
CREATE INDEX "BookItemTag_tagUid_isActive_idx" ON "BookItemTag"("tagUid", "isActive");
