# Changelog — Perpustakaan Jendela Ilmu

Semua perubahan penting didokumentasikan di sini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Project ini adhere ke [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — 2026-08-22

### ✨ Added (Tahap 22: Performance, Testing, Docs)

#### Testing Infrastructure
- **Vitest** setup dengan `vitest.config.ts`
- 14 test files, **~250 test cases**:
  - `rate-limit.test.ts` — anti-brute-force
  - `temp-token.test.ts` — JWT short-lived tokens
  - `two-factor.test.ts` — TOTP 2FA (generate, verify, backup codes)
  - `whatsapp.test.ts` — phone normalization + templates
  - `constants.test.ts` — formatters, date math, fine calculation
  - `api-auth.test.ts` — API key generation
  - `auth.test.ts` — RBAC helpers (isLibrarian, isFullLibrarian)
  - `client-error.test.ts` — browser error reporting
  - `loan-rules.test.ts` — holiday-aware due date calculator
  - `email.test.ts` — all email templates
  - `scheduler.test.ts` — smart reminder logic
  - `api-client.test.ts` — fetch wrapper
  - `error-tracker.test.ts` — error logging + wrapper
  - `cache.test.ts` — TTL cache layer
- Test scripts: `bun run test`, `test:watch`, `test:coverage`, `test:ui`
- `tests/setup.ts` — global test configuration
- `tests/README.md` — testing documentation

#### New Views (5)
- `api-keys-view.tsx` — API key management (pustakawan penuh)
  - Scope selector
  - Create / disable / delete keys
  - "Show once" dialog for new keys
- `my-sessions-view.tsx` — active session management
  - Device detection (mobile/tablet/desktop)
  - Browser detection
  - Force logout other devices
- `rooms-view.tsx` — library room + booking system
  - Date-based view
  - Booking form with overlap detection
  - Real-time availability
- `visitors-view.tsx` — visitor (buku tamu) management
  - Check-in / check-out
  - Auto-calculate visit duration
  - Stats & filters
- `assets-view.tsx` — non-book asset management
  - Category filter (AV, IT, Furniture, Other)
  - Condition & status tracking
  - Search by name/serial/brand

#### Performance Optimizations
- **Stats endpoint** rewritten to eliminate N+1 queries:
  - Trend 7 hari: 7 sequential queries → 1 groupBy
  - Popular books & top members: `Array.find` O(n*m) → `Map` O(1)
  - Category stats: scoped to last 30 days for relevance
- **Cache layer** (`src/lib/cache.ts`):
  - In-memory TTL cache with tag-based invalidation
  - Applied to `/api/categories` & `/api/locations` (5 min TTL)
  - `X-Cache: HIT/MISS` header for observability
- **Database indexes** added to Prisma schema:
  - `Member`: composite `(category, status)`, `(status, expiryDate)`, `joinDate`
  - `Loan`: composite `(status, dueDate)`, `loanDate`, `returnDate`, `bookItemId`
  - `Notification`: composite `(userId, isRead)`, `createdAt`
  - `Announcement`: composite `(isPinned, publishedAt)`, `publishedAt`
  - `Book`: `title`, `author`, `isbn` (for search)
  - `EmailLog`/`WhatsAppLog`: `(status, createdAt)`, `(category, createdAt)`

#### Documentation
- `DEVELOPER_GUIDE.md` — comprehensive developer guide
  - Tech stack overview
  - Setup & installation
  - Architecture explanation
  - Code conventions
  - Step-by-step "add new feature" tutorial
  - Testing guide
- `API_REFERENCE.md` — full REST API documentation
  - All 62+ endpoints documented
  - Auth requirements
  - Request/response examples
  - Error codes
  - Pagination format
- `DEPLOYMENT.md` — production deployment guide
  - 3 deployment options (VPS, Docker, Vercel)
  - Step-by-step setup
  - Backup & recovery
  - Monitoring
  - Troubleshooting
  - Cost estimation (Indonesia)

#### UI Integration
- Sidebar updated with new menu items (rooms, visitors, assets, api-keys, my-sessions)
- Header user menu added "Sesi Aktif" link
- ViewKey types extended in store

---

## [1.0.0] — 2026-08-22 (Milestone 1-5)

### ✨ Added — Critical Fixes (M1)

#### Security
- **Rate limiting** in-memory sliding window:
  - Login: 5 attempts/minute per IP
  - Forgot password: 3/5min
  - 2FA verify: 5/min
  - Upload: 30/min
- **2FA TOTP** (RFC 6238) for librarians:
  - QR code via `qrcode.react`
  - 8 backup codes (single-use)
  - SHA1, 30s window, 6 digits
- **Password reset** via email:
  - Hashed token (sha256)
  - 1-hour expiry
  - Single-use
  - Invalidates all active sessions
- **Active session tracking**:
  - `ActiveSession` table
  - Track device (user agent), IP
  - Force logout individual or all devices
- **Error tracking** (in-house Sentry-like):
  - `ErrorLog` table
  - Client + server error reporting
  - Levels: DEBUG, INFO, WARN, ERROR, FATAL
  - Mark as resolved

#### Email (Nodemailer + Gmail)
- Service with auto-logging
- 6 Bahasa Indonesia templates:
  - Password reset
  - Password changed
  - Due date reminder
  - Overdue notice
  - Welcome
  - Announcement broadcast
- HTML + plain text fallback
- Branding (logo, color, footer)

#### WhatsApp (Fonnte)
- Service with auto-logging
- 6 templates matching email
- Phone number normalization:
  - `08xx` → `628xx`
  - `+62xx` → `628xx`
  - `62xx` → `628xx`
  - `8xx` → `628xx`
- Batch sending with delay
- Per-message error handling

#### Multi-Channel Notification Service
- Orchestrator combining in-app + email + WhatsApp
- Per-channel enable/disable via Settings
- Best-effort: failure in one channel doesn't block others
- Settings: `notif_channel_in_app`, `notif_channel_email`, `notif_channel_whatsapp`

#### Frontend
- Login screen with 2FA + forgot password modes
- `/reset-password` page
- Settings → Security (2FA setup with QR + backup codes)
- Settings → Channels (email/WA toggle)
- `global-error.tsx` auto-reports errors

#### Database Schema (13 new models)
`TwoFactorSecret`, `PasswordResetToken`, `ActiveSession`, `ErrorLog`, `EmailLog`, `WhatsAppLog`, `LibraryRoom`, `RoomBooking`, `Visitor`, `Asset`, `AssetLoan`, `ApiKey`, `AuditLogArchive`

#### Dependencies
- `nodemailer ^6.9.15`
- `@types/nodemailer ^6.4.16`
- `otplib ^12.0.1`

---

### ✨ Added — Komunikasi Pintar (M2)

- **Smart reminder scheduler** (`src/lib/scheduler.ts`):
  - H-3, H-1, H+1, H+3, H+7 reminder intervals
  - Configurable via Settings: `reminder_pre_due_days`, `reminder_overdue_intervals`
  - Idempotent (no duplicate sends per day)
  - Multi-channel via notification service

---

### ✨ Added — Operasional (M3)

- **Library Room management**:
  - Room types: READING, DISCUSSION, AV, COMPUTER, OTHER
  - Capacity tracking
  - Soft delete (isActive)
- **Room booking system**:
  - Overlap detection
  - Auto-generates notifications
  - Calendar-based view
- **Asset management** (proyektor, laptop, etc.):
  - Categories: AV, IT, FURNITURE, OTHER
  - Serial number tracking
  - Condition (BAIK / RUSAK_RINGAN / RUSAK_BERAT)
  - Status (AVAILABLE / BORROWED / MAINTENANCE / LOST)
- **Asset loans**:
  - Auto-apply due date using loan rules
  - Multi-channel notifications
- **Visitor / Buku Tamu**:
  - Check-in / check-out
  - Auto-calculate visit duration
  - Walk-in support (no member required)
  - Statistics: total today, active, members, guests

---

### ✨ Added — Pelayanan & UX (M4)

- **PWA Support**:
  - `manifest.json` with shortcuts (Katalog, Pinjaman, Kartu)
  - Service worker (`sw.js`):
    - Network-first for pages
    - Stale-while-revalidate for assets
    - Push notification support (ready)
  - App icons (192/512 SVG)
  - `PwaInit` component
- **Executive Dashboard** (`executive-dashboard-view.tsx`):
  - KPI cards (collection, members, circulation, visitors)
  - 12-month trend chart (loans, members, visitors)
  - Top 5 books & members
  - Growth comparison
  - Alert cards for overdue
  - For school principals

---

### ✨ Added — Data & Integrasi (M5)

- **API Key system**:
  - SHA256 hashed storage
  - Prefixes: `ji_live_`, `ji_test_`
  - Scopes: `read:books`, `write:loans`, etc.
  - Auto-tracking of `lastUsedAt`
  - Generate / list / disable
- **API auth middleware** (`src/lib/api-auth.ts`):
  - `requireApiKey()` helper
  - Scope-based authorization
  - Wildcard scope `*` for full access

---

## [0.2.1] — Original Release

Initial commit `18dc49d` (Tahap 34-40):
- 22 model Prisma
- 28 view components
- 62+ API endpoint
- Full library management features
- 3 roles: LIBRARIAN, PUSTAKAWAN_JUNIOR, TEACHER, STUDENT
- Smart reminder, gamification, SIBI integration
- Built with Next.js 16 + Prisma 6 + SQLite

---

## 🗓️ Roadmap (Future)

### Short-term (1-2 minggu)
- [ ] PDF.js viewer for e-book attachments
- [ ] Label barcode generator (print labels A4)
- [ ] i18n activation (English + Indonesian)
- [ ] Onboarding wizard for new librarians

### Medium-term (1-2 bulan)
- [ ] Migrate to PostgreSQL for multi-instance
- [ ] Sentry/GlitchTip integration
- [ ] Playwright E2E tests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker Compose production setup

### Long-term (3+ bulan)
- [ ] Native Android/iOS app
- [ ] Microservices architecture
- [ ] WebSocket real-time updates
- [ ] AI-powered book recommendations
- [ ] Integration with academic systems (Raport online, dll)
- [ ] Multi-school support (b2b SaaS mode)

---

*Untuk detail lengkap lihat: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md), [API_REFERENCE.md](API_REFERENCE.md), [DEPLOYMENT.md](DEPLOYMENT.md)*
