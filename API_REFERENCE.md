# API Reference — Perpustakaan Jendela Ilmu

Dokumentasi lengkap REST API endpoints. Total: **62+ endpoints** (akan bertambah seiring waktu).

## 🔐 Authentication

Semua endpoint (kecuali beberapa public) memerlukan session cookie `ji_session`. Cookie di-set otomatis saat login sukses.

### Public Endpoints (tanpa auth)
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/2fa/verify`
- `POST /api/visitors` (kiosk mode)
- `GET /api/uploads/[...file]`

### API Key Authentication (untuk integrasi eksternal)

```
Authorization: Bearer ji_live_xxxxxxxx
```

Lihat `/api-keys` UI untuk generate key.

---

## 📑 Daftar Endpoint

### Auth (6 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login dengan email + password |
| POST | `/api/auth/logout` | Session | Logout (hapus session) |
| GET | `/api/auth/me` | Session | Current user info |
| PUT | `/api/auth/change-password` | Session | Ganti password |
| POST | `/api/auth/forgot-password` | Public | Minta link reset |
| POST | `/api/auth/reset-password` | Public | Reset password dengan token |
| POST | `/api/auth/2fa/setup` | LIBRARIAN | Mulai setup 2FA |
| POST | `/api/auth/2fa/confirm` | LIBRARIAN | Konfirmasi kode 2FA |
| POST | `/api/auth/2fa/verify` | Public | Verifikasi kode saat login |
| GET | `/api/auth/2fa/status` | LIBRARIAN | Status 2FA user |
| GET | `/api/auth/sessions` | Session | Daftar sesi aktif |
| DELETE | `/api/auth/sessions/[id]` | Session | Hapus sesi tertentu |
| POST | `/api/auth/sessions` | Session | Logout semua device |

### Books (10 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/books` | Session | List buku (support query: `q`, `category`, `location`, `page`) |
| POST | `/api/books` | LIBRARIAN | Tambah buku baru |
| GET | `/api/books/[id]` | Session | Detail buku |
| PUT | `/api/books/[id]` | LIBRARIAN | Update buku |
| DELETE | `/api/books/[id]` | LIBRARIAN | Hapus buku |
| GET | `/api/books/[id]/items` | Session | Daftar eksemplar |
| GET | `/api/books/[id]/reviews` | Session | Daftar review |
| POST | `/api/books/[id]/reviews` | Member | Tambah review |
| GET | `/api/books/[id]/attachments` | Session | Daftar lampiran |
| POST | `/api/books/[id]/attachments` | LIBRARIAN | Upload lampiran |
| DELETE | `/api/books/[id]/attachments/[attachmentId]` | LIBRARIAN | Hapus lampiran |
| POST | `/api/books/lookup` | LIBRARIAN | Lookup ISBN (Google Books) |
| GET | `/api/books/recommendations` | Member | Rekomendasi buku |
| POST | `/api/books/import-sibi` | LIBRARIAN | Import dari SIBI |
| POST | `/api/books/transfer` | LIBRARIAN | Pindahkan eksemplar |
| GET | `/api/books/transfers` | LIBRARIAN | Riwayat pemindahan |

### Book Items (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/book-items/[itemId]/report-damage` | LIBRARIAN | Lapor kerusakan/hilang |

### Categories (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/categories` | Session | List kategori (cached 5min) |
| POST | `/api/categories` | FullLibrarian | Tambah kategori |

### Locations (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/locations` | Session | List rak (cached 5min) |
| POST | `/api/locations` | FullLibrarian | Tambah rak |

### Members (3 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/members` | LIBRARIAN / TEACHER | List anggota. Guru hanya siswa di `taughtClasses`. |
| POST | `/api/members` | LIBRARIAN | Tambah anggota (`taughtClasses` untuk guru) |
| GET | `/api/members/[id]` | Session | Detail; siswa hanya diri sendiri; guru juga siswa di kelas ajarnya |
| PUT | `/api/members/[id]` | Session | Update; non-staf hanya profil sendiri (`taughtClasses` guru) |
| DELETE | `/api/members/[id]` | FullLibrarian | Nonaktifkan anggota |
| POST | `/api/members/import` | LIBRARIAN | Import CSV (max 500 baris) |

### Loans / Sirkulasi (7 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/loans` | Session | List peminjaman (anggota hanya milik sendiri) |
| POST | `/api/loans` | LIBRARIAN | Buat peminjaman baru |
| GET | `/api/loans/[id]` | Session | Detail peminjaman |
| PUT | `/api/loans/[id]/return` | LIBRARIAN | Kembalikan buku |
| POST | `/api/loans/[id]/renew` | Session | Perpanjang peminjaman |
| POST | `/api/loans/[id]/pay-fine` | LIBRARIAN | Bayar denda |
| GET | `/api/loans/active-by-item-code` | LIBRARIAN | Cari peminjaman aktif by barcode |
| GET | `/api/loans/history` | Session | Riwayat (own / all) |

