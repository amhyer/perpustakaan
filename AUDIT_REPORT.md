# 🔍 Audit Report — Perpustakaan Jendela Ilmu

**Tanggal:** 23 Agustus 2026
**Branch:** `arena/01a0285b-perpustakaan`
**Versi:** 0.2.1
**Status:** Dev server berjalan (HTTP 200), tapi Prisma client belum ter-generate (sandbox limitation)

> **Catatan metodologi:** Audit ini dilakukan terhadap *kode yang ada di repository*, bukan terhadap runtime behavior (karena Prisma client tidak bisa di-generate di sandbox ini). Beberapa item diverifikasi via static analysis & inspeksi kode.

---

## 📊 Ringkasan Eksekutif

| Kategori | Temuan | Severity Tertinggi |
|---|---|---|
| 🔴 **CRITICAL** | 6 | Login tidak bisa jalan (network limit) |
| 🟠 **HIGH** | 11 | Bundle bengkak, 0 server components |
| 🟡 **MEDIUM** | 18 | Validasi input manual, file terlalu besar |
| 🔵 **LOW** | 14 | TODO, console.log, preferensi |
| **Total** | **49** | |

**Skor Kesiapan Produksi: 5.5/10** (Logic & fitur solid, tapi tooling & deployment masih lemah)

### Statistik Proyek

- **Total file TS/TSX:** 319
- **API routes:** 92 (75 dilindungi auth)
- **Models database:** 37 (Prisma schema)
- **Test files:** 31 unit + 6 E2E + 7 Storybook stories
- **Dokumentasi:** 12 file `.md` (4.192 baris)
- **Dependencies:** 75 production + 16 dev

---

## 🔴 CRITICAL (Harus Diperbaiki Sebelum Production)

### C-1. Prisma Client Tidak Bisa di-Generate di Sandbox Ini
**File:** `prisma/schema.prisma` (37 model)
**Masalah:** `binaries.prisma.sh` hanya resolve ke IPv6 (`2606:4700:10::`), sandbox ini IPv4-only. `prisma generate` gagal.
**Dampak:** Login/logout, semua query DB, seed — semua return HTTP 500.
**Solusi:**
- **Jangka pendek (sandbox):** Buat Prisma mock client di `src/lib/db.ts` yang return null/error, atau generate Prisma di mesin yang punya akses.
- **Jangka panjang:** Self-host engine binaries via CDN yang reachable (Cloudflare R2 mirror, GitHub release asset), atau migrasi ke Prisma 7.x yang bundle WASM (78MB unpacked).

### C-2. Tidak Ada CI/CD Workflow Aktif
**File:** `.github/workflows/` → tidak ada (hanya `workflows-backup/`)
**Masalah:** `.github/workflows-backup/ci.yml` ada tapi di-backup, tidak aktif. Dependabot ada, tapi tidak ada pipeline untuk lint, test, typecheck, build.
**Dampak:** Bug & regression tidak tertangkap otomatis sebelum merge.
**Solusi:** Restore `.github/workflows-backup/ci.yml` ke `.github/workflows/ci.yml` (review dulu — pakai `bun install`, perlu disesuaikan kalau mau pakai `npm`).

### C-3. `.env` Ter-commit dengan JWT_SECRET Dev
**File:** `.env`
**Masalah:** Berisi:
```
JWT_SECRET="dev-jwt-secret-for-sandbox-only-32-chars-min-aaaaa"
```
File ini **seharusnya tidak pernah di-commit** (.gitignore pun punya `.env*`). Ini development secret yang lemah.
**Dampak:** Kalau ter-push ke public repo, attacker bisa forge JWT session. **SEGERA revoke secret ini.**
**Solusi:**
1. Hapus `.env` dari git history (`git rm --cached .env`)
2. Generate secret baru: `openssl rand -base64 32`
3. Buat `.env.example` dengan placeholder
4. Pastikan `.env*` di .gitignore sudah benar (sudah)

