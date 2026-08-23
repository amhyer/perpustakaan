-- Migration: Add SemesterArchive & NotificationSchedule
-- Tanggal: 23 Agustus 2026
--
-- Menambahkan 2 tabel baru:
-- 1. SemesterArchive - Snapshot leaderboard per periode akademik
-- 2. NotificationSchedule - Konfigurasi notifikasi berkala

-- =========================================================================
-- 1. SemesterArchive
-- =========================================================================
CREATE TABLE "SemesterArchive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodName" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "rankings" TEXT NOT NULL,
    "totalMembers" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: satu periode per tipe
CREATE UNIQUE INDEX "SemesterArchive_periodName_periodType_key" ON "SemesterArchive"("periodName", "periodType");

-- Index untuk query by period
CREATE INDEX "SemesterArchive_periodType_startDate_idx" ON "SemesterArchive"("periodType", "startDate");
CREATE INDEX "SemesterArchive_archivedAt_idx" ON "SemesterArchive"("archivedAt");


-- =========================================================================
-- 2. NotificationSchedule
-- =========================================================================
CREATE TABLE "NotificationSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "hour" INTEGER NOT NULL DEFAULT 8,
    "templateKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "lastRunStatus" TEXT,
    "lastRunCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Index untuk scheduler job: cari enabled schedule by type
CREATE INDEX "NotificationSchedule_enabled_type_idx" ON "NotificationSchedule"("enabled", "type");
