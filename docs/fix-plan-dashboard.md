# 📋 Rencana Perbaikan Dashboard — Prioritas Kritis → Rendah

> **Konteks**: Audit menemukan 4 dashboard dengan total **2.719 baris kode** dan 6 masalah. Rencana ini disusun berurutan dari yang paling kritis (rusak/berdampak luas) sampai yang paling rendah (nice-to-have).

---

## 🔴 TIER 1 — KRITIS (RUSAK / BUG AKTIF)

### Fix #1: Bug auto-routing `setUser()` — `MyDashboardView` selalu `student`
**Lokasi**: `src/store/use-app-store.ts` baris 79-87
**Dampak**: 🔴 **Guru masuk → dapat tampilan Siswa** karena:
- Store hanya set `view.key` ke `"my-dashboard"`, tidak ada info variant
- `MyDashboardView` default-nya `variant="student"` (line 122 di `my-dashboard-view.tsx`)
- `page.tsx` sebenarnya sudah handle ini: `variant={user.role === "TEACHER" ? "teacher" : "student"}` ✅
- **Risiko tersisa**: kalau ada navigasi langsung via `setView("my-dashboard")` tanpa argumen (misal sidebar/header), variant jatuh ke `student`. Ini **bug laten**.

**Solusi**:
```typescript
// use-app-store.ts — tambahkan dashboardVariant
view: { key, params, dashboardVariant: u?.role === "TEACHER" ? "teacher" : "student" }

// page.tsx
case "my-dashboard":
  return <MyDashboardView variant={view.params.variant as "teacher"|"student" || user.role === "TEACHER" ? "teacher" : "student"} />;
```

**Estimasi**: 15 menit · 2 file · 0 risiko regression

---

### Fix #2: Duplikasi 60% — `DashboardView` & `CustomizableDashboardView` pakai API sama
**Lokasi**:
- `src/components/app/views/dashboard-view.tsx` (1.098 baris)
- `src/components/app/views/customizable-dashboard-view.tsx` (607 baris)

**Dampak**: 🔴 **+607 baris kode redundant** yang sulit dipelihara. Keduanya fetch `/api/stats` dan render widget serupa (Stat Cards, Top Books, Recent Loans, Charts).

**Solusi**:
1. Ekstrak widget individual ke `src/components/app/dashboard/widgets/`:
   - `stat-card.tsx`
   - `area-chart-widget.tsx`
   - `donut-chart-widget.tsx`
   - `top-books-widget.tsx`
   - `recent-loans-widget.tsx`
   - `quick-actions-widget.tsx`
2. `DashboardView` jadi layout **fixed grid** yang menyusun widget-widget di atas
3. `CustomizableDashboardView` jadi layout **drag-and-drop** yang merender widget dari array `localStorage`
4. Keduanya import dari folder `widgets/` yang sama

**Estimasi**: 4-6 jam · ~400 baris savings · 0 perubahan API · perlu update test di `tests/views/customizable-dashboard.test.tsx`

---

### Fix #3: Bug duplikat `case` di `page.tsx` (line 117-118)
**Lokasi**: `src/app/page.tsx` baris 117
**Dampak**: 🔴 **Dead code / unreachable** — `return <ReportsView />` muncul 2x dalam case `"reports"`. Tidak menyebabkan runtime error tapi membingungkan dan indikasi kelalaian.

**Solusi**:
```typescript
// Hapus baris 118 yang duplikat
case "reports":
  return <ReportsView />;
case "report-builder":
  return <ReportBuilderView />;
```

**Estimasi**: 1 menit · 1 baris dihapus

---

## 🟠 TIER 2 — TINGGI (UX BROKEN / AKSES TIDAK SEMESTINYA)

### Fix #4: Sidebar bocor — `PUSTAKAWAN_JUNIOR` lihat menu "Dashboard Eksekutif"
**Lokasi**: `src/components/app/layout/sidebar.tsx` baris 84-87
**Dampak**: 🟠 Junior Librarian punya akses ke menu `executive-dashboard` yang seharusnya hanya untuk Kepala Sekolah. Menu `settings` sudah benar disembunyikan, tapi `executive-dashboard` lupa.