### C-4. `start` Script Pakai `bun` (Tidak Tersedia di Sandbox)
**File:** `package.json` line 11
```json
"start": "NODE_ENV=production bun .next/standalone/server.js 2>&1 | tee server.log"
```
**Dampak:** Production start command gagal di environment tanpa bun.
**Solusi:** Ganti ke `node`:
```json
"start": "NODE_ENV=production node .next/standalone/server.js 2>&1 | tee server.log"
```

### C-5. Tidak Ada Dockerfile
**File:** N/A
**Masalah:** Proyek punya DEPLOYMENT.md yang merekomendasikan Docker (Option B), tapi tidak ada Dockerfile. Hanya Caddyfile.
**Dampak:** Deployment ke VPS harus setup Node.js manual (fragile, tidak reproducible).
**Solusi:** Buat multi-stage Dockerfile:
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=deps /app/.next/standalone ./
COPY --from=deps /app/.next/static ./.next/static
COPY --from=deps /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### C-6. Default `.env.example` Tidak Ada
**File:** N/A
**Masalah:** README, DEPLOYMENT sebut env vars tapi tidak ada template. Developer baru harus baca source code untuk tahu env apa saja yang dibutuhkan.
**Solusi:** Buat `.env.example`:
```bash
# Auth
JWT_SECRET=                    # openssl rand -base64 32
CRON_SECRET=                   # openssl rand -base64 32

# Database
DATABASE_URL="file:./prisma/db/custom.db"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PORT=3000
NODE_ENV=development

# Uploads
UPLOAD_DIR=                    # path absolut writable untuk production

# Email (opsional)
GMAIL_USER=
GMAIL_APP_PASSWORD=

# WhatsApp (opsional)
FONNTE_TOKEN=

# Logging
LOG_LEVEL=DEBUG
```

---

## 🟠 HIGH (Signifikan, Tidak Blocker Production)

### H-1. Zero Server Components — Semua "use client"
**Statistik:** 122 file dengan `"use client"`, **0 file dengan `"use server"`**
**Masalah:** `src/app/page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx` semuanya client. Padahal Next.js 15+ App Router best practice: pisahkan server & client components.
**Dampak:**
- Initial page load butuh JS untuk render (LCP lambat)
- SEO tidak optimal (search engine cuma lihat loading spinner)
- Bandwidth lebih besar

**Solusi:** Refactor bertahap — pisahkan data fetching (server) dari interactivity (client). Contoh: `page.tsx` → server component yang fetch `getCurrentUser()`, lalu pass ke `<PageClient user={...} />`.

### H-2. File View Terlalu Besar (Monolith Anti-pattern)
**File terbesar:**
| File | Baris |
|---|---|
| `src/components/app/views/circulation-view.tsx` | **1.467** |
| `src/components/app/views/settings-view.tsx` | **1.373** |
| `src/components/app/views/book-form-view.tsx` | **1.205** |
| `src/components/app/views/book-detail-view.tsx` | **1.204** |
| `src/components/app/views/member-detail-view.tsx` | **1.065** |
| `src/components/app/views/members-view.tsx` | **939** |
| `src/components/app/views/my-dashboard-view.tsx` | **898** |
| `src/components/app/views/reports-view.tsx` | **818** |

**Total views:** 22.131 baris dalam 40+ file.

**Dampak:**
- Sulit di-maintain (merge conflict, code review lambat)
- Bundle size besar (semua di-import eagerly di `views/index.tsx`)
- Code splitting tidak efektif

**Solusi:**
1. Pecah view besar jadi sub-components: `<SettingsView>` → `<SettingsIdentity>`, `<SettingsRules>`, `<SettingsHolidays>`, `<SettingsHolidaysForm>`
2. Extract business logic ke custom hooks: `useSettingsForm()`, `useHolidays()`
3. Move static data ke `lib/`

### H-3. Tidak Pakai `next/image` — Semua `<img>` Murni
**Statistik:** 0 import dari `next/image`
**Masalah:** Logo dan semua image dirender via `<img>` tag atau inline SVG. Walau `next.config.ts` sudah konfigurasi image optimization (`formats: ['image/avif', 'image/webp']`), tidak ada yang memanfaatkannya.
**Dampak:** No automatic format conversion, no lazy loading, no responsive sizes.
**Solusi:** Ganti semua `<img src=...>` dengan `<Image src={...} width={...} height={...} alt={...} />`. Untuk SVG (Logo), tidak perlu (SVG sudah optimal).

