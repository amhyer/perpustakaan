# Changelog - Milestone Implementations

Semua perubahan berikut telah diimplementasikan pada branch `arena/01a0285b-perpustakaan`.

## 🔴 Milestone 1: Critical Fixes (Commit `1f2c31a`)

### Keamanan
- ✅ **Rate limiting** in-memory sliding window (login 5/menit, forgot-password 3/5menit, 2FA 5/menit)
- ✅ **2FA TOTP** untuk pustakawan dengan QR code & 8 backup codes (sekali pakai)
- ✅ **Password reset** via email (hashed token, 1 jam, single-use, invalidate semua sesi)
- ✅ **Active session tracking** + force logout device tertentu
- ✅ **Error tracking** in-house (Sentry-like) dengan tabel ErrorLog

### Email (Nodemailer + Gmail)
- ✅ `sendEmail()` + 6 template Bahasa Indonesia
- ✅ Integrasi: cron reminder, member import, announcement broadcast
- ✅ `EmailLog` untuk audit

### WhatsApp (Fonnte)
- ✅ `sendWhatsApp()` + `sendWhatsAppBatch()`
- ✅ Normalisasi nomor HP (08xx/+62/62/8xx → 628xx)
- ✅ 6 template Bahasa Indonesia
- ✅ `WhatsAppLog` untuk audit

### Multi-channel Notification Service
- ✅ Orchestrator: in-app + email + WhatsApp
- ✅ Per-channel enable/disable via Settings
- ✅ Best-effort per channel (gagal satu, lanjut yang lain)

### Frontend
- ✅ Login screen dengan mode 2FA & forgot password
- ✅ `/reset-password` page (token validation, new password)
- ✅ Settings view: tab Security (2FA), Channels (email/WA)
- ✅ `global-error.tsx` auto-reports ke server

### Schema (13 model baru)
TwoFactorSecret, PasswordResetToken, ActiveSession, ErrorLog, EmailLog, WhatsAppLog, LibraryRoom, RoomBooking, Visitor, Asset, AssetLoan, ApiKey, AuditLogArchive

### Deps
- `nodemailer ^6.9.15` + `@types/nodemailer`
- `otplib ^12.0.1`

---

## 🟠 Milestone 2: Komunikasi Pintar (Commit `8419b30`)

- ✅ **Smart reminder scheduler**: H-3, H-1, H+1, H+3, H+7 (configurable via Settings)
- ✅ Multi-channel (in-app + email + WhatsApp)
- ✅ Idempotent per hari (tidak kirim duplikat)

---

## 🟡 Milestone 3: Operasional (Commit `8419b30`)

- ✅ **Library Room**: CRUD + booking dengan overlap detection
- ✅ **Asset management**: CRUD + pinjam/kembalikan (proyektor, laptop, dll)
- ✅ **Visitor/Buku Tamu**: check-in/check-out + statistik kunjungan
- ✅ Loan rules auto-apply (pakai dueDate calculator existing)
- ✅ PWA Support: manifest, service worker, app icons

---

## 🟢 Milestone 4: Pelayanan & UX (Commit `8419b30`)

- ✅ **PWA**: manifest.json, service worker (offline pages, push notif siap)
- ✅ **Dashboard Eksekutif**: KPI cards, tren chart, top books/members, growth %
- ✅ Executive dashboard untuk kepala sekolah

---

## 🔵 Milestone 5: Data & Integrasi (Commit `8419b30`)

- ✅ **API Key system** untuk integrasi eksternal
- ✅ Scope-based authorization (`read:books`, `write:loans`, dll)
- ✅ Generate/revoke/list API keys (pustakawan penuh)
- ✅ Prefix `ji_live_`/`ji_test_` + hashed storage

---

## 🚀 Setup Environment Variables

Tambahkan ke `.env`:

```env
# Existing
JWT_SECRET=...
CRON_SECRET=...
DATABASE_URL=file:./db/custom.db
NEXTAUTH_URL=https://perpustakaan.sekolah.sch.id

# NEW (M1)
GMAIL_USER=perpustakaan@sekolah.sch.id
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # Gmail App Password

# NEW (M1)
FONNTE_TOKEN=your_fonnte_token  # https://fonnte.com
```

## 📦 Install Dependencies

```bash
bun install
bunx prisma generate
bunx prisma db push --accept-data-loss
bun run dev
```

## 🧪 Validation

```bash
bash scripts/validate-milestone-1.sh
```