### Batch Operations (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/batch/checkout` | LIBRARIAN | Pinjam banyak sekaligus |
| POST | `/api/batch/return` | LIBRARIAN | Kembalikan banyak sekaligus |

### Reservations (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/reservations` | Session | List reservasi |
| POST | `/api/reservations` | Member | Buat reservasi |
| DELETE | `/api/reservations` | Session | Batalkan reservasi |
| GET | `/api/reservations/queue` | Session | Antrian reservasi per buku |

### Wishlist (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/wishlist` | Member | Wishlist sendiri |
| POST | `/api/wishlist` | Member | Tambah ke wishlist |
| DELETE | `/api/wishlist` | Member | Hapus dari wishlist |

### Proposals / Usulan (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/proposals` | Session | List usulan (anggota hanya milik sendiri) |
| POST | `/api/proposals` | Member | Ajukan buku |
| PUT | `/api/proposals` | LIBRARIAN | Review usulan |
| DELETE | `/api/proposals` | LIBRARIAN | Hapus usulan |

### Announcements (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/announcements` | Session | List pengumuman |
| POST | `/api/announcements` | LIBRARIAN | Buat pengumuman (broadcast WA/email) |
| PUT | `/api/announcements` | LIBRARIAN | Update |
| DELETE | `/api/announcements` | FullLibrarian | Hapus |

### Notifications (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Session | Notifikasi user |
| POST | `/api/notifications` | Session | Mark as read / count unread |
| GET | `/api/notifications/log` | LIBRARIAN | Log notifikasi sistem |

### Reviews (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| DELETE | `/api/reviews/[id]` | Member | Hapus review sendiri |

### Rooms & Bookings (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/rooms` | Session | List ruangan (+ bookings per tanggal) |
| POST | `/api/rooms` | LIBRARIAN | Tambah ruangan |
| PUT | `/api/rooms/[id]` | LIBRARIAN | Update ruangan |
| DELETE | `/api/rooms/[id]` | LIBRARIAN | Nonaktifkan |
| GET | `/api/room-bookings` | Session | List booking |
| POST | `/api/room-bookings` | Member | Buat booking |
| DELETE | `/api/room-bookings/[id]` | Session | Batalkan booking |

### Visitors (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/visitors` | LIBRARIAN | List kunjungan |
| POST | `/api/visitors` | Public | Check-in (untuk kiosk) |
| PATCH | `/api/visitors/[id]/checkout` | LIBRARIAN | Check-out |

### Assets (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/assets` | LIBRARIAN | List aset |
| POST | `/api/assets` | LIBRARIAN | Tambah aset |
| PUT | `/api/assets/[id]` | LIBRARIAN | Update |
| DELETE | `/api/assets/[id]` | LIBRARIAN | Hapus |
| GET | `/api/asset-loans` | LIBRARIAN | List peminjaman aset |
| POST | `/api/asset-loans` | LIBRARIAN | Pinjam aset |
| PUT | `/api/asset-loans/[id]/return` | LIBRARIAN | Kembalikan aset |

### Stats & Reports (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/stats` | LIBRARIAN | Dashboard stats |
| GET | `/api/reports/literacy` | LIBRARIAN / TEACHER | Laporan literasi. Guru hanya kelas yang diajar. |
| GET | `/api/dashboard/member` | TEACHER / STUDENT | Beranda anggota. Guru hanya siswa di `taughtClasses`. |
| GET | `/api/executive` | LIBRARIAN | Dashboard eksekutif |

### Stocktaking (4 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/stocktaking` | LIBRARIAN | List sesi stock opname |
| POST | `/api/stocktaking` | LIBRARIAN | Buat sesi baru |
| GET | `/api/stocktaking/[id]` | LIBRARIAN | Detail sesi |
| POST | `/api/stocktaking/[id]/scan` | LIBRARIAN | Scan barcode |
| POST | `/api/stocktaking/[id]/close` | LIBRARIAN | Tutup sesi |
| POST | `/api/stocktaking/[id]/confirm-lost` | LIBRARIAN | Konfirmasi hilang |

### Authors & Publishers (4 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/authors` | Session | List master pengarang |
| POST | `/api/authors` | FullLibrarian | Tambah |
| DELETE | `/api/authors/[id]` | FullLibrarian | Hapus |
| GET | `/api/publishers` | Session | List master penerbit |
| POST | `/api/publishers` | FullLibrarian | Tambah |
| DELETE | `/api/publishers/[id]` | FullLibrarian | Hapus |

### Holidays (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/holidays` | Session | List hari libur |
| POST | `/api/holidays` | FullLibrarian | Tambah |
| DELETE | `/api/holidays/[id]` | FullLibrarian | Hapus |

