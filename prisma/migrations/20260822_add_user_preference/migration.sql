-- Migration: Add UserPreference table (Sprint 4 — Fix #9)
-- Menyimpan preferensi per-user seperti default dashboard pilihan user.
-- Dipisah dari Setting (global) karena preferensi unik per user.

CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "defaultDashboard" TEXT NOT NULL DEFAULT 'default',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_key" UNIQUE ("userId"),
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");