**Solusi**:
```typescript
// Tambahkan filter sama seperti settings
const fullNav = isLibrarianRole
  ? LIBRARIAN_NAV.filter((item) => {
      if (user?.role === "PUSTAKAWAN_JUNIOR") {
        return item.key !== "settings" && item.key !== "executive-dashboard";
      }
      return true;
    })
  : MEMBER_NAV;
```

**Catatan**: Menu `executive-dashboard` sebenarnya hanya relevan untuk role `LIBRARIAN` senior (kepala perpustakaan). Untuk konsistensi, pertimbangkan juga hide dari `LIBRARIAN` biasa dan hanya tampilkan untuk role khusus `HEADMASTER` / `PRINCIPAL` (cek apakah role ini ada di schema).

**Estimasi**: 5 menit · 4 baris · perlu cek role `HEADMASTER` di `prisma/schema.prisma`

---

### Fix #5: Sidebar `LIBRARIAN_NAV` punya **2 import icon tidak terpakai** & icon `FileText` tidak di-import
**Lokasi**: `src/components/app/layout/sidebar.tsx` baris 1-37 & 84
**Dampak**: 🟠 Build warning / runtime error potential. `FileText` dipakai di line 84 tapi tidak ada di import.

**Solusi**: Tambah `FileText` ke import, hapus icon unused (jika ada).

**Estimasi**: 2 menit

---

## 🟡 TIER 3 — SEDANG (PEMELIHARAAN / KUALITAS)

### Fix #6: `MyDashboardView` Guru vs Siswa hanya beda 2 elemen
**Lokasi**: `src/components/app/views/my-dashboard-view.tsx` (736 baris)
**Dampak**: 🟡 736 baris view untuk 2 role yang hamper identik. Pemeliharaan sulit.

**Solusi**: Refactor jadi **role-specific sections**:
- **Guru** melihat:
  - "📚 Buku untuk Mata Pelajaran Anda" (buku rekomendasi berdasarkan mapel)
  - "👨‍🎓 Statistik Kelas yang Anda Ajar" (jumlah siswa yang pinjam, kelas aktif)
  - "📖 Pinjaman Siswa yang Perlu Perhatian" (overdue siswa)
- **Siswa** melihat:
  - "📈 Progress Baca Saya" (target baca tahunan)
  - "👥 Teman Sekelas yang Aktif" (leaderboard mini)
  - "🎯 Rekomendasi Buku untuk Saya" (sudah ada)
- **Common**: Pinjaman saya, Pengumuman, Rekomendasi

**Estimasi**: 6-8 jam · butuh query baru `/api/dashboard/teacher-stats` (jika kelas mapping ada)

---

### Fix #7: Tidak ada role-specific empty state
**Lokasi**: Semua 4 view
**Dampak**: 🟡 Saat data kosong (misal: tidak ada pinjaman), tampilannya generik. User baru bingung harus mulai dari mana.

**Solusi**: Buat komponen `<DashboardEmptyState role={...} />`:
- LIBRARIAN dengan 0 buku → CTA "Tambah Buku Pertama"
- GURU tanpa pinjaman → CTA "Jelajahi Katalog"
- SISWA tanpa pinjaman → CTA "Pinjam Buku Pertamamu"

**Estimasi**: 3-4 jam · reusable component

---

## 🟢 TIER 4 — RENDAH (NICE-TO-HAVE)

### Fix #8: Tambah indikator "Tipe Akun" di header dashboard
**Lokasi**: `dashboard-view.tsx`, `my-dashboard-view.tsx`, `executive-dashboard-view.tsx`
**Dampak**: 🟢 Polish UX. User langsung tahu mereka melihat dashboard mana.

**Solusi**: Tambah badge kecil di header:
```tsx
<Badge variant="outline" className="gap-1">
  <Library className="h-3 w-3" />
  Dashboard Pustakawan
</Badge>
```

**Estimasi**: 30 menit · 3 file

---

### Fix #9: Preferensi "Default Dashboard" per user
**Lokasi**: `src/app/api/users/preferences/route.ts` (perlu dibuat) + `use-app-store.ts`
**Dampak**: 🟢 Power user feature. Librarian bisa pilih untuk selalu mulai dari `customizable-dashboard` bukan `dashboard` default.

