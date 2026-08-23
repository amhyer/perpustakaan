# 🏆 Reward System — Mockup Design & Specification

**Tahap:** B (UI Mockup)
**Tanggal:** 23 Agustus 2026
**Branch:** `arena/01a0285b-perpustakaan`

## 📂 Files

- **`index.html`** — Mockup interaktif 5 view utama (buka di browser)
- **`README.md`** — File ini — spesifikasi & catatan desain

## 🖼️ 5 View yang Di-mockup

| # | View | Untuk | Tujuan |
|---|------|-------|--------|
| 1 | **Widget "Poin Saya"** | Siswa | Real-time, always-visible di dashboard |
| 2 | **Katalog Hadiah** | Siswa/Guru | Browse & klaim hadiah |
| 3 | **Riwayat Klaim** | Siswa/Guru | Track status klaim sendiri |
| 4 | **Approval Queue** | Pustakawan | Approve/reject klaim masuk |
| 5 | **Analytics Dashboard** | Pustakawan | Laporan ke kepala sekolah |

> **Catatan:** Setelah Sprint 2, ada view tambahan **"Scan & Deliver"** untuk pustakawan yang tidak ada di mockup awal. View ini ditambahkan berdasarkan feedback bahwa pustakawan butuh cara cepat untuk memvalidasi pickup code saat siswa datang ke perpustakaan.

## 🎨 Design Decisions

### Color Palette
- **Primary:** Biru navy `#1e3a5f` (sesuai brand Jendela Ilmu)
- **Accent:** Amber/oranye untuk poin (warna "emas" → universal untuk reward)
- **Success:** Hijau `#10b981` (status disetujui)
- **Warning:** Amber `#f59e0b` (perlu approval, stok hampir habis)
- **Error:** Merah `#ef4444` (ditolak, poin kurang)

### Typography
- **Font:** Inter (sudah dipakai di seluruh app)
- **Weight:** 400 (body), 500-600 (subheading), 700-800 (heading)
- **Size:** 11-13px (UI elements), 14-16px (body), 24-30px (heading)

### Komponen Reusable (akan dibuat di Sprint 1)
1. `<PointBadge amount={245} />` — chip kecil "⭐ 245" (di header, sidebar)
2. `<PointWidget variant="compact" | "expanded" />` — widget poin saya
3. `<RewardCard reward={...} userPoints={...} />` — kartu di katalog
4. `<RedemptionTimeline status={...} />` — visualisasi 3 tahap
5. `<PickupCode code="..." />` — kode ambil dengan QR

## 📋 Spesifikasi per View

### View 1: Widget Poin Saya
**Trigger muncul:** Setiap kali user dengan role STUDENT/TEACHER buka dashboard
**Behavior:**
- Klik "Tukar Poin" → navigate ke `/rewards`
- Klik kartu → expand jadi mode detail
- Animasi progress bar saat poin naik (real-time via SSE)

**State kosong (user baru, 0 poin):**
```
┌──────────────────────────────────────┐
│  ⭐ Poin Saya: 0                     │
│  Mulai baca untuk kumpulkan poin!    │
│  📖 Pinjam buku pertama → +10 poin   │
└──────────────────────────────────────┘
```

### View 2: Katalog Hadiah
**Layout:** Grid 4 kolom di desktop, 2 di tablet, 1 di mobile
**Sorting default:** Featured → Poin terendah
**Filter yang tersedia:**
- Kategori (chips horizontal)
- Range poin (slider)
- Role (otomatis, dari user.role)
- "Hanya yang bisa diklaim" (toggle)
- Sort: Popular / Poin ↑ / Poin ↓

**State kartu:**
- Bisa diklaim (aktif) → tombol "Klaim"
- Poin kurang → overlay + tombol disabled
- Stok habis → overlay + tombol "🔔 Beritahu Saya"
- Cooldown → overlay + info "Tunggu X hari lagi"
- Max tercapai → overlay "Sudah pernah diklaim"

**Modal detail (saat klik kartu):**
- Gambar besar
- Nama + deskripsi lengkap
- Aturan (cooldown, max per member, dll)
- Stok tersedia
- Tombol "Klaim Sekarang" (atau "Tidak cukup poin")
- Catatan dari siswa (textarea)

### View 3: Riwayat Klaim
**Tabs:** Semua | Pending | Disetujui | Selesai | Ditolak
**Tiap item menampilkan:**
- Gambar hadiah (emoji/icon)
- Nama + status badge
- Poin yang dihabiskan
- Timeline visual (Diajukan → Disetujui → Diambil)
- Aksi (Batalkan / Lihat Detail)
- **Kode ambil** (highlight, saat status = APPROVED)

**Aksi yang tersedia per status:**
| Status | Aksi yang bisa dilakukan siswa |
|---|---|
| PENDING | Batalkan klaim |
| APPROVED | Lihat kode, arahkan ke perpus |
| DELIVERED | Lihat detail (read-only) |
| REJECTED | Lihat alasan |
| CANCELLED | Hapus dari list |

### View 4: Approval Queue (Pustakawan)
**Tampilan:** List view dengan checkbox untuk bulk action
**Auto-flag warning system:**
- 🔴 Saldo tidak cukup (wajib reject)
- 🟡 Cooldown belum terpenuhi (warning, bisa override)
- 🟡 Stok hampir habis (warning)
- 🟢 First-time claimer (highlight, lebih teliti)
- 🟢 Anomali (loncat poin terlalu cepat)