### H-4. Validasi Input Manual, Tanpa Schema Validator
**Statistik:** 51 API route pakai `await req.json()`, **0 pakai zod/yup/joi**
**Masalah:** Validasi di setiap route manual: `if (!email || !password) return 400`. Rawan inkonsistensi, type tidak jelas, mudah lupa validasi edge case.
**Dampak:** Risiko data corruption, inconsistent error messages.
**Solusi:** Tambah zod (sudah ada `@hookform/resolvers` yang butuh zod peer):
```ts
const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});
const body = LoginSchema.parse(await req.json());
```
Buat `src/lib/validators/*.ts` per resource.

### H-5. Type Cast `any` Berlebihan (68 occurrences)
**Statistik:** 68 `as any` atau `: any` di non-test files
**Contoh:** `grep ": any\|as any" src/` → 68 hits.
**Masalah:** TypeScript `strict: true` tapi `noImplicitAny: false` + widespread `any` cast → TypeScript safety tidak berlaku efektif.
**Solusi:**
1. Enable `noImplicitAny: true` di `tsconfig.json`
2. Ganti `any` dengan `unknown` lalu narrow dengan type guard
3. Untuk Prisma types yang generik, pakai `Prisma.UserGetPayload<{...}>`

### H-6. Logger Hanya di 6 dari 92 API Route
**Statistik:** 6 routes pakai `logger`, 36 punya `try/catch` tapi tanpa log
**Masalah:** Library `src/lib/logger.ts` sudah bagus (JSON output, levels, request context), tapi tidak dipakai konsisten. Error di-silent atau cuma `console.error`.
**Dampak:** Debugging production susah, tidak ada audit trail untuk error.
**Solusi:** Wrap semua API route dengan helper:
```ts
import { withErrorHandler } from "@/lib/error-handler";
export const POST = withErrorHandler(async (req) => { ... });
```

### H-7. Tidak Ada Error Handler Utility Sentral
**Masalah:** Setiap route punya boilerplate `try { ... } catch (err) { console.error(err); return 500 }`. Repetitif dan inconsistent.
**Solusi:** Buat `src/lib/error-handler.ts`:
```ts
export function withErrorHandler<T>(
  fn: (req: Request, ctx?: T) => Promise<Response>
) {
  return async (req: Request, ctx?: T) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      logger.error("Unhandled error", { error: err, url: req.url });
      if (err instanceof AppError) return err.toResponse();
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
```

### H-8. Component `useState` Berlebihan (228 Occurrences)
**Statistik:** 228 `useState` calls
**Masalah:** View files punya banyak state yang tidak terkoordinasi. Setiap `onChange`/`onSubmit` bisa trigger banyak re-render.
**Dampak:** Performance issue, sulit di-test.
**Solusi:** Untuk form kompleks, pakai `react-hook-form` (sudah ada dependency `@hookform/resolvers`). Untuk state global, pakai zustand store (sudah dipakai di `useAppStore`).

### H-9. Tidak Ada `tsc --noEmit` di Pre-commit / CI
**Masalah:** `tsconfig.json` strict mode aktif, tapi tidak ada script `typecheck`. `next build` saja yang typecheck.
**Dampak:** Type errors di file yang tidak di-import di build akan terlewat.
**Solusi:** Tambah script `"typecheck": "tsc --noEmit"` dan jalanin di CI.

### H-10. In-memory Cache & Rate Limiter Tidak Multi-instance Safe
**File:** `src/lib/cache.ts`, `src/lib/rate-limit.ts`, `src/lib/event-bus.ts`
**Masalah:** Ketiganya pakai `Map`/closure di-memory. Kalau deploy multi-instance (PM2 cluster, Vercel serverless), state tidak shared.
**Dampak:** Cache miss antar instance, rate limit bisa di-bypass, SSE event tidak sampai ke subscriber.
**Catatan:** Code sudah punya TODO comment untuk ganti ke Redis/Upstash, tapi belum dilakukan.
**Solusi:** Untuk target deployment (SQLite + standalone = single instance), ini OK. Untuk production multi-instance, wajib migrasi ke Redis.

