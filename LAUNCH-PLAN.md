# Perpustakaan Jendela Ilmu — Launch Readiness Plan

## Status Proyek

- **Framework**: Next.js 16.1.3 + React 19 + Tailwind + shadcn-style
- **Database**: SQLite (Prisma 6.19.3)
- **Auth**: JWT session cookie (`ji_session`)
- **Last Audit**: 24 Agustus 2026
- **Commits**: `bb6084d` → `c463eca` (10 critical fixes pushed)

---

## Fix Yang Sudah Selesai

| # | Fix | Commit |
|---|-----|--------|
| 1 | Auth cookie `sameSite: "lax"` + `credentials: "include"` | `bb6084d` |
| 2 | Null safety guards di 5 views (audit-log, book-transfer, circulation, loans, notification-log) | `bb6084d` |
| 3 | Missing `book` relation di `ReadingAssignment` Prisma schema | `bb6084d` |
| 4 | `db.session` → `db.activeSession` (model name mismatch) | `c463eca` |
| 5 | `db.twoFactorAuth` → `db.twoFactorSecret` (model name mismatch) | `c463eca` |
| 6 | Tambah model `LoginAttempt` + `GamificationProfile` di schema | `c463eca` |
| 7 | Card-queue race condition → `$transaction` | `c463eca` |
| 8 | Marketplace buy TOCTOU → balance check inside `$transaction` | `c463eca` |
| 9 | `barcode-labels-view` Rules of Hooks violation → pindah guard setelah hooks | `c463eca` |
| 10 | `api-keys-view` unguarded `JSON.parse` → tambah try-catch | `c463eca` |
| 11 | Logout invalidates session di DB | `c463eca` |
| 12 | Password change invalidates other sessions | `c463eca` |
| 13 | Disable DB query logging di production | `c463eca` |

---

## Temuan Audit Lengkap

### SECURITY (29 Issues)

#### CRITICAL
| # | Issue | File | Keterangan |
|---|-------|------|------------|
| S1 | JWT_SECRET placeholder | `.env` | `"ganti-dengan-string-acak..."` — harus diganti |
| S2 | CSRF protection tidak pernah dipanggil | `src/lib/csrf.ts` | Library ada tapi tidak ada route yang pakai |
| S3 | Voice webhooks tidak ada auth | `src/app/api/voice/google/route.ts` | Google/Alexa webhook tanpa signature check |
| S4 | RFID scan tidak ada session auth | `src/app/api/rfid/scan/route.ts` | Hanya API key, tidak ada session check |

#### HIGH
| # | Issue | File |
|---|-------|------|
| S5 | `secure` cookie hanya di production | `src/lib/auth.ts:57` |
| S6 | Error messages leak `err.message` | 6 files (reset-password, forgot-password, 2fa, cron) |
| S7 | Password minimum 6 karakter | `change-password`, `reset-password` |
| S8 | `dangerouslySetInnerHTML` di chat | `chat-assistant.tsx:206` |
| S9 | ~36 API routes missing try/catch | Multiple files |
| S10 | Rate limit bypass via X-Forwarded-For | `rate-limit.ts` |
| S11 | Health endpoint leak system metrics | `health/route.ts` |

#### MEDIUM
| # | Issue |
|---|-------|
| S12 | CSP `unsafe-inline` + `unsafe-eval` |
| S13 | Rate limiter in-memory (reset saat restart) |
| S14 | Logout tidak invalidate session di DB |
| S15 | Password change tidak invalidate other sessions |
| S16 | Backup code verification tidak constant-time |
| S17 | 2FA hanya untuk librarian, tidak untuk teacher/student |
| S18 | No email format validation |
| S19 | `any` type cast di auth code |

---

### API ROUTES (176 Routes)

| Status | Jumlah |
|--------|--------|
| Auth protected | 165 |
| Intentionally public | 9 |
| Missing auth (CRITICAL) | 1 |
| Missing try/catch | ~36 |
| Input validation issues | ~8 |
| Race conditions | 2 |

#### CRITICAL Race Conditions
| Route | Issue |
|-------|-------|
| `POST /api/card-queue` | Queue number `max + 1` tanpa atomic lock |
| `POST /api/marketplace/[id]/buy` | Balance check di luar `$transaction` (TOCTOU) |

---

### PRISMA SCHEMA (84 Models)

| Severity | Jumlah | Key Theme |
|----------|--------|-----------|
| CRITICAL | 6 | Missing models (LoginAttempt, GamificationProfile) + name mismatches |
| HIGH | 14 | Orphaned foreign keys (no `@relation`) |
| MEDIUM | 12 | Missing indexes, God model anti-pattern |
| LOW | 10 | Missing constraints, redundant indexes |