**Filter & sort:**
- Tipe (Semua / Perlu approval saja / Anomali)
- Hadiah (dropdown)
- Tanggal (hari ini / minggu ini / bulan ini)

**Aksi per item:**
- Setujui (tombol hijau besar) → stok -1, status → APPROVED
- Tolak → modal alasan (textarea required) → status → REJECTED, poin REFUND
- Lihat profil siswa (modal)
- Lihat history klaim siswa

### View 5: Analytics Dashboard
**KPI Cards (4 utama):**
- 💰 Total poin beredar
- 📈 Poin masuk bulan ini (vs bulan lalu)
- 🎁 Total klaim (breakdown: siswa vs guru)
- ⚠️ Stok hampir habis (count)

**Charts:**
- Top 10 leaderboard (siswa + guru)
- Hadiah terlaris (bar chart horizontal)
- Trend klaim harian (line chart 30 hari)
- Distribusi poin per kelas (optional)

**Export:**
- CSV untuk semua data
- Print-friendly view untuk ditempel di mading

## 🛠️ Tech Stack untuk Implementasi

| Komponen | Library |
|---|---|
| Chart | Recharts (sudah ada di project) |
| QR Code | `qrcode` (untuk pickup code) |
| Icons | Lucide React (sudah ada) |
| Date formatting | `date-fns` (sudah ada) |
| Form | `react-hook-form` + `zod` (sudah ada resolvers) |
| State | Zustand (sudah ada `useAppStore`) |
| Animation | Framer Motion (sudah ada) |

## 🎯 Acceptance Criteria untuk Sprint 1

- [ ] User bisa lihat poin real-time di dashboard
- [ ] User bisa browse katalog hadiah
- [ ] User bisa klaim hadiah → dapat kode ambil
- [ ] Pustakawan bisa approve/reject klaim
- [ ] Hook otomatis: buku dikembalikan → poin bertambah
- [ ] Anti-cheat: buku <50 halaman tidak dapat poin
- [ ] Anti-cheat: pinjam <2 hari tidak dapat poin
- [ ] Test: minimal 1 happy path + 1 edge case per API

## 📐 Responsive Breakpoints

| Breakpoint | Grid Katalog | Widget Poin |
|---|---|---|
| Mobile (<640px) | 1 kolom, full-width | Full, stacked |
| Tablet (640-1024px) | 2 kolom | Compact di header |
| Desktop (>1024px) | 4 kolom | Expanded di sidebar |

## ♿ Accessibility Checklist

- [ ] Color contrast minimal 4.5:1 untuk text
- [ ] Tombol punya `aria-label` yang jelas
- [ ] Status pakai icon + text (bukan color only)
- [ ] Focus state visible untuk keyboard nav
- [ ] Pickup code bisa di-copy dengan keyboard
- [ ] Screen reader: live region untuk "Poin bertambah!"

## 🔄 Status Flow Diagram

```
SISWA FLOW:
  ┌─────────┐   submit    ┌─────────┐  approve   ┌──────────┐ deliver ┌──────────┐
  │ Browse  │ ──────────► │ PENDING │ ────────► │ APPROVED │ ──────► │ DELIVERED│
  │ Catalog │             │         │            │          │         │          │
  └─────────┘             └─────────┘            └──────────┘         └──────────┘
                              │                       │
                              │ reject                │ cancel
                              ▼                       ▼
                          ┌─────────┐            ┌─────────┐
                          │REJECTED │            │CANCELLED│
                          │ (refund)│            │ (refund)│
                          └─────────┘            └─────────┘

PUSTAKAWAN FLOW:
  ┌─────────┐  see queue  ┌─────────┐ approve  ┌──────────┐
  │ Review  │ ─────────► │ Click   │ ───────► │ Wait for │
  │ Queue   │            │ Approve │           │ Student  │
  └─────────┘            └─────────┘           └──────────┘
                              │ reject              │ present
                              ▼                     │ code
                          ┌─────────┐               ▼
                          │ Refund  │         ┌──────────┐
                          │ Points  │         │ DELIVERED│
                          └─────────┘         └──────────┘
```

## 🚀 Sprint Plan

Lihat detail di file terpisah. Singkatnya:

- **Sprint 1 (1-2 minggu):** Database ✅, API, Widget, Katalog, Riwayat
- **Sprint 2 (1-2 minggu):** Approval Queue, Pickup Code, Notifikasi
- **Sprint 3 (1 minggu):** Analytics, Anti-cheat polish, Tests

Total: **3-5 minggu** untuk production-ready.

## 📞 Mau Review?

Buka `index.html` di browser untuk melihat mockup. Setelah review, kita lanjut ke **Tahap C: Implementasi Sprint 1** (coding API + UI components yang sebenarnya).

Pertanyaan untuk ditinjau:
1. **Visual design** — warna, layout, spacing sudah oke?
2. **Information architecture** — field yang ditampilkan cukup/kurang?
3. **Status flow** — ada edge case yang belum ditangani?
4. **Approval workflow** — bulk action perlu? auto-approve untuk poin kecil?
5. **Anti-cheat** — rule 2 hari minimal & 50 halaman minimal cukup?

Silakan kasih feedback, kita refine sebelum mulai coding! 🚀