### H-11. PDF Viewer Pakai `@ts-ignore` (3 Occurrences)
**File:** `src/components/app/shared/pdf-viewer.tsx` (lines with `@ts-ignore`)
**Masalah:** Type error disembunyikan, bukan diperbaiki. Biasanya karena library (pdfjs-dist?) tidak punya types yang baik.
**Solusi:** Cari type yang benar, atau pakai `@ts-expect-error` (yang fail kalau type sebenarnya sudah benar) instead of `@ts-ignore`.

---

## 🟡 MEDIUM (Quality & Maintainability)

### M-1. Next.js Metadata `themeColor` Warning
**File:** `src/app/layout.tsx`
**Warning:** `⚠ Unsupported metadata themeColor is configured in metadata export`
**Solusi:** Pindah `themeColor` ke `viewport` export:
```ts
export const viewport: Viewport = {
  themeColor: "#1e3a5f",
};
```

### M-2. 32 `console.log/error` di Non-API Code
**Statistik:** 32 console calls (di luar `src/app/api/**` dan `src/lib/**` yang di-allow ESLint)
**Masalah:** Console statement lolos karena rule `no-console: warn` tidak konsisten. Production build mungkin masih include log.
**Catatan:** `next.config.ts` sudah set `removeConsole: process.env.NODE_ENV === "production"` kecuali error — OK.
**Solusi:** Audit semua console.log, ganti dengan logger. Khusus untuk debug, hapus setelah selesai debug.

### M-3. `dangerouslySetInnerHTML` di Chart Component
**File:** `src/components/ui/data-display/chart.tsx` line 83
**Konteks:** Untuk inject CSS variable theming recharts — pattern standar recharts, tapi worth review.
**Risiko:** Theme IDs di-generate dari props (`id: string`), bukan user input. **Relatif aman**, tapi kalau ada user-controlled data masuk ke `THEMES` object, bisa XSS.
**Solusi:** Tambah sanitization atau pakai `data-*` attributes bukan inline `<style>`.

### M-4. Email Service Pakai Gmail SMTP (Bukan Production-grade)
**File:** `src/lib/email.ts` (Gmail hard-coded)
**Masalah:** Gmail SMTP punya limit 500 email/hari untuk akun gratis, tidak reliable untuk notifikasi transaksi.
**Dampak:** Email notifikasi (pengingat jatuh tempo, dll) bisa gagal deliver.
**Solusi:** Support multiple providers via env: `EMAIL_PROVIDER=gmail|sendgrid|resend|smtp`. Production pakai transactional service (Resend, SendGrid, Postmark).

### M-5. WhatsApp Provider Hard-coded ke Fonnte
**File:** `src/lib/whatsapp.ts`
**Masalah:** Sama — single provider, no failover.
**Solusi:** Provider abstraction sama seperti email.

### M-6. Cron Hanya jalan di Production
**File:** `src/instrumentation.ts`
```ts
if (process.env.NODE_ENV !== "production") return;
```
**Masalah:** Daily backup & overdue checker tidak jalan di dev. Testing cron logic harus manual edit env.
**Solusi:** Tambah env `ENABLE_DEV_CRON=true` untuk opt-in.

### M-7. SIBI Import Fetch Seluruh Dataset Setiap Lookup
**File:** `src/app/api/books/import-sibi/route.ts` (fungsi `findBookById`)
**Masalah:** Untuk cari 1 buku by ID, fetch seluruh dataset (5000 buku) lalu `.find()`. Sangat tidak efisien.
**Dampak:** Slow response, high memory.
**Solusi:** Cache dataset ke local JSON file, refresh setiap 24 jam. Atau pakai pagination/filter di SIBI API.