#### Missing Models (Fixed)
- `LoginAttempt` — audit trail login attempts
- `GamificationProfile` — poin & level siswa

#### Model Name Mismatches (Fixed)
- `db.session` → `db.activeSession`
- `db.twoFactorAuth` → `db.twoFactorSecret`

#### Orphaned Foreign Keys (Belum di-fix)
| Model | Field | Seharusnya |
|-------|-------|------------|
| `Loan` | `bookId` | `@relation` ke `Book` |
| `ConditionLog` | `reportedById` | `@relation` ke `User` |
| `ConditionLog` | `loanId` | `@relation` ke `Loan` |
| `StocktakingSession` | `createdById` | `@relation` ke `User` |
| `ApiKey` | `createdById` | `@relation` ke `User` |
| `AuditLogArchive` | `userId` | `@relation` ke `User` |
| `ErrorLog` | `userId`, `resolvedBy` | `@relation` ke `User` |
| `RFIDEvent` | `bookItemId`, `loanId` | `@relation` ke `BookItem`/`Loan` |
| `WhatsAppLog2` | `loanId`, `memberId` | `@relation` ke `Loan`/`Member` |
| `BookOfTheWeek` | `setBy` | `@relation` ke `User` |
| `CurriculumRecommendation` | `addedBy` | `@relation` ke `User` |
| `ReadingAssignment` | `assignedBy` | `@relation` ke `User` |
| `ExperimentAssignment` | `memberId`, `userId` | `@relation` ke `Member`/`User` |
| `AuditLogBlockchain` | `auditLogId`, `blockId` | `@relation` ke `AuditLog`/`AuditBlock` |
| `ChatConversation` | `userId` | `@relation` ke `User` |

#### Missing Indexes
| Model | Field | Query Pattern |
|-------|-------|---------------|
| `Loan` | `bookId` | "Show all loans for book X" |
| `BookItem` | `(status, bookId)` | "Find available items for book" |
| `BookListing` | `buyerId` | "Show books I bought" |
| `CardPrintQueue` | `memberId` | "Queue entries per member" |

---

### NEXT.JS CONFIG

| Severity | Issue | File |
|----------|-------|------|
| CRITICAL | `ignoreBuildErrors: true` | `next.config.ts:59` |
| CRITICAL | `.env` JWT_SECRET placeholder | `.env` |
| CRITICAL | `validateEnv()` tidak pernah dipanggil | `src/lib/env-validator.ts` |
| CRITICAL | `db.log: ['query']` di production | `src/lib/db.ts:10` |
| CRITICAL | SQLite untuk production | `prisma/schema.prisma` |
| HIGH | CSP `unsafe-inline` + `unsafe-eval` | `middleware.ts:47` |
| HIGH | Hardcoded `localhost:3001` fallback | `email.ts`, `whatsapp.ts` |
| HIGH | `allowedDevOrigins` ada raw IP | `next.config.ts:66` |
| MEDIUM | `noImplicitAny: false` | `tsconfig.json:13` |
| MEDIUM | `skipLibCheck: true` | `tsconfig.json:10` |
| MEDIUM | Build script pakai `cp -R` (Unix only) | `package.json:7` |
| MEDIUM | Start script pakai `bun` + `tee` | `package.json:8` |
| MEDIUM | `prisma` di dependencies bukan devDependencies | `package.json:82` |
| MEDIUM | Dual JWT: `next-auth` + `jose` | `package.json` |
| LOW | Tidak ada `engines` field | `package.json` |
| LOW | Logger output ke stdout, no file persistence | `logger.ts` |

---

### FRONTEND VIEWS

| Severity | File | Issue |
|----------|------|-------|
| CRITICAL | `barcode-labels-view.tsx:75` | Rules of Hooks — early return sebelum `useFetch` |
| CRITICAL | `api-keys-view.tsx:234` | `JSON.parse` tanpa try-catch |
| MEDIUM | `data-export-view.tsx:190` | `setState` saat render (bukan di `useEffect`) |
| MEDIUM | `data-export-view.tsx:260` | Stale closure di `handleQuickExport` |
| MEDIUM | `ebook-reader-view.tsx:55` | `selectedAttachment` di useEffect deps |
| LOW | `data-export-view.tsx:223` | `alert()` seharusnya `toast()` |
| LOW | `audit-log-view.tsx:141` | `alert()` seharusnya `toast()` |

---

## Plan Pengerjaan Bertahap

### FASE 1: PRE-LAUNCH CRITICAL (Minggu ini)