### Settings (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/settings` | Session | Get all settings |
| PUT | `/api/settings` | FullLibrarian | Update settings |

### Upload (3 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/upload` | LIBRARIAN | Upload cover image |
| GET | `/api/uploads/[...file]` | Public | Serve file (gated by path) |

### Audit & Error Logs (3 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/audit-log` | LIBRARIAN | Lihat jejak aktivitas |
| GET | `/api/error-log` | FullLibrarian | Lihat error log |
| PATCH | `/api/error-log/[id]` | FullLibrarian | Mark as resolved |
| DELETE | `/api/error-log/[id]` | FullLibrarian | Hapus entry |
| POST | `/api/error-log/client` | Public | Receive client error |

### Gamification (3 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/gamification` | Session | Stats gamifikasi user |
| POST | `/api/gamification/goal` | Member | Set target baca |
| GET | `/api/gamification/leaderboard` | Session | Leaderboard |

### Book Transfer (already in books)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/books/transfer` | LIBRARIAN | Pindahkan antar-rak |
| GET | `/api/books/transfers` | LIBRARIAN | Riwayat |

### Cron (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/cron/daily-tasks` | Bearer (CRON_SECRET) | Reminder + reservation queue |
| GET | `/api/cron/backup-db` | Header (X-Cron-Secret) | Backup database |

### Admin (1 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/backup` | FullLibrarian | Download backup DB |

### API Keys (2 endpoint)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/api-keys` | FullLibrarian | List API key |
| POST | `/api/api-keys` | FullLibrarian | Buat API key baru |
| PATCH | `/api/api-keys/[id]` | FullLibrarian | Update (enable/disable) |
| DELETE | `/api/api-keys/[id]` | FullLibrarian | Hapus (soft) |

---

## 📋 Response Format

### Success

```json
{
  "data": { ... },
  "pagination": { "total": 100, "page": 1, "pageSize": 20 }
}
```

### Error

```json
{
  "error": "Pesan error dalam Bahasa Indonesia",
  "details": "..." // optional
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (belum login) |
| 403 | Forbidden (tidak punya akses) |
| 404 | Not Found |
| 409 | Conflict (duplicate / overlap) |
| 429 | Too Many Requests (rate limit) |
| 500 | Server Error |
| 503 | Service Unavailable (env not set) |

---

## 🔒 Security Headers

Setiap response menyertakan:

```
X-Cache: HIT | MISS  # untuk cached endpoint
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
Retry-After: 60
```

---

## 📊 Pagination

Untuk endpoint list yang besar:

```
GET /api/books?page=1&pageSize=20
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

---

## 🎯 Contoh: Full Loan Flow

### 1. Create Loan
```bash
curl -X POST https://perpustakaan.sekolah.sch.id/api/loans \
  -H "Content-Type: application/json" \
  -H "Cookie: ji_session=..." \
  -d '{
    "memberId": "member-123",
    "bookItemId": "item-456"
  }'
```

Response:
```json
{
  "loan": {
    "id": "loan-789",
    "memberId": "member-123",
    "bookItemId": "item-456",
    "loanDate": "2026-08-22T10:00:00Z",
    "dueDate": "2026-08-29T10:00:00Z",
    "status": "LOANED",
    "fineAmount": 0,
    "renewedCount": 0
  }
}
```

### 2. Return Book (with damage)
```bash
curl -X PUT https://perpustakaan.sekolah.sch.id/api/loans/loan-789/return \
  -H "Content-Type: application/json" \
  -H "Cookie: ji_session=..." \
  -d '{
    "condition": "RUSAK_RINGAN",
    "conditionNote": "Halaman 45 sobek"
  }'
```

Response:
```json
{
  "loan": { "status": "RETURNED", "fineAmount": 53000 },
  "fine": 53000,
  "nextReservation": null
}
```

---

## 🔄 Caching

Beberapa endpoint di-cache di server (in-memory TTL):

| Endpoint | TTL | Invalidated by |
|---|---|---|
| `/api/categories` | 5 min | POST `/api/categories` |
| `/api/locations` | 5 min | POST `/api/locations` |

Cek header `X-Cache: HIT` untuk tahu response dari cache.

---

## 🧪 Testing Endpoint

Gunakan tool seperti:
- **curl** (terminal)
- **Postman** (GUI)
- **Insomnia** (GUI)
- **HTTPie** (terminal modern)

Atau gunakan **client SDK** yang ada di frontend:
```typescript
import { api } from "@/lib/api-client";
const data = await api.get("/api/books");
```

---

*Dokumentasi ini auto-generated. Untuk update terbaru, baca langsung source code di `src/app/api/`.*
te terbaru, baca langsung source code di `src/app/api/`.*
