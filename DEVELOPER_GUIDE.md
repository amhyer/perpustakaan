# Developer Guide — Perpustakaan Jendela Ilmu

Panduan lengkap untuk developer yang ingin kontribusi, extend, atau maintain aplikasi.

## 📚 Daftar Isi

1. [Tech Stack](#1-tech-stack)
2. [Setup Development](#2-setup-development)
3. [Arsitektur Aplikasi](#3-arsitektur-aplikasi)
4. [Database Schema](#4-database-schema)
5. [Konvensi Kode](#5-konvensi-kode)
6. [Membuat Fitur Baru](#6-membuat-fitur-baru)
7. [Testing](#7-testing)
8. [Deployment](#8-deployment)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Tech Stack

| Layer | Technology | Versi |
|---|---|---|
| Runtime | Bun | 1.3+ |
| Framework | Next.js | 16.1+ (App Router) |
| Bahasa | TypeScript | 5+ |
| Database | SQLite (file-based) | 3+ |
| ORM | Prisma | 6.11+ |
| UI | shadcn/ui (Radix UI) | latest |
| Styling | Tailwind CSS | 4+ |
| State | Zustand | 5+ |
| Forms | react-hook-form + zod | 7+ / 4+ |
| Auth | JWT (jose) + bcrypt | - |
| Email | Nodemailer | 6+ |
| 2FA | otplib | 12+ |
| WhatsApp | Fonnte API | - |
| Testing | Vitest | 2+ |

### Runtime Support

- **Node.js**: 20+ (recommended 22)
- **Bun**: 1.3+ (recommended untuk development)
- **Browsers**: Chrome/Edge/Firefox/Safari (latest 2 versions)
- **Mobile**: PWA-capable (iOS 16.4+, Android 7+)

---

## 2. Setup Development

### 2.1 Prerequisites

Pastikan tools ini terinstall:

```bash
# Cek versi
node --version    # >= 20
bun --version     # >= 1.3
git --version
```

### 2.2 Install Project

```bash
# Clone repository
git clone https://github.com/amhyer/perpustakaan.git
cd perpustakaan

# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Apply schema ke database
bunx prisma db push --accept-data-loss

# Seed data demo
bunx tsx prisma/seed.ts
```

### 2.3 Environment Variables

Buat file `.env` di root project:

```env
# ===== REQUIRED =====

# JWT Secret (generate: openssl rand -base64 32)
JWT_SECRET=your-random-secret-here-min-32-chars

# Cron Secret (generate: openssl rand -base64 32)
CRON_SECRET=your-cron-secret-here

# Database (default: SQLite file)
DATABASE_URL=file:./db/custom.db

# Public URL (untuk reset password link, WA template, dll)
NEXTAUTH_URL=http://localhost:3001

# ===== OPTIONAL =====

# Email (Nodemailer + Gmail)
GMAIL_USER=perpustakaan@sekolah.sch.id
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# WhatsApp (Fonnte)
FONNTE_TOKEN=your-fonnte-token

# Upload directory (production)
UPLOAD_DIR=/var/www/perpustakaan/public/uploads
```

### 2.4 Run Development Server

```bash
bun run dev
# → http://localhost:3001
```

### 2.5 Akun Demo

Setelah seed:

| Email | Password | Role |
|---|---|---|
| `pustakawan@jendelailmu.sch.id` | `password123` | LIBRARIAN |
| `budi@jendelailmu.sch.id` | `password123` | TEACHER |
| `andini@jendelailmu.sch.id` | `password123` | STUDENT |

---

## 3. Arsitektur Aplikasi

### 3.1 Layer Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Next.js Client (React 19 + Zustand)               │   │
│  │  - pages (view router)                              │   │
│  │  - components (app, ui)                             │   │
│  │  - hooks (useFetch, useToast)                       │   │
│  └────────────────────┬─────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────┘
                        │ fetch (REST)
┌───────────────────────▼─────────────────────────────────────┐
│              Next.js Server (API Routes)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Route Handlers (src/app/api/*)                     │   │
│  │  - Auth middleware (requireAuth, requireRole)        │   │
│  │  - Rate limiting                                    │   │
│  │  - Input validation                                 │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  Business Logic (src/lib)                            │   │
│  │  - auth, db, notification, scheduler                │   │
│  │  - email, whatsapp, cache                            │   │
│  └────────────────────┬─────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────┘
                        │ Prisma Client
┌───────────────────────▼─────────────────────────────────────┐
│                      SQLite Database                        │
│            (db/custom.db)                                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Folder Structure

```
perpustakaan/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Demo data
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── logo.svg                # Brand logo
│   └── icons/                  # PWA icons
├── src/
│   ├── app/
│   │   ├── api/                # REST API endpoints (62+)
│   │   │   ├── auth/           # login, logout, 2FA, sessions
│   │   │   ├── books/          # CRUD buku
│   │   │   ├── loans/          # Sirkulasi
│   │   │   └── ...
│   │   ├── reset-password/     # Public page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main SPA entry
│   │   └── globals.css         # Design tokens
│   ├── components/
│   │   ├── app/                # Domain components
│   │   │   ├── auth/           # Login screen
│   │   │   ├── layout/         # AppShell, Sidebar, Header
│   │   │   ├── shared/         # BookCard, StatCard, PageHeader
│   │   │   └── views/          # 28 view components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   └── pwa-init.tsx        # PWA bootstrap
│   ├── hooks/                  # useFetch, useToast, useQrScanner
│   ├── lib/                    # Business logic
│   │   ├── auth.ts             # JWT + RBAC
│   │   ├── db.ts               # Prisma singleton
│   │   ├── cache.ts            # In-memory TTL cache
│   │   ├── email.ts            # Nodemailer + templates
│   │   ├── whatsapp.ts         # Fonnte + templates
│   │   ├── notification-service.ts  # Multi-channel orchestrator
│   │   ├── rate-limit.ts       # Anti-brute-force
│   │   ├── two-factor.ts       # TOTP
│   │   ├── scheduler.ts        # Smart reminders
│   │   ├── api-auth.ts         # API key verification
│   │   ├── audit.ts            # Activity logging
│   │   ├── error-tracker.ts    # Error monitoring
│   │   ├── client-error.ts     # Browser error reporting
│   │   ├── loan-rules.ts       # Business rules engine
│   │   ├── constants.ts        # Enums, helpers
│   │   ├── isbn-lookup.ts      # ISBN → metadata
│   │   ├── sibi-*.ts           # SIBI integration
│   │   ├── upload.ts           # File upload helpers
│   │   ├── temp-token.ts       # JWT short-lived tokens
│   │   ├── api-client.ts       # Client-side fetch wrapper
│   │   ├── utils.ts            # cn() helper
│   │   └── __tests__/          # 13 vitest test files
│   ├── store/
│   │   └── use-app-store.ts    # Zustand global state
│   └── instrumentation.ts      # Cron scheduler
├── tests/
│   ├── setup.ts                # Vitest global setup
│   └── README.md               # Testing docs
├── scripts/
│   └── validate-milestone-1.sh # Validation script
├── next.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── components.json             # shadcn config
├── tsconfig.json
├── package.json
├── Caddyfile                   # Reverse proxy
├── .gitignore
├── CHANGELOG-MILESTONES.md
└── DEVELOPER_GUIDE.md          # ← You are here
```

### 3.3 Request Flow Example

Contoh: User melakukan peminjaman buku.

```
1. Client (circulation-view.tsx)
   └─→ api.post("/api/loans", { memberId, bookItemId })

2. API Route: /api/loans/route.ts (POST)
   ├─→ requireLibrarian()     # Auth check
   ├─→ rateLimit()             # Anti-spam
   └─→ Business logic:
       ├─→ db.$transaction:
       │   ├─→ loan.create()
       │   ├─→ bookItem.update(status: BORROWED)
       │   └─→ notification.create() (in-app)
       └─→ notify() multi-channel:
           ├─→ sendEmail() (jika enabled)
           └─→ sendWhatsApp() (jika enabled)

3. Response → client
   └─→ Update UI (refetch, toast)
```

---

## 4. Database Schema

22 model Prisma. Lihat `prisma/schema.prisma` untuk lengkapnya.

### 4.1 Model Groups

**Identity & Access** (4):
- `User`, `Member`, `ActiveSession`, `TwoFactorSecret`

**Catalog** (5):
- `Book`, `BookItem`, `Category`, `Location`, `BookAttachment`

**Circulation** (4):
- `Loan`, `Reservation`, `Wishlist`, `BookTransfer`

**Engagement** (4):
- `BookProposal`, `BookReview`, `Announcement`, `Notification`

**Operations** (5):
- `LibraryRoom`, `RoomBooking`, `Visitor`, `Asset`, `AssetLoan`

**System** (5):
- `Setting`, `LibraryHoliday`, `AuditLog`, `EmailLog`, `WhatsAppLog`

**Integration** (2):
- `Publisher`, `Author`, `ApiKey`

### 4.2 Migration Workflow

```bash
# Development: apply changes langsung
bunx prisma db push --accept-data-loss

# Production: pakai migration files
bunx prisma migrate dev --name "add_new_field"
bunx prisma migrate deploy  # di production
```

---

## 5. Konvensi Kode

### 5.1 Bahasa

- **Code**: English (variabel, function, comment teknis)
- **UI/Labels**: Bahasa Indonesia (sesuai target user)
- **Commit messages**: English atau bilingual

### 5.2 File Naming

```
Components:   PascalCase          BookCard.tsx
Hooks:        camelCase + use     useFetch.ts
Libraries:    kebab-case          rate-limit.ts
API routes:   kebab-case          /api/auth/login
Constants:    UPPER_SNAKE_CASE    MAX_RETRY
Types:        PascalCase          BookWithDetails
```

### 5.3 Import Order

```typescript
// 1. External libraries
import { useState } from "react";
import { toast } from "sonner";

// 2. Internal libraries (absolute)
import { api } from "@/lib/api-client";
import { db } from "@/lib/db";

// 3. Components (absolute)
import { Button } from "@/components/ui/form/button";

// 4. Types (type-only)
import type { Book } from "@prisma/client";

// 5. Styles (last)
import "./styles.css";
```

### 5.4 Component Pattern (View)

```typescript
"use client";  // Required untuk semua view

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/form/button";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";

export function MyView() {
  const user = useAppStore((s) => s.user);
  const { data, loading, refetch } = useFetch<MyData>("/api/my-endpoint");

  const handleAction = async () => {
    try {
      await api.post("/api/my-action", { foo: "bar" });
      toast.success("Berhasil!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* content */}
    </div>
  );
}
```

### 5.5 API Route Pattern

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  // 1. Auth check
  const { user, error } = await requireLibrarian();
  if (error) return error;

  try {
    // 2. Parse + validate input
    const body = await req.json();
    if (!body.requiredField) {
      return NextResponse.json({ error: "Field wajib" }, { status: 400 });
    }

    // 3. Business logic (DB transaction jika multi-step)
    const result = await db.$transaction(async (tx) => {
      // ...
    });

    // 4. Audit log
    await logAudit(user!.id, "ACTION_NAME", "Entity", result.id);

    // 5. Response
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal" },
      { status: 500 }
    );
  }
}
```

### 5.6 Error Handling

```typescript
// ❌ Jangan: silently swallow
try { await api.post(...); } catch {}

// ✅ Better: log + user feedback
try {
  await api.post(...);
  toast.success("Berhasil!");
} catch (err) {
  console.error("[my-action]", err);
  toast.error(err instanceof Error ? err.message : "Gagal");
}

// ✅✅ Best: typed error
try {
  await api.post(...);
} catch (err) {
  if (err instanceof ApiError) {
    // handle specific
  } else {
    // fallback
  }
}
```

---

## 6. Membuat Fitur Baru

### 6.1 Contoh: Tambah Modul "Donasi Buku"

#### Step 1: Schema (prisma/schema.prisma)

```prisma
model BookDonation {
  id          String   @id @default(cuid())
  donorName   String
  donorPhone  String?
  donorEmail  String?
  bookTitle   String
  bookAuthor  String?
  quantity    Int      @default(1)
  status      String   @default("PENDING") // PENDING | APPROVED | REJECTED
  receivedAt  DateTime?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([status])
}
```

#### Step 2: API Route (src/app/api/donations/route.ts)

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const { error } = await requireLibrarian();
  if (error) return error;
  const donations = await db.bookDonation.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(donations);
}

export async function POST(req: Request) {
  // Public endpoint — tidak perlu auth
  try {
    const body = await req.json();
    if (!body.donorName || !body.bookTitle) {
      return NextResponse.json({ error: "Nama dan judul buku wajib" }, { status: 400 });
    }
    const donation = await db.bookDonation.create({
      data: {
        donorName: body.donorName,
        donorPhone: body.donorPhone,
        donorEmail: body.donorEmail,
        bookTitle: body.bookTitle,
        bookAuthor: body.bookAuthor,
        quantity: body.quantity || 1,
        notes: body.notes,
      },
    });
    return NextResponse.json(donation, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
```

#### Step 3: View Component (src/components/app/views/donations-view.tsx)

```typescript
"use client";

import { Plus, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { PageHeader } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useState } from "react";

interface Donation { /* ... */ }

export function DonationsView() {
  const { data, loading, refetch } = useFetch<Donation[]>("/api/donations");
  const [open, setOpen] = useState(false);

  // ... (implementasi UI)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donasi Buku"
        description="Kelola sumbangan buku dari masyarakat"
        icon={Heart}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Catat Donasi
          </Button>
        }
      />
      {/* ... table + form */}
    </div>
  );
}
```

#### Step 4: Register View

Edit `src/store/use-app-store.ts`:
```typescript
export type ViewKey = ... | "donations";
```

Edit `src/app/page.tsx`:
```typescript
import { DonationsView } from "@/components/app/views/donations-view";

// di switch
case "donations":
  return <DonationsView />;
```

Edit `src/components/app/layout/sidebar.tsx`:
```typescript
const LIBRARIAN_NAV: NavItem[] = [
  // ...
  { key: "donations", label: "Donasi Buku", icon: Heart },
];
```

#### Step 5: Tests (src/lib/__tests__/donations.test.ts)

```typescript
import { describe, it, expect } from "vitest";

describe("donation logic", () => {
  it("validate donor name", () => {
    // ...
  });
});
```

#### Step 6: Apply Schema

```bash
bunx prisma db push --accept-data-loss
bunx prisma generate
```

### 6.2 Checklist Fitur Baru

- [ ] Schema (prisma/schema.prisma)
- [ ] API route (src/app/api/...)
- [ ] View component (src/components/app/views/...)
- [ ] Register di store, page.tsx, sidebar
- [ ] Auth check yang sesuai (requireLibrarian / requireAuth)
- [ ] Rate limit (jika ada endpoint sensitif)
- [ ] Audit log
- [ ] Tests
- [ ] Update dokumentasi (CHANGELOG, README)

---

## 7. Testing

### 7.1 Run Tests

```bash
# Run all tests
bun run test

# Watch mode (development)
bun run test:watch

# Coverage report
bun run test:coverage

# Specific file
bun run test src/lib/__tests__/rate-limit.test.ts
```

### 7.2 Test Structure

Lihat `tests/README.md` untuk lengkap.

```
src/lib/__tests__/
├── rate-limit.test.ts          # 6 tests
├── temp-token.test.ts          # 6 tests
├── two-factor.test.ts          # 20+ tests
├── whatsapp.test.ts            # 15+ tests
├── constants.test.ts           # 30+ tests
├── api-auth.test.ts            # 5 tests
├── auth.test.ts                # 10 tests
├── client-error.test.ts        # 5 tests
├── loan-rules.test.ts          # 6 tests
├── email.test.ts               # 25+ tests
├── scheduler.test.ts           # 3 tests (mocked DB)
├── api-client.test.ts          # 15+ tests
├── error-tracker.test.ts       # 12 tests
└── cache.test.ts               # 9 tests
```

### 7.3 Writing New Tests

```typescript
// src/lib/__tests__/my-feature.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "../my-feature";

describe("myFunction", () => {
  it("deskripsi expected behavior", () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });

  it("handle edge case", () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### 7.4 Mocking Prisma

```typescript
import { vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

import { db } from "../db";

// Di test:
(db.user.findUnique as any).mockResolvedValue({ id: "1", name: "Test" });
```

---

## 8. Deployment

### 8.1 Build

```bash
bun run build
```

Output di `.next/standalone/`.

### 8.2 Production Server

```bash
NODE_ENV=production bun .next/standalone/server.js
```

Server listen di port 3000 by default.

### 8.3 Reverse Proxy (Caddy)

Lihat `Caddyfile` di root. Support auto-port transform via query:

```
https://perpustakaan.sekolah.sch.id/?XTransformPort=3000
```

### 8.4 Environment Checklist

Pastikan semua env vars di-set di production:

- ✅ `JWT_SECRET` (REQUIRED, strong random)
- ✅ `CRON_SECRET` (REQUIRED, strong random)
- ✅ `DATABASE_URL` (REQUIRED, use `/var/lib/perpustakaan/data.db` untuk persistent)
- ✅ `NEXTAUTH_URL` (REQUIRED, public URL)
- ⚠️ `GMAIL_USER` + `GMAIL_APP_PASSWORD` (untuk email)
- ⚠️ `FONNTE_TOKEN` (untuk WhatsApp)
- ⚠️ `UPLOAD_DIR` (persistent storage, default ke cwd)

### 8.5 Backup Strategy

1. **Cron backup harian** (`/api/cron/backup-db`):
   - Auto-rotate 7 hari
   - Trigger via external cron atau Vercel Cron

2. **Database file backup** (manual):
   ```bash
   # Download via UI
   # Settings → Backup Database → Unduh
   ```

3. **Upload folder backup**:
   ```bash
   rsync -avz /var/lib/perpustakaan/uploads/ /backup/uploads/
   ```

### 8.6 Monitoring

- **Error tracking**: Lihat Settings → Jejak Aktivitas (built-in)
- **Audit log**: Lihat Settings → Jejak Aktivitas
- **Notification log**: Menu Log Notifikasi
- **Server logs**: `journalctl -u perpustakaan` atau stdout

---

## 9. Troubleshooting

### 9.1 "JWT_SECRET belum diset"

**Solusi**: Tambahkan ke `.env`:
```env
JWT_SECRET=$(openssl rand -base64 32)
```

### 9.2 "Cannot find module '@prisma/client'"

**Solusi**:
```bash
bunx prisma generate
```

### 9.3 Email tidak terkirim

Cek:
- ✅ `GMAIL_USER` & `GMAIL_APP_PASSWORD` di `.env`
- ✅ App Password Gmail aktif (https://myaccount.google.com/apppasswords)
- ✅ 2FA Gmail aktif (App Password butuh 2FA)
- ✅ Logs di Settings → Jejak Aktivitas

### 9.4 WhatsApp tidak terkirim

Cek:
- ✅ `FONNTE_TOKEN` di `.env`
- ✅ Device Fonnte connected (cek dashboard Fonnte)
- ✅ Nomor HP format Indonesia (08xx, +62, 62xx, atau 8xx)
- ✅ Logs di Settings → Jejak Aktivitas

### 9.5 Cron job tidak jalan

Cek:
- ✅ `CRON_SECRET` di `.env`
- ✅ `instrumentation.ts` aktif di production build
- ✅ Manual trigger:
  ```bash
  curl -X POST https://perpustakaan.sekolah.sch.id/api/cron/daily-tasks \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```

### 9.6 Database locked

SQLite occasionally locks under heavy concurrent access. Solutions:
- Restart server
- Reduce concurrent transactions
- Migrate to PostgreSQL (untuk scale besar)

### 9.7 Login loop (terus redirect ke login)

Cek:
- Cookie `ji_session` masih valid
- CORS configuration (kalau cross-domain)
- `NEXTAUTH_URL` benar di `.env`

### 9.8 Build error: "Module not found"

```bash
rm -rf node_modules .next
bun install
bunx prisma generate
bun run build
```

---

## 📞 Kontribusi

Untuk kontribusi, buka **GitHub Issue** atau **Pull Request** di:
https://github.com/amhyer/perpustakaan

**Code review checklist**:
- [ ] Tests pass (`bun run test`)
- [ ] Lint pass (`bun run lint`)
- [ ] TypeScript clean (`bunx tsc --noEmit`)
- [ ] Conventional commit message
- [ ] Dokumentasi diupdate (jika ada breaking change)

---

**Happy coding! 🚀**

*Perpustakaan Jendela Ilmu — Membuka Jendela Ilmu untuk Semua*
