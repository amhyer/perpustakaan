-- Migration: Add Blockchain Audit Trail
-- Tanggal: 23 Agustus 2026
--
-- Sprint F5: Immutable hash-chained audit trail.
-- Menambahkan 2 tabel:
-- 1. AuditBlock - Hash-chained blocks of audit events
-- 2. AuditLogBlockchain - Track inclusion of audit logs in blocks
--
-- Plus: add blockId column to AuditLog for tracking

-- Add blockId to AuditLog
ALTER TABLE "AuditLog" ADD COLUMN "blockId" TEXT;
CREATE INDEX "AuditLog_blockId_idx" ON "AuditLog"("blockId");


-- =========================================================================
-- 1. AuditBlock — Hash-chained blocks
-- =========================================================================
CREATE TABLE "AuditBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "index" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "previousHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "firstEventId" TEXT,
    "lastEventId" TEXT,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "sealedBy" TEXT,
    "sealReason" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AuditBlock_index_key" ON "AuditBlock"("index");
CREATE UNIQUE INDEX "AuditBlock_hash_key" ON "AuditBlock"("hash");
CREATE INDEX "AuditBlock_timestamp_idx" ON "AuditBlock"("timestamp");


-- Add FK from AuditLog to AuditBlock
-- (Can't add FK constraint in ALTER after table creation in SQLite, but
--  Prisma will add it on generate. For now, just the column.)


-- =========================================================================
-- 2. AuditLogBlockchain — Track per-log inclusion
-- =========================================================================
CREATE TABLE "AuditLogBlockchain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditLogId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "merkleProof" TEXT NOT NULL,
    "leafHash" TEXT NOT NULL,
    "sealedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AuditLogBlockchain_auditLogId_key" ON "AuditLogBlockchain"("auditLogId");
CREATE INDEX "AuditLogBlockchain_blockId_idx" ON "AuditLogBlockchain"("blockId");