**Solusi**:
1. Tambah kolom `defaultDashboard` di tabel `User` (Prisma migration)
2. Tambah API `GET/PUT /api/users/me/preferences`
3. Store baca preferensi di `setUser()`

**Estimasi**: 4-5 jam · butuh migration · mungkin baru bisa di M3

---

### Fix #10: `executive-dashboard-view.tsx` (278 baris) — pisah jadi komponen kecil
**Lokasi**: `executive-dashboard-view.tsx`
**Dampak**: 🟢 Konsistensi. View ini satu-satunya yang masih monolitik.

**Solusi**: Pisah jadi `KpiCard`, `MonthlyTrendChart`, `TopMembersList` di folder `widgets/`. Bisa paralel dengan Fix #2.

**Estimasi**: 2 jam (subset dari Fix #2)

---

## 📊 Ringkasan Prioritas

| # | Tier | Fix | File | Estimasi | Dampak |
|---|------|-----|------|----------|--------|
| 1 | 🔴 Kritis | Auto-routing variant bug | `use-app-store.ts` | 15 mnt | Guru salah tampilan |
| 2 | 🔴 Kritis | Konsolidasi dashboard widgets | `views/dashboard-view.tsx`, `views/customizable-dashboard-view.tsx` | 4-6 jam | -400 baris kode |
| 3 | 🔴 Kritis | Duplikat `return <ReportsView />` | `app/page.tsx` | 1 mnt | Dead code |
| 4 | 🟠 Tinggi | Hide "Eksekutif" dari Junior | `layout/sidebar.tsx` | 5 mnt | Akses menu bocor |
| 5 | 🟠 Tinggi | Missing import `FileText` | `layout/sidebar.tsx` | 2 mnt | Potensi build error |
| 6 | 🟡 Sedang | Guru vs Siswa lebih distinct | `views/my-dashboard-view.tsx` | 6-8 jam | UX clarity |
| 7 | 🟡 Sedang | Role-specific empty states | `views/*.tsx` (baru) | 3-4 jam | Onboarding |
| 8 | 🟢 Rendah | Badge "Tipe Akun" | `views/*.tsx` | 30 mnt | Polish |
| 9 | 🟢 Rendah | Preferensi default dashboard | `prisma/schema.prisma`, API baru | 4-5 jam | Power user |
| 10 | 🟢 Rendah | Pisah ExecutiveDashboardView | `views/executive-dashboard-view.tsx` | 2 jam | Konsistensi |

**Total estimasi**: ~22-29 jam kerja

---

## 🚀 Rekomendasi Urutan Eksekusi

### Sprint 1 (Quick Wins — < 1 jam)
1. Fix #3 (duplikat return) → 1 menit
2. Fix #5 (import FileText) → 2 menit
3. Fix #1 (variant bug) → 15 menit
4. Fix #4 (hide Eksekutif) → 5 menit
5. Fix #8 (badge role) → 30 menit
- **Total**: ~1 jam · 5 commit kecil · zero risk

### Sprint 2 (Refactor Utama — 1 hari)
6. Fix #2 (konsolidasi widgets) → 4-6 jam
7. Fix #10 (pecah ExecutiveDashboardView) → 2 jam (paralel)

### Sprint 3 (UX Polish — 1-2 hari)
8. Fix #6 (Guru vs Siswa distinct) → 6-8 jam
9. Fix #7 (empty states) → 3-4 jam

### Sprint 4 (Power User — nanti)
10. Fix #9 (preferensi default) → 4-5 jam · M3

---

## ✅ Metode Verifikasi
- `bun run lint` lulus tanpa warning
- `bun run test` lulus 420+ test cases (cek tidak ada test yang rusak)
- Manual: login sebagai PUSTAKAWAN_JUNIOR, TEACHER, STUDENT, LIBRARIAN — pastikan routing benar
- Visual: 4 dashboard tampil jelas berbeda

---

**Dibuat**: 2026-08-22 · **Status**: Menunggu approval user untuk mulai Sprint 1