### M-8. `cronSecret` Token Berbeda Format antara Routes
**File:** `src/app/api/cron/backup-db/route.ts` (X-Cron-Secret), `src/app/api/cron/daily-tasks/route.ts` (?)
**Masalah:** Inkonsistensi header auth. Lihat:
```ts
// backup-db
const provided = req.headers.get("x-cron-secret");
if (provided !== cronSecret) ...

// daily-tasks (perlu dicek)
const cronSecret = process.env.CRON_SECRET;
```
**Solusi:** Standardize: pakai satu nama header (`X-Cron-Secret` atau `Authorization: Bearer`) untuk semua cron endpoints.

### M-9. Fetch di Component Pakai Raw `fetch()` Bukan `api` Client
**Statistik:** 14+ komponen pakai `await fetch('/api/...')` langsung
**Contoh:** `book-detail-view.tsx`, `book-form-view.tsx`, `book-transfer-view.tsx`, `login-screen.tsx`
**Masalah:** Skip `api` client yang handle error parsing, headers, dll. Inkonsisten.
**Solusi:** Migrate semua ke `api.get/post/put/delete` dari `src/lib/api-client.ts`.

### M-10. Form Email tidak Lowercase Sebelum Lookup
**File:** `src/app/api/auth/login/route.ts`
```ts
where: { email: email.toLowerCase().trim() }
```
**Positif:** Sudah ada `.toLowerCase().trim()` ✓
**Tapi:** Saat create user, harus yakin email juga di-lowercase. Cek `members/route.ts` dan `register`.

### M-11. Tidak Ada Email Verification Flow
**Masalah:** User bisa login dengan email apa saja (kalau ada di DB). Tidak ada email verification saat create user baru.
**Dampak:** Akun dummy/spam bisa dibuat tanpa jejak.
**Solusi:** Tambah `emailVerified: Boolean @default(false)` di model User, kirim verification link via email.

### M-12. Tidak Ada CSRF Protection Eksplisit
**Status:** Cookies `SameSite=strict` di JWT ✓ (mitigasi utama)
**Tapi:** Tidak ada CSRF token untuk state-changing operations. SameSite=strict bagus tapi tidak sempurna (beberapa browser case).
**Solusi:** Tambah CSRF token middleware untuk POST/PUT/DELETE.

### M-13. Test Coverage Tidak Diketahui
**Status:** Vitest threshold 60% lines/functions, 50% branches
**Masalah:** Tidak ada `coverage/` artifact di repo, tidak ada laporan. Thresholds mungkin tidak pernah divalidasi.
**Solusi:** Jalankan `npm run test:coverage`, simpan ke `coverage/`, dan attach ke PR.

### M-14. 31 Test Files Tapi Banyak Komponen Besar Tidak Punya Test
**Statistik:**
- Test dirs di components: 3
- Total `.tsx` components: 137
- Coverage ratio: ~31 test files vs 137 components = **22%**
**Dampak:** Refactor berisiko regression.
**Solusi:** Prioritas test untuk: `circulation-view`, `book-detail-view`, `book-form-view`, `members-view` — yang paling banyak logic.

### M-15. SIBI Source Hard-coded di Frontend
**File:** `src/components/app/shared/sibi-import-tab.tsx`
**Masalah:** List source (text-k13, penggerak, non-teks, tag) hard-coded, tidak dari API.
**Solusi:** Tambah `/api/sources` endpoint atau constant di shared file.

### M-16. Book Cover Fallback ke Color Gradient (Bagus)
**Positif:** `coverColor` field dengan gradient fallback — design choice yang bagus, no broken images.
**Tapi:** `coverImage: String?` — tidak ada validasi URL/path. User bisa input `javascript:alert(1)`.
**Risiko:** XSS kalau di-render sebagai `<img src={userInput}>`.
**Solusi:** Validasi `coverImage` harus http(s) URL atau path `/api/uploads/...` saja.

### M-17. Notifikasi Bisa Spam (No Aggregation)
**Masalah:** User bisa dapat 10 notifikasi terpisah untuk 10 buku yang akan jatuh tempo besok, bukan 1 agregat.
**Solusi:** Implement notification aggregation — "3 buku Anda akan jatuh tempo besok".