| # | Task | Estimasi | Status |
|---|------|----------|--------|
| F1.1 | Ganti JWT_SECRET dengan `openssl rand -base64 32` | 10 menit | ⬜ |
| F1.2 | Hapus `ignoreBuildErrors`, fix semua TypeScript errors | 2-4 jam | ⬜ |
| F1.3 | Tambah try/catch ke ~36 API routes yang missing | 3-4 jam | ⬜ |
| F1.4 | Sanitize error messages (ganti `err.message` dengan generic) | 1-2 jam | ⬜ |
| F1.5 | Tambah autentikasi ke voice webhooks | 1 jam | ⬜ |
| F1.6 | Jalankan `validateEnv()` saat startup | 30 menit | ⬜ |
| F1.7 | Password minimum 8 karakter (OWASP) | 30 menit | ⬜ |

### FASE 2: SECURITY HARDENING (Minggu 2)

| # | Task | Estimasi | Status |
|---|------|----------|--------|
| F2.1 | Enforce CSRF protection di semua mutating routes | 2-3 jam | ⬜ |
| F2.2 | Tambah orphaned foreign key relations di Prisma schema (~20 fields) | 2-3 jam | ⬜ |
| F2.3 | Tambah missing indexes di Prisma | 1 jam | ⬜ |
| F2.4 | Tambah `onDelete` handlers di kritikal relations | 1 jam | ⬜ |
| F2.5 | Rate limiter pakai persistent store (Redis/file-based) | 2 jam | ⬜ |
| F2.6 | Fix CSP headers — hapus `unsafe-eval` untuk production | 1 jam | ⬜ |
| F2.7 | Fix rate limit header `X-RateLimit-Limit` yang salah | 10 menit | ⬜ |

### FASE 3: DATA INTEGRITY (Minggu 3)

| # | Task | Estimasi | Status |
|---|------|----------|--------|
| F3.1 | Jalankan `prisma db push` di production database | 30 menit | ⬜ |
| F3.2 | Seed production data (admin, kategori, lokasi) | 1 jam | ⬜ |
| F3.3 | Test semua API endpoints di environment production-like | 2-3 jam | ⬜ |
| F3.4 | Backup strategy — otomatisasi SQLite backup atau migrasi PostgreSQL | 1-2 jam | ⬜ |

### FASE 4: FRONTEND POLISH (Minggu 4)

| # | Task | Estimasi | Status |
|---|------|----------|--------|
| F4.1 | Ganti `alert()` dengan `toast()` di 4 lokasi | 30 menit | ⬜ |
| F4.2 | Fix `setState` during render di `data-export-view.tsx` | 30 menit | ⬜ |
| F4.3 | Tambah React Error Boundaries di AppShell | 1 jam | ⬜ |
| F4.4 | Fix Permissions-Policy inconsistency (next.config vs middleware) | 15 menit | ⬜ |
| F4.5 | Hapus `next-auth` dependency kalau tidak dipakai | 10 menit | ⬜ |

### FASE 5: DEPLOYMENT PREP (Minggu 5)

| # | Task | Estimasi | Status |
|---|------|----------|--------|
| F5.1 | Pilih hosting (Vercel/Railway/VPS) dan setup | 2 jam | ⬜ |
| F5.2 | Setup domain & SSL | 1 jam | ⬜ |
| F5.3 | Konfigurasi env vars production (semua yang di `.env.example`) | 1 jam | ⬜ |
| F5.4 | Test end-to-end (login, sirkulasi, CRUD, semua role) | 2-3 jam | ⬜ |
| F5.5 | Load test (simultaneous logins, concurrent loans) | 1 jam | ⬜ |
| F5.6 | Setup monitoring & error tracking (Sentry/LogTail) | 1 jam | ⬜ |

### FASE 6: LAUNCH DAY

| # | Task | Estimasi | Status |
|---|------|----------|--------|
| F6.1 | Final build & deploy | 30 menit | ⬜ |
| F6.2 | Verify semua halaman dashboard pustakawan | 30 menit | ⬜ |
| F6.3 | Verify login untuk semua role (librarian, teacher, student) | 30 menit | ⬜ |
| F6.4 | Monitor error logs 1 jam pertama | 1 jam | ⬜ |

---

**Total estimasi: ~35-45 jam kerja (5-6 minggu)**

---

## Login Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| LIBRARIAN | pustakawan@jendelailmu.sch.id | password123 |
| TEACHER | budi@jendelailmu.sch.id | password123 |
| STUDENT | andini@jendelailmu.sch.id | password123 |

## Run Commands

```bash
# Development
npx next dev -p 3000

# Production build
npx next build && npx next start -p 3000

# Prisma
npx prisma db push --accept-data-loss
npx prisma generate

# Generate JWT secret
openssl rand -base64 32
```
