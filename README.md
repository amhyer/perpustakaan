# 📚 Perpustakaan Jendela Ilmu

> Sistem Manajemen Perpustakaan Sekolah Modern — *Membuka Jendela Ilmu untuk Semua*

[![Status](https://img.shields.io/badge/status-stable-green)]()
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

Aplikasi perpustakaan digital yang powerful & mudah digunakan untuk sekolah Indonesia. Terinspirasi dari SLiMS (Senayan Library Management System) dengan UX modern dan fitur-fitur tambahan.

---

## ✨ Fitur Utama

### 👥 Multi-Role
- **Librarian** (Pustakawan penuh) — akses penuh
- **Junior Librarian** — akses terbatas (sirkulasi, anggota, stock opname)
- **Teacher** (Guru) — pinjam buku, ajukan usulan, lihat statistik kelas
- **Student** (Siswa) — cari buku, pinjam, wishlist, gamifikasi

### 📖 Sirkulasi Perpustakaan
- Peminjaman dengan barcode scanner
- Pengembalian dengan kondisi (baik/rusak/hilang)
- Perpanjangan self-service untuk anggota
- Denda otomatis (kustomizable per kategori)
- Reservasi buku dengan antrian
- Batch checkout/return untuk banyak buku

### 📚 Manajemen Koleksi
- Katalog OPAC dengan pencarian lengkap
- Import dari SIBI (Sumber Belajar Digital Indonesia)
- ISBN lookup via Google Books
- Multiple eksemplar per judul
- Lampiran digital (PDF, gambar, audio)
- Stock opname dengan scan barcode

### 🏢 Operasional
- **Library Room** — booking ruang baca, diskusi, AV
- **Asset Management** — proyektor, laptop, mikrofon
- **Visitor/Buku Tamu** — check-in/out + statistik
- **Kiosk Mode** — tampilan publik fullscreen

### 📊 Laporan & Analytics
- Dashboard eksekutif untuk kepala sekolah
- 12-month trend charts
- Top books & members
- Laporan literasi
- Export CSV
- Print-friendly views

### 🔐 Keamanan Enterprise
- **JWT + bcrypt** authentication
- **2FA TOTP** untuk pustakawan (Google Authenticator, Authy)
- **Rate limiting** anti-brute-force
- **Password reset** via email (token hashed, 1 jam)
- **Active session tracking** + force logout
- **Error tracking** built-in
- **Audit log** untuk semua aksi
- **API Key system** untuk integrasi eksternal

### 📱 Komunikasi Multi-Channel
- **Email** (Nodemailer + Gmail SMTP) — 6 template Bahasa Indonesia
- **WhatsApp** (Fonnte) — 6 template dengan phone normalization
- **In-app notifications** — real-time badge
- **Smart reminder** — H-3, H-1, H+1, H+3, H+7
- **Broadcast** — pengumuman ke semua member

### 🎮 Gamifikasi
- Target baca tahunan per siswa
- Leaderboard
- Achievement badges

### 📱 Progressive Web App (PWA)
- Installable di Android & iOS
- Service worker untuk offline mode
- Push notification support (siap)
- App shortcuts (Katalog, Pinjaman, Kartu)

### 🧪 Developer-Friendly
- **TypeScript** strict mode
- **250+ unit tests** (Vitest)
- **Structured logger** (JSON untuk production)
- **Code splitting** otomatis per view
- **Image optimization** (AVIF/WebP)
- **Security headers** (HSTS, X-Frame-Options, dll)
- **CI/CD pipeline** (lint, typecheck, test, build, security)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ atau Bun 1.3+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/amhyer/perpustakaan.git
cd perpustakaan

# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env, set JWT_SECRET, CRON_SECRET, dll

# Setup database
bunx prisma generate
bunx prisma db push --accept-data-loss
bunx tsx prisma/seed.ts  # optional: load demo data

# Run development server
bun run dev
# → http://localhost:3001
```

### Akun Demo

| Email | Password | Role |
|---|---|---|
| `pustakawan@jendelailmu.sch.id` | `password123` | LIBRARIAN |
| `budi@jendelailmu.sch.id` | `password123` | TEACHER |
| `andini@jendelailmu.sch.id` | `password123` | STUDENT |

⚠️ **PENTING**: Ganti password default sebelum deploy ke production!

---

## 📚 Dokumentasi

Dokumentasi lengkap tersedia di folder root:

| Dokumen | Untuk siapa |
|---|---|
| **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** | Developer yang ingin kontribusi |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | DevOps / sysadmin untuk deploy |
| **[API_REFERENCE.md](API_REFERENCE.md)** | Frontend / integrasi API |
| **[SECURITY.md](SECURITY.md)** | Security policy & best practices |
| **[CHANGELOG-FULL.md](CHANGELOG-FULL.md)** | Riwayat perubahan lengkap |
| **[PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md)** | Laporan optimasi performance |
| **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** | Standar komunitas |
| **[tests/README.md](tests/README.md)** | Testing guide |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI) |
| State | Zustand 5, TanStack Query 5 |
| Backend | Next.js API Routes (serverless + standalone) |
| Database | SQLite (dev) / PostgreSQL (production-ready) |
| ORM | Prisma 6.11 |
| Auth | JWT (jose), bcrypt, otplib (2FA) |
| Email | Nodemailer (Gmail SMTP) |
| WhatsApp | Fonnte API |
| PWA | Service Worker, Web App Manifest |
| Testing | Vitest, Testing Library, happy-dom |
| CI/CD | GitHub Actions |
| Linting | ESLint 9, TypeScript strict |
| Logging | Custom structured logger (JSON output) |

---

## 🏗️ Arsitektur

```
┌────────────────────────────────────────────────────┐
│                  Browser / PWA                     │
│   ┌────────────────────────────────────────────┐   │
│   │  Next.js Client (React 19 + Zustand)      │   │
│   │  - Lazy-loaded views (code splitting)     │   │
│   │  - Service Worker (offline + push)        │   │
│   └─────────────────┬──────────────────────────┘   │
└─────────────────────┼──────────────────────────────┘
                      │ fetch (REST)
┌─────────────────────▼──────────────────────────────┐
│           Next.js Server (Standalone)               │
│  ┌──────────────────────────────────────────────┐  │
│  │  API Routes (62+)                            │  │
│  │  - Auth (JWT, 2FA, sessions)                 │  │
│  │  - Rate limiting                             │  │
│  │  - Input validation                          │  │
│  └─────────────────┬────────────────────────────┘  │
│  ┌─────────────────▼────────────────────────────┐  │
│  │  Business Logic (src/lib)                   │  │
│  │  - auth, db, cache, logger, scheduler       │  │
│  │  - email, whatsapp, notification            │  │
│  └─────────────────┬────────────────────────────┘  │
└────────────────────┼────────────────────────────────┘
                     │ Prisma Client
┌────────────────────▼───────────────────────────────┐
│              Database (SQLite/PostgreSQL)            │
└──────────────────────────────────────────────────────┘
```

Untuk detail lengkap, lihat [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

---

## 🧪 Testing

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage

# UI mode (interactive)
bun run test:ui
```

Current stats:
- **14 test files** (Vitest)
- **~280 test cases**
- Target coverage: 60% untuk library files

---

## 🚀 Deployment

Lihat [DEPLOYMENT.md](DEPLOYMENT.md) untuk panduan lengkap.

3 opsi deployment:

### Option A: VPS + Caddy (Recommended untuk Sekolah)
```bash
# Lihat DEPLOYMENT.md section "Option A"
```

### Option B: Docker
```bash
docker compose up -d --build
```

### Option C: Vercel (perlu migrasi ke PostgreSQL)
```bash
# Push ke GitHub, import di vercel.com
# Lihat DEPLOYMENT.md section "Option C"
```

---

## 💰 Biaya Estimasi (Indonesia)

| Komponen | Provider | Biaya |
|---|---|---|
| VPS 2GB | IDCloudhost | Rp 100-200rb/bulan |
| Domain .sch.id | PANDI | Rp 100-150rb/tahun |
| SSL | Let's Encrypt (via Caddy) | Gratis |
| Email | Google Workspace | Rp 60rb/user/bulan |
| WhatsApp Gateway | Fonnte | Rp 100-500rb/bulan |
| **Total** | | **Rp 350-900rb/bulan** |

---

## 🤝 Kontribusi

Kami welcome kontribusi dari siapa saja! Lihat:

- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** untuk setup & conventions
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** untuk standar komunitas
- **[SECURITY.md](SECURITY.md)** untuk laporan security issues

### Quick Contribution Steps

1. Fork repository
2. Buat branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m "feat: add amazing feature"`)
4. Push (`git push origin feature/amazing-feature`)
5. Buka Pull Request

PR akan otomatis run CI (lint, test, build).

---

## 📊 Stats

- **40+ API endpoints**
- **33 view components**
- **22 database models**
- **~40K baris kode**
- **250+ unit tests**
- **9 dokumen**

---

## 📜 Lisensi

MIT License — bebas digunakan untuk sekolah, komersial, dan modifikasi.

Lihat [LICENSE](LICENSE) untuk detail.

---

## 🙏 Acknowledgments

Terima kasih kepada:
- **SLiMS** (Senayan Library Management System) — inspirasi
- **shadcn/ui** — komponen UI yang luar biasa
- **Prisma** — ORM yang powerful
- **Next.js** — framework yang amazing
- Semua kontributor & tester

---

## 💬 Kontak

- **Email**: hello@jendelailmu.sch.id
- **GitHub Issues**: https://github.com/amhyer/perpustakaan/issues
- **GitHub Discussions**: https://github.com/amhyer/perpustakaan/discussions

---

<div align="center">

**Dibuat dengan ❤️ untuk literasi Indonesia**

[⭐ Star repo ini](https://github.com/amhyer/perpustakaan) jika bermanfaat

</div>