### M-18. `process.env` di Frontend Code
**File:** `src/components/app/views/settings-view.tsx`
```tsx
{notifEmail && !process.env.NEXT_PUBLIC_DEMO && (...)}
```
**Masalah:** Pakai `process.env.NEXT_PUBLIC_DEMO` di client component. Kalau di-set di .env.local tanpa `NEXT_PUBLIC_` prefix, undefined. Inkonsisten.
**Solusi:** Definisikan konstanta `const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "true";` di shared file.

---

## 🔵 LOW (Polish & Best Practices)

### L-1. TODO Comment di i18n
**File:** `src/lib/i18n/index.ts:46`
```ts
* TODO: baca dari user preference atau browser setting.
```
**Catatan:** Hanya 1 TODO di seluruh codebase — bagus! Tapi yang satu ini belum selesai.

### L-2. `bun.lock` di Commit tapi Pakai `npm install`
**File:** `bun.lock` (329KB) di-commit, `package-lock.json` (611KB) di-untracked
**Masalah:** Developer pakai `bun install` (generate `bun.lock`), CI pakai `npm install` (generate `package-lock.json`). Drift.
**Solusi:** Pilih satu: `bun.lock` (kalau semua pakai bun) atau `package-lock.json` (kalau npm). Hapus yang lain.

### L-3. Storybook Setup Tapi Hanya 7 Stories
**File:** `.storybook/`, `stories/`
**Statistik:** 7 story files
**Masalah:** Storybook di-setup tapi minim stories. Sprint 4 changelog sebut "41 stories" — apakah sudah ada tapi di lokasi lain?
**Solusi:** Audit jumlah stories aktual, lengkapi yang missing.

### L-4. README Badge Tidak Aktif
**File:** `README.md`
```
[![Status](https://img.shields.io/badge/status-stable-green)]()
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)]()
```
**Masalah:** Badge link kosong `()` — tidak ada target.
**Solusi:** Tambah link ke actual status page atau hapus badge.

### L-5. `theme-color` Duplikat di layout.tsx
**File:** `src/app/layout.tsx`
**Masalah:** `themeColor` di metadata + `<meta name="theme-color">` di `<head>`. Double specification.
**Solusi:** Hapus salah satu (lebih baik yang di `<head>` agar konsisten dengan PWA).

### L-6. Skip Link Mungkin Tidak Optimal
**File:** `src/components/app/shared/skip-link.tsx`
**Positif:** Ada skip link untuk a11y ✓
**Tapi:** Perlu verify target `id="main-content"` ada di AppShell.

### L-7. PWA Manifest Reference Tidak Lengkap
**File:** `public/manifest.json` — perlu dicek
**Masalah:** Tidak di-audit. Biasanya PWA manifest perlu icons, start_url, display, dll.

### L-8. SIBI Client Hard-coded URL
**File:** `src/lib/sibi-client.ts` (perlu dicek)
**Solusi:** Bikin configurable via `SIBI_BASE_URL` env.

### L-9. Error Tracker In-house (Bagus untuk Privacy)
**File:** `src/lib/error-tracker.ts`
**Positif:** Local error tracking, no external Sentry. Privacy-friendly untuk sekolah.
**Tapi:** Tidak ada UI untuk lihat error log di pustakawan dashboard. Hanya API endpoint.
**Solusi:** Tambah view "Error Log Viewer" dengan filter by level/date.

### L-10. `Instrumentation` Cron Berbasis setInterval
**File:** `src/instrumentation.ts`
**Masalah:** `setInterval(runDaily, 24*60*60*1000)` tidak reliable di serverless (container bisa restart kapan saja).
**Solusi:** Untuk serverless, pakai Vercel Cron / external cron. Untuk standalone, OK.

### L-11. Tidak Ada Webhook untuk External System
**Masalah:** Aplikasi standalone, tidak ada webhook untuk sinkronisasi ke sistem eksternal (SIBI pusat, Dapodik, dll).
**Solusi:** Tambah `/api/webhooks/*` untuk integration.

### L-12. Default Avatar adalah Initial
**File:** Likely di Avatar component
**Positif:** Initial-based avatar — good privacy practice (no random images)
**Tapi:** Inisial dari `fullName` mungkin tidak culturally appropriate (nama Arab/China dengan 1 kata).

### L-13. Tidak Ada Rate Limit pada Upload Endpoint
**File:** `src/app/api/upload/route.ts`
**Masalah:** File upload dibatasi 15MB per file, tapi tidak ada rate limit per user. User bisa spam upload.
**Solusi:** Tambah rate limit (mis. max 20 uploads/jam/user).

### L-14. Demo Accounts Tergantung pada Seed
**File:** `prisma/seed.ts` (perlu dicek)
**Masalah:** Akun demo (`pustakawan@jendelailmu.sch.id`, dll) harus ada di DB. Kalau fresh deploy tanpa seed, user tidak bisa coba.
**Solusi:** Auto-seed di dev mode, atau tampilkan error message "Jalankan npm run db:seed dulu".

---

## 🟢 KELEBIKAN (Yang Sudah Bagus)

Hal yang **tidak perlu diubah** karena sudah best practice:

✅ **JWT auth dengan `jose` library** (modern, edge-compatible)
✅ **bcrypt untuk password** (cost 10, standar industri)
✅ **2FA TOTP** untuk role LIBRARIAN
✅ **Rate limiting** di login, 2FA, forgot-password, error-log
✅ **HttpOnly + Secure + SameSite=strict** untuk session cookie
✅ **Path traversal protection** di upload route
✅ **CORS/security headers** lengkap di next.config.ts
✅ **Image optimization config** (meski belum dipakai)
✅ **Bundle optimization** dengan `optimizePackageImports`
✅ **LazyChart** untuk code splitting recharts
✅ **i18n foundation** dengan locale files (id.ts, en.ts)
✅ **Per-user localStorage key** untuk dashboard layout (anti-collision)
✅ **Strict role validation** di `resolveDefaultDashboard` (security fix)
✅ **2FA temp token** dengan expiry pendek
✅ **Audit log** untuk semua mutasi data
✅ **Error boundary** (`error.tsx`, `global-error.tsx`)
✅ **Caddy reverse proxy** config dengan TLS otomatis
✅ **Fail-closed** untuk JWT_SECRET/CRON_SECRET (no default)
✅ **Daily backup** dengan rotasi 7 hari
✅ **Lazy loading views** di `views/index.tsx`
✅ **Comprehensive docs** (12 file .md, 4192 baris)
✅ **Vitest + Playwright + Storybook** testing setup
✅ **32 test files** (unit), 6 E2E specs, 7 stories
✅ **TypeScript strict mode** aktif
✅ **ESLint config** thoughtful (file-specific overrides)
✅ **Reasonable commit history** (33+ commits, conventional messages)

---

## 📋 Prioritas Perbaikan (Action Plan)

### Minggu 1 (Critical & Blocker)
- [ ] **C-3** Hapus `.env` dari git history, rotate JWT_SECRET
- [ ] **C-2** Restore CI workflow (`.github/workflows/ci.yml`)
- [ ] **C-5** Buat Dockerfile untuk reproducible deploy
- [ ] **C-6** Buat `.env.example`
- [ ] **C-4** Ganti `bun` ke `node` di `start` script

### Minggu 2 (High Priority)
- [ ] **H-2** Pecah 6 view files >1000 baris jadi sub-components
- [ ] **H-4** Tambah zod validation di semua POST/PUT API routes
- [ ] **H-6, H-7** Buat `error-handler.ts` + adopsi ke semua routes
- [ ] **H-9** Tambah `typecheck` script di CI
- [ ] **H-1** Refactor `page.tsx` jadi server component

### Minggu 3 (Medium)
- [ ] **M-1** Fix metadata themeColor warning
- [ ] **M-3** Review dangerouslySetInnerHTML di chart
- [ ] **M-7** Cache SIBI dataset
- [ ] **M-11** Tambah email verification flow
- [ ] **M-13** Run coverage report, simpan baseline
- [ ] **M-14** Tambah test untuk 4 view files kritis

### Bulan 2 (Polish)
- [ ] **H-3** Migrasi `<img>` ke `<Image>`
- [ ] **H-5** Enable `noImplicitAny: true`, fix semua `as any`
- [ ] **M-4, M-5** Email & WhatsApp provider abstraction
- [ ] **L-2** Pilih `bun` atau `npm`, lockfile consistency
- [ ] **L-1** Selesaikan i18n TODO
- [ ] Tambah **integration tests** dengan real DB
- [ ] Tambah **E2E test untuk critical flow** (login, peminjaman, pengembalian)

---

## 🎯 Rekomendasi Tools/Libraries untuk Ditambah

| Tool | Untuk | Catatan |
|---|---|---|
| **zod** | Schema validation | Sudah ada `@hookform/resolvers`, peer-nya zod |
| **next-auth (atau tetap custom)** | Auth (optional) | Custom sudah bagus, tapi library mature = less bug |
| **@upstash/ratelimit** | Distributed rate limit | Untuk multi-instance production |
| **winston/pino** | Production logger | Replace custom logger (atau tetap, sudah bagus) |
| **posthog** atau **plausible** | Analytics (privacy-friendly) | Sekolah butuh tau usage pattern |
| **resend** atau **postmark** | Transactional email | Replace Gmail SMTP |
| **minio** atau **r2** | S3-compatible storage | Replace local file upload |
| **playwright-test** | E2E (sudah ada) | Lengkapi coverage |

---

## 📊 Score Breakdown

| Aspek | Score | Catatan |
|---|---|---|
| **Code Logic & Features** | 9/10 | Lengkap, well-thought |
| **Security** | 7.5/10 | Bagus, tapi ada hardcoded secret & no CSRF |
| **Code Quality** | 6/10 | File besar, `any` overuse, no zod |
| **Testing** | 6/10 | Setup bagus, coverage tipis (22% components) |
| **Documentation** | 8/10 | 12 .md files, 4192 baris — impressive |
| **DevOps/CI/CD** | 3/10 | No CI workflow, no Dockerfile, bun-specific scripts |
| **Performance** | 6/10 | Lazy loading OK, no next/image, 100% client |
| **Accessibility** | 7/10 | Skip link ada, perlu audit lebih |
| **Production Readiness** | 5.5/10 | Logic siap, infrastructure belum |
| **TOTAL** | **6.5/10** | Solid foundation, perlu polish |

---

## ✅ Apa yang SUDAH Berhasil di Sprint 1-4 (Commits 4dbbe58 → de3471d)

1. **Dashboard refactor** dengan 10 widget components
2. **Accessibility** (skip link, role-badge, role-empty-state, default-dashboard-selector)
3. **User preference system** (UserPreference table + auto-route logic)
4. **i18n foundation** (`t()`, `setLocale()`, `getLocale()`)
5. **LazyChart** untuk recharts code splitting
6. **41 Storybook stories** (well, 7 di repo — perlu audit)
7. **8 Playwright E2E tests** untuk SetAsHome flow
8. **16 unit tests** untuk `resolveDefaultDashboard`
9. **Security fix** strict role validation di `resolveDefaultDashboard`
10. **Multi-user localStorage** dengan `dashboard:layout:{userId}` key
11. **5 verification scripts** untuk CI/manual check
12. **Build fixes** untuk `views/index.ts → .tsx`, `settings-view.tsx` JSX, `next.config.ts` route, `barcode.tsx` import

**Total 33 commits Sprint 1-4** — kerja yang luar biasa untuk satu arc development.

---

**Audit selesai. Total: 49 temuan (6 Critical, 11 High, 18 Medium, 14 Low).**

**Rekomendasi utama:** Fokus minggu ini pada C-2, C-3, C-4, C-5, C-6 (Critical) — semuanya kecil (1-2 jam) tapi impact tinggi. Setelah itu, prioritas H-2 (pecah monolith) dan H-4 (zod validation) untuk technical debt cleanup.
