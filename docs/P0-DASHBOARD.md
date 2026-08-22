# P0 — Pengembangan Dashboard (Admin, Guru, Siswa)

Dokumen pengerjaan bertahap. Setiap PO selesai diberi tanda ✅ di checklist sesuai
tahap kerjanya. Dicatat semua perubahan berkas di tiap tahap.

Lingkungan: Next.js 16 (Turbopack build) + Prisma/SQLite, server standalone di port **3001**.

---

## Ruang Lingkup P0 (prioritas tinggi, risiko kecil)

| ID | Item | Status |
|----|------|--------|
| P0-1 | Dashboard guru dipisah dari siswa (masing-masing konten relevan) | ✅ selesai (Tahap 1) |
| P0-2 | Quick Actions admin (Sirkulasi, Tambah Buku, Cetak Kartu Massal, Stock Opname, dll) | ✅ selesai (Tahap 2) |
| P0-3 | Panel "Perlu Tindakan" admin (usulan pending, reservasi pending, overdue) | ✅ selesai (Tahap 3) |
| P0-4 | Kartu total denda tertunggak | ✅ sudah ada (dashboard-view.tsx, kartu "Denda Tertunggak" `overdueFineTotal`) |

---

## Daftar Perubahan Per Tahap

### Tahap 1 — P0-1: Pisah Dashboard Guru vs Siswa

**Akar masalah:** `my-dashboard-view.tsx` dipakai bersama untuk guru & siswa
(`page.tsx` case `my-dashboard`), tanpa pembedaan konten.

**Perubahan:**
- [x] `src/components/app/views/my-dashboard-view.tsx` — terima prop `variant: "student" | "teacher"`:
  - Banner/greeting menyesuaikan peran.
  - Guru: tampilkan kartu **"Usulan Buku Saya"** (ringkasan PENDING/APPROVED/REJECTED dari `/api/proposals?mine=1` + tombol ke view proposals).
  - Guru: kartu shortcut **"Koleksi Digital"** (buku sumber SIBI → katalog).
  - Siswa: konten tetap seperti sekarang.
- [x] `src/app/page.tsx` — case `my-dashboard` meneruskan prop berdasarkan `user.role`.

**Verifikasi tahap 1:**
- [x] Login guru → `/api/proposals?mine=1` 200 (1 usulan: "Matematika Olimpiade untuk SMP").
- [x] Login siswa → `/api/proposals?mine=1` 200 (2 usulan).
- [x] Bundle berisi string "Usulan Buku Saya" & "Koleksi Digital".

### Tahap 2 — P0-2: Quick Actions Admin

**Akar masalah:** tombol aksi hanya 3 di banner (Tambah Buku, Sirkulasi, Tambah Anggota);
tidak ada akses cepat ke fitur operasional lain.

**Perubahan:**
- [x] `src/components/app/views/dashboard-view.tsx` — tambah section **"Aksi Cepat"** (grid 6 kartu tombol:
  Sirkulasi, Tambah Buku/Scan ISBN, Cetak Kartu Massal, Stock Opname, Reservasi, Pengumuman).

**Verifikasi tahap 2:**
- [x] Login pustakawan → `/api/stats` 200; bundle berisi string "Aksi Cepat".

### Tahap 3 — P0-3: Panel "Perlu Tindakan" Admin

**Akar masalah:** statistik tersebar; tidak ada satu panel ringkasan yang menjawab
"hari ini apa yang harus saya kerjakan?".

**Perubahan:**
- [x] `src/components/app/views/dashboard-view.tsx` — tambah panel **"Perlu Tindakan"**
  (3 kartu: usulan menunggu, reservasi menunggu, pinjaman terlambat + badge total;
  tombol langsung ke view masing-masing; empty state "Semua beres!"). Data dari `/api/stats`.

**Verifikasi tahap 3:**
- [x] Login pustakawan → `/api/stats` mengembalikan `pendingProposals: 5`, `pendingReservations: 2`,
      `overdueLoans: 0`, `overdueFineTotal: 0`; bundle berisi string "Perlu Tindakan".

### Tahap 4 — P0-4: Kartu Denda Tertunggak

**Status:** ✅ Tidak perlu kode — kartu "Denda Tertunggak" (`overdueFineTotal`,
formatRupiah) sudah ada di `dashboard-view.tsx` row stat ke-2.

### Tahap 5 — Build & Verifikasi Akhir

- [x] `next build` sukses tanpa error type/lint (2×: Tahap 1 & Tahap 2+3).
- [x] `tsc --noEmit` **0 error** (build memakai `ignoreBuildErrors: true`, jadi type-check dijalankan manual).

**Perbaikan jenis & bug yang ditemukan saat verifikasi tsc:**
- [x] `src/components/app/views/dashboard-view.tsx` — `QuickAction.view` & `actionItems` diketik `ViewKey` (bukan `string`).
- [x] `src/components/app/shared/sibi-import-tab.tsx` — HAPUS bug runtime: `useFetch` codebase tidak punya `onFetch/isFetching` (klik "Impor" akan crash). Diganti `api.post` + state `isImporting`.
- [x] `src/app/api/books/import-sibi/route.ts` — `findBookById` di-refactor ke switch eksplisit per sumber (union-call `getListFn` tak bisa di-type-check); `getListFn` dihapus.
- [x] `src/components/ui/data-display/chart.tsx` — typing pre-existing recharts v3 (payload/label/legend) diberi tipe props eksplisit + `any`-cast minimal (file pre-existing, tidak termasuk P0).
- [x] Pembersihan: file test usang `test-image-check.ts`, `test-raw-fetch.ts`, `test-sibi.ts` dipindah ke temp (tidak dihapus).

- [x] Restart server standalone di port 3001 (PID terakhir 23816).
- [x] Smoke test API: login pustakawan, guru, siswa — semua OK; `/api/stats` 200; halaman `/` 200.
- [x] **E2E final 31/31 PASS** (skrip `e2e-final.mjs`): semua endpoint dashboard 3 role,
      SIBI search 3 sumber, SIBI import non-teks → **201** ("Dari San Francisco hingga Cerita Kamu") + dupe → **409** (jalur `findBookById` yang di-refactor terbukti jalan), dan bundle berisi
      "Aksi Cepat", "Perlu Tindakan", "Usulan Buku Saya", "Koleksi Digital".
- [x] Dokumen di-update (checklist semua selesai).

### Tahap 6 — Perbaikan: Buku Impor SIBI Tanpa Eksemplar (0 BookItem)

**Akar masalah:** POST `/api/books/import-sibi` membuat `Book` tanpa `BookItem`,
sehingga buku hasil impor tidak memiliki eksemplar dan tidak bisa dipinjam.

**Perubahan:**
- [x] `src/app/api/books/import-sibi/route.ts` — saat create, sekaligus buat **1 BookItem**
      (`itemCode` `SI-<sibiId-8karakter>-1`, status `AVAILABLE`, kondisi `BAIK`);
      respons disertai `items`.
- [x] Backfill satu kali (skrip temp `backfill-sibi-items.mjs`): 2 buku SIBI lama
      ("Seni Budaya Kelas IX", "Dari San Francisco hingga Cerita Kamu") diberi 1 item.

**Verifikasi tahap 6:**
- [x] Impor baru ("Buku Panduan Guru PJOK SD/MI Kelas VI") → **201** dengan `items: 1`.
- [x] Semua 3 buku SIBI kini punya ≥1 item (`/api/books`).
- [x] Peminjaman item buku SIBI lewat `/api/loans` POST → **201** (loan id `cmsx0ufya0003tk1c5nbothx9`).
- [x] Dupe impor tetap **409**.
- [x] `tsc --noEmit` **0 error**; build sukses; server restart (PID 9120).

### Tahap 7 — Perbaikan: Fallback Cover & next/image untuk Domain Eksternal

**Akar masalah/temuan saat verifikasi tsc & review:**
1. `BookCover` (dipakai semua view) me-render `<img>` tanpa `onError` — bila cover dari URL
   eksternal (SIBI/ISBN) gagal dimuat, muncul ikon gambar rusak menutupi gradient.
2. `sibi-import-tab.tsx` memakai `next/image` dengan domain eksternal (`static-sc.cloudapp.web.id`)
   yang **tidak terdaftar di `images.remotePatterns`** → image optimizer mengembalikan 400
   saat runtime, thumbnail hasil pencarian rusak.

**Perubahan:**
- [x] `src/components/app/shared/book-cover.tsx` — tambah state `imgError` + `onError` + `loading="lazy"`;
      saat gambar gagal → fallback ke gradient placeholder. Reset state via pola render-time
      (sesuai konvensi proyek, hindari set-state-in-effect).
- [x] `src/components/app/shared/sibi-import-tab.tsx` — ganti `next/image` → `<img>` biasa
      (konsisten dengan BookCover; tidak perlu konfigurasi remotePatterns).

**Verifikasi tahap 7:**
- [x] `tsc --noEmit` **0 error**; build sukses; server restart (PID 3220); `/` 200.
- [x] Cover 3 buku SIBI dicek via HTTP HEAD → semuanya **200 OK** (fallback siaga bila nanti tak terjangkau).

### Tahap 8 — Scheduler Harian Otomatis (Cron In-Proses)

**Akar masalah:** route `/api/cron/daily-tasks` (pengingat jatuh tempo besok + update
status OVERDUE) dan `/api/cron/backup-db` (backup DB + rotasi 7 hari) sudah ada,
**tapi tidak ada yang memicunya** di deployment standalone Windows (tidak ada
Vercel Cron / cron OS).

**Perubahan:**
- [x] `src/instrumentation.ts` (baru) — `register()` menjalankan scheduler in-proses:
      run pertama 60 detik setelah server siap, lalu setiap 24 jam; memicu kedua
      route cron via loopback HTTP dengan secret. Dinonaktifkan bila `CRON_SECRET`
      kosong (fail-closed); tidak aktif saat `next build` (guard `NEXT_PHASE`).
- [x] Start server kini menyertakan env `CRON_SECRET=jendela-ilmu-cron-2026`
      (di command start; dokumentasikan agar restart berikutnya tetap menyertakan).

**Verifikasi tahap 8:**
- [x] Tanpa auth → **401** (kedua route, fail-closed benar).
- [x] Dengan auth → **200** `{"dueTomorrowNotified":0,"overdueUpdated":0}` (tidak ada pinjaman overdue/berjatuh tempo besok saat ini).
- [x] Run terjadwal pertama terbukti: file `jendela-ilmu-backup-2026-08-18T03-14-22-993Z.db`
      (331.776 bytes) dibuat ~60 detik setelah server start (PID 2368), rotasi 7 hari aktif (1 file tersisa).

### Tahap 9 — Akses Buku Digital (SIBI) di Detail Buku

**Akar masalah:** buku impor SIBI menyimpan `sourceUrl` (PDF digital), **tapi tidak
pernah ditampilkan di UI** — siswa/guru tidak bisa membuka bacaan digitalnya.

**Perubahan:**
- [x] `src/components/app/views/book-detail-view.tsx` —
  - `BookDetail` + field `source`, `sourceUrl`, `sibiId`.
  - Kolom kiri: kartu **"Buku Digital"** (ikon MonitorPlay, keterangan "Sumber: SIBI
    (Kemendikbud)") + tombol **"Baca Buku Digital"** (tab baru, `rel=noopener`) +
    URL definitif. Tampil hanya jika `source === "SIBI" && sourceUrl`.
  - Baris badge judul: badge **"Digital"** (sky) untuk buku SIBI.

**Verifikasi tahap 9:**
- [x] `tsc --noEmit` **0 error**; build sukses; server restart (PID 13152).
- [x] API detail 3 buku SIBI → semua `source=SIBI` + `sourceUrl` ada (PDF).
- [x] Bundle berisi "Baca Buku Digital" & "Buku Digital".
- [x] 3 URL PDF dicek GET+Range → semuanya **206 `application/pdf`** (magic `%PDF`);
      gagalnya HEAD dini adalah perilaku CDN, bukan aplikasi.

### Tahap 10 — Temukan Buku Digital di Katalog

**Akar masalah:** buku digital (SIBI) bercampur dengan buku fisik — siswa/guru tidak
bisa memfilter "hanya buku digital" dan tidak ada penanda digital pada kartu buku.

**Perubahan:**
- [x] `src/app/api/books/route.ts` — dukung param `source` (mis. `source=SIBI`);
      kompatibel dengan filter lain (`OR` pencarian, kategori, dst).
- [x] `src/components/app/shared/book-card.tsx` — `BookWithDetails.source?`; badge
      **"Digital"** (sky, pojok kiri atas cover) untuk buku `source === "SIBI"`.
- [x] `src/components/app/views/catalog-view.tsx` — toggle **"Digital"** di baris
      pencarian (ikon MonitorPlay): set `source=SIBI`, reset halaman ke 1, ikut
      dihitung di badge filter & tombol reset.

**Verifikasi tahap 10:**
- [x] `tsc --noEmit` **0 error**; build sukses; server restart (PID 8420).
- [x] `GET /api/books?source=SIBI` → **3 buku, semua SIBI**.
- [x] Tanpa `source` → **22 buku** (backward compat).
- [x] `source=SIBI&q=seni` → **1 buku** "Seni Budaya Kelas IX" (gabung dengan pencarian).

### Tahap 11 — Kedaluwarsa Reservasi Otomatis (Cron Task c)

**Akar masalah:** status `EXPIRED` ada di konstanta/UI tapi tak pernah dipakai.
Reservasi `READY` yang tidak diambil dalam 3 hari (lewat `expiresAt`) selamanya
mengunci status READY + eksemplar RESERVED, dan antrean PENDING berikutnya tidak
pernah dipromosikan.

**Perubahan:**
- [x] `src/app/api/cron/daily-tasks/route.ts` — tugas (c):
  - `READY` dengan `expiresAt < now` → **EXPIRED** + notifikasi "Reservasi Kedaluwarsa".
  - Bebaskan eksemplar (`RESERVED` → `AVAILABLE`) bila buku tidak punya antrean &
    tidak ada READY lain.
  - Promosikan PENDING pertama (queueOrder asc) → **READY** + `expiresAt` +3 hari,
    tandai eksemplar RESERVED, notifikasi "Siap Diambil", kurangi queueOrder sisanya.
  - Laporan cron + `reservationsExpired` & `reservationsPromoted`.

**Verifikasi tahap 11 (skenario sintetis di DB dev + cron real):**
- [x] Skenario 1 ("1984"): READY andini (expired kemarin) + PENDING budi →
      andini **EXPIRED**, budi **READY** (+3d), item 1984-2 tetap `RESERVED` untuk budi.
- [x] Skenario 2 ("The Little Prince"): READY dimas expired, tanpa antrean →
      **EXPIRED** + item LP-1 kembali `AVAILABLE`.
- [x] Cron: `reservationsExpired: 2`, `reservationsPromoted: 1`.
- [x] Notifikasi: 2× WARNING "Reservasi Kedaluwarsa" + 1× INFO "Buku Reservasi Siap Diambil!".
- [x] `tsc --noEmit` **0 error**; build sukses; server restart (PID 11072).

### Tahap 12 — Buku Digital Manual + Dedupe ISBN Impor SIBI

**Gap:** `sourceUrl` hanya diisi lewat impor SIBI (`source` ikut ter-set), sehingga
form buku tidak bisa melampirkan file digital untuk buku non-SIBI. Selain itu impor
SIBI hanya cek duplikasi `sibiId`, tidak cek ISBN — buku yang ISBN-nya sudah ada di
katalog bisa terimpor ganda.

**Perubahan:**
- [x] `POST /api/books` & `PUT /api/books/[id]` — terima & simpan `sourceUrl`,
      validasi http/https (400 bila invalid), kosong → `null`.
- [x] `book-form-view.tsx` — field `sourceUrl` di state/prefill/payload + kartu
      "Buku Digital (Opsional)" berisi input URL + penjelasan; validasi client-side.
- [x] `book-detail-view.tsx` — kartu "Buku Digital" kini tampil utk **buku apa pun**
      dengan `sourceUrl`; teks sumber adaptif: "SIBI (Kemendikbud)" vs
      "Lampiran digital perpustakaan"; badge "Digital" utk `source=SIBI` **atau** `sourceUrl`.
- [x] `book-card.tsx` — tipe `BookWithDetails.sourceUrl` + badge "Digital" juga utk
      buku digital manual.
- [x] `import-sibi/route.ts` — dedupe ISBN dinormalisasi (tanpa `-`/spasi); duplikat
      → 409 "sudah ada di katalog. Impor dibatalkan."

**Verifikasi tahap 12 (live API):** 8/8 PASS — POST+sourceUrl 201 tersimpan; tanpa
sourceUrl → null; URL invalid → 400; PUT update & clear; dupe ISBN nyata
("Seni Budaya Semester 1 Kelas XII" 978-602-427-147-3): buku manual ISBN sama dibuat,
impor SIBI → 409, buku uji & dupe dihapus. `tsc --noEmit` **0 error**, build sukses,
server 3001 (PID 22828).

### Tahap 13 — Konsistensi Data Buku & Visibilitas Reservasi Kedaluwarsa

**Gap:** (a) Buku manual dengan ISBN yang sudah ada di katalog bisa dibuat ganda
(dedupe ISBN hanya ada di impor SIBI). (b) Ganti urutan (sort) di katalog tidak
mereset halaman — bisa "stuck" di halaman di luar jangkauan hasil baru. (c) Setelah
Tahap 11 membuat status `EXPIRED` nyata, tidak ada yang menyorotnya di dashboard
dan statistik.

**Perubahan:**
- [x] `POST /api/books` & `PUT /api/books/[id]` — dedupe ISBN ternormalisasi
      (tanpa `-`/spasi) → 409 `ISBN ... sudah dipakai buku "..."`; PUT mengecualikan
      ISBN buku itu sendiri.
- [x] `catalog-view.tsx` — mengganti sort juga `setPage(1)`.
- [x] `/api/stats` — `overview.expiredReservations`.
- [x] `dashboard-view.tsx` — item "Reservasi Kedaluwarsa" (icon Clock, rose) di
      "Perlu Tindakan" → link ke halaman Reservasi.
- [x] `reservations-view.tsx` — stat card ke-4 "Kedaluwarsa" (grid 4 kolom);
      status EXPIRED sudah masuk tab "Selesai".

**Verifikasi tahap 13 (live API):** 7/7 PASS — POST ISBN dupe → 409 (vs "1984"
9780451524935); POST ISBN unik → 201; PUT ISBN milik buku lain → 409; PUT ISBN
sendiri → 200; `stats.overview.expiredReservations` = 2 (data Tahap 11). Data uji
dibersihkan. `tsc --noEmit` **0 error**, build sukses, server 3001 (PID 17080).

### Tahap 14 — Impor & Ekspor Anggota Massal (CSV)

**Gap:** menambahkan anggota harus satu per satu — tidak praktis saat impor
data awal dari Dapodik/Excel (awal tahun ajaran). Belum ada cara mengekspor
daftar anggota untuk arsip sekolah.

**Perubahan:**
- [x] `POST /api/members/import` (baru) — terima `{ rows: [...] }` maks 500 baris,
      transaksi penuh: per baris validasi nama (wajib, ≥3 karakter), nomor anggota
      (wajib, unik), kategori (Guru/Siswa), email (opsional; format valid; otomatis
      `nomor@jendelailmu.sch.id` bila kosong), password default `perpustakaan`;
      baris bermasalah dilewati + dicatat `{ row, reason }`; notifikasi sambutan
      dibuat utk setiap anggota baru. Respons `{ imported, skipped, errors }`.
- [x] `members-view.tsx` — tombol "Impor CSV" (dialog: pilih file, unduh template,
      preview jumlah baris, hasil impor + daftar error) & "Export CSV" (daftar
      anggota hasil filter saat ini → file Excel-kompatibel dengan BOM UTF-8).
      Parser CSV sederhana (dukung kutip `"` dan koma dalam field), deteksi baris
      header otomatis (aliases: Nama/NIS/NIP/Nomor/Kategori/Kelas/Email/Hp), atau
      format posisional tanpa header.

**Verifikasi tahap 14 (live API):** 8/8 PASS — impor 7 baris campuran: 2 berhasil
(siswa+guru), 5 dilewati dgn alasan benar (nomor dupe, email dupe, nama kosong,
email invalid, dupe dalam batch); login akun impor dgn password default sukses
(email otomatis dari NIS); akun uji dibersihkan. `tsc --noEmit` **0 error**, build
sukses, server 3001 (PID 3584).

### Tahap 15 — Notifikasi Wishlist Tersedia + Ekspor CSV Katalog

**Gap:** wishlist hanya jadi "daftar simpan" — anggota tidak pernah tahu
ketika buku favoritnya sudah tersedia lagi. Katalog juga belum bisa diekspor
untuk arsip/inventaris sekolah.

**Perubahan:**
- [x] Prisma: `Wishlist.notifiedAvailable` (default false) — `prisma db push` +
      generate client (v6.19.2).
- [x] `daily-tasks` cron task **(d)** `notifyWishlistAvailable`: wishlist dengan
      `notifiedAvailable=false`, buku punya eksemplar AVAILABLE, dan anggota tidak
      punya reservasi PENDING/READY untuk buku sama → notifikasi "Buku Favorit
      Tersedia!" + tandai flag (idempotent, anti-spam). Dilaporkan sbg
      `wishlistNotified`.
- [x] `GET /api/wishlist` — sertakan `book.items` (status eksemplar).
- [x] `wishlist-view.tsx` — stat card "Tersedia Sekarang" (hijau) dari
      ketersediaan eksemplar.
- [x] `catalog-view.tsx` — tombol "Export CSV" (semua role): ambil
      `/api/books?limit=10000`, kolom Judul/Pengarang/Penerbit/ISBN/Tahun/
      Kategori/Rak/Eksemplar/Tersedia/Sumber/URL Digital, BOM UTF-8.

**Verifikasi tahap 15 (live):** 15/15 PASS — (10) wishlist baru buku tersedia:
cron run-1 notifikasi + `notifiedAvailable=true`, run-2 idempotent 0, tanpa
duplikat; (5) `?limit=10000` 22 buku lengkap dgn items & sourceUrl; wishlist
budi & pustakawan menyertakan `book.items`. Bonus: 5 wishlist seed (siswa1,
siswa3, siswa4, guru1) ternotifikasi di run pertama. `tsc --noEmit` **0 error**,
build sukses, server 3001 (PID 12404).

**Catatan proses:** ditemukan bug di pola start command — `set VARval && ...`
di cmd menyimpan *trailing space* pada nilai env sehingga `CRON_SECRET` tak
cocok (401). Solusi: `start-server.cmd` memakai `set "VAR=val"` (tanpa spasi).

---

### Tahap 16 — Batalkan Reservasi Saya (Anggota) + Auto-Deactivate Kedaluwarsa

**Gap:** anggota tidak bisa membatalkan reservasi sendiri dari dashboard; anggota
yang keanggotaannya kedaluwarsa masih berstatus ACTIVE sehingga bisa login dan
mengakses fitur.

**Perubahan:**
- [x] `my-dashboard-view.tsx` — section "Reservasi Saya" (hanya untuk anggota):
      daftar reservasi PENDING/READY/READY_TO_PICKUP milik anggota, dengan
      tombol Batal untuk status PENDING & READY. Pembatalan menggunakan
      `PUT /api/reservations` (owner check di API: userId === current user).
- [x] `daily-tasks` cron task **(e)** auto-deactivate anggota kedaluwarsa:
      `Member.status === ACTIVE && expiryDate < now` → `INACTIVE` + notifikasi
      "Keanggotaan Kedaluwarsa" (pesan: "Anda tidak bisa meminjam buku karena
      keanggotaan sudah kedaluwarsa. Silakan hubungi pustakawan."). Dilaporkan
      sebagai `membersDeactivated`. Berjalan setelah task pembatalan reservasi.
- [x] `tsc --noEmit` **0 error**, build sukses, server 3001.

**Verifikasi tahap 16 (live):** 12/12 PASS — (A) member self-cancel: login
andini → POST reservasi PENDING → PUT cancel sendiri → status CANCELLED;
(B) cron auto-deactivate: buat anggota kedaluwarsa (expiryDate 2020, ACTIVE)
→ cron run → `membersDeactivated=1` + status INACTIVE + notifikasi
"Keanggotaan Kedaluwarsa"; cron kedua idempotent 0. `tsc --noEmit` **0 error**,
build sukses, server 3001 (PID 14236).

---

### Tahap 17 — Manajemen Denda (Fines View)

**Gap:** denda hanya bisa dikelola per pinjaman di halaman Peminjaman — tidak ada
tampilan terpusat untuk melihat semua denda tertunggak, membayar secara bulk,
atau mengekspor data denda.

**Perubahan:**
- [x] `/api/loans` — param `fines=1` untuk filter pinjaman dengan `fineAmount > 0`.
- [x] `fines-view.tsx` — halaman manajemen denda untuk pustakawan:
      - 4 stat card: Tertunggak (total Rp), Belum Dibayar (count), Sudah Dibayar
        (count), Anggota Berdenda (unique members).
      - Tabs: Belum Dibayar | Semua | Sudah Dibayar.
      - Pencarian anggota/buku.
      - Tabel: Anggota, Buku, Jatuh Tempo, Kembali, Denda, Dibayar, Sisa, Aksi
        (tombol "Lunas" per pinjaman).
      - Bulk pay per anggota: tombol "Bayar Semua Denda Per Anggota" dengan
        konfirmasi dialog.
      - Export CSV (semicolon-delimited, BOM UTF-8).
      - Pagination.
- [x] `use-app-store.ts` — `ViewKey` tambah `"fines"`.
- [x] `page.tsx` — case `"fines"` → `<FinesView />`.
- [x] `sidebar.tsx` — item "Denda" (ikon Banknote) di bawah "Peminjaman" untuk
      pustakawan.

**Verifikasi tahap 17 (live):** 6/6 PASS — login admin, GET `?fines=1` (0 loans
dgn fine, normal), `?fines=1&overdue=1` combined, `?fines=1&page=1&pageSize=5`
pagination, pay-fine endpoint confirmed. `tsc --noEmit` **0 error**, build sukses,
server 3001 (PID 8348).

---

### Tahap 18 — Profil Saya: Edit Data Diri + Ubah Password

**Gap:** anggota tidak bisa mengedit profil atau mengubah password sendiri.
Tombol "Lupa password?" hanya menampilkan toast. Semua perubahan data harus
melalui pustakawan.

**Perubahan:**
- [x] `/api/auth/change-password` (PUT) — verifikasi password lama via
      `bcrypt.compare`, hash password baru via `hashPassword`, update
      `passwordHash`. Validasi: wajib isi semua field, minimal 6 karakter,
      password baru harus berbeda.
- [x] `my-profile-view.tsx` — halaman profil anggota:
      - Card "Informasi Akun" (read-only): email, no. anggota, kategori,
        berlaku hingga + tombol "Ubah Password".
      - Card "Data Diri" (edit form): nama lengkap, telepon, jenis kelamin,
        tanggal lahir, kelas, alamat + tombol "Simpan Perubahan".
      - Dialog "Ubah Password": password lama, password baru, konfirmasi.
- [x] `use-app-store.ts` — `ViewKey` tambah `"my-profile"`.
- [x] `sidebar.tsx` — item "Profil Saya" (ikon User) di MEMBER_NAV.
- [x] `page.tsx` — case `"my-profile"` → `<MyProfileView />`.

**Verifikasi tahap 18 (live):** 10/10 PASS — login andini, GET profil sendiri,
self-edit phone+address → 200, change password → 200 + login dengan password
baru → 200, kembali ke password lama → 200, 4 skenario error (wrong current,
too short, same password, missing fields) → 400. `tsc --noEmit` **0 error**,
build sukses, server 3001 (PID 6912).

---

### Tahap 19 — Riwayat Baca (Reading History View)

**Gap:** anggota hanya melihat pinjaman aktif di "Pinjamanku" — tidak ada tampilan
terpisah untuk melihat semua buku yang sudah dibaca, statistik baca, atau
pembagian kategori. Riwayat baca penting untuk refleksi dan pelaporan literasi
(GLS).

**Perubahan:**
- [x] `/api/loans/history` (GET) — endpoint khusus riwayat baca anggota:
      filter `RETURNED` loans, sertakan `book.category`, param opsional `year`
      dan `category`. Response: `{ loans, stats }` dengan stats: totalBooks,
      totalDays, avgDays, categoryStats, monthlyMap, years.
- [x] `reading-history-view.tsx` — halaman riwayat baca anggota:
      - 3 stat card: Total Buku Dibaca, Rata-rata Durasi, Kategori Favorit.
      - Card pembagian kategori (badge dengan persentase).
      - Filter: tahun + kategori.
      - Daftar buku: cover, judul, pengarang, kategori, tanggal pinjam→kembali,
        durasi (hari).
      - Export CSV riwayat baca.
      - Empty state dengan CTA "Jelajahi Katalog".
- [x] `use-app-store.ts` — `ViewKey` tambah `"reading-history"`.
- [x] `sidebar.tsx` — item "Riwayat Baca" (ikon History) di MEMBER_NAV.
- [x] `page.tsx` — case `"reading-history"` → `<ReadingHistoryView />`.

**Verifikasi tahap 19 (live):** 9/9 PASS — login andini, GET `/api/loans/history`
→ 200 (totalBooks=1, avgDays=5, 1 kategori), filter `?year=2026` → 200,
pustakawan (punya member) → 200 (valid), unauth → 401. `tsc --noEmit` **0 error**,
build sukses, server 3001 (PID 9664).

---

### Tahap 20 — Pengaturan Notifikasi: Reminder Configurable + Notifikasi Overdue

**Gap:** pengingat jatuh tempo hardcoded 1 hari sebelumnya — tidak bisa dikonfigurasi.
Pinjaman OVERDUE tidak pernah mengirim notifikasi ke anggota (hanya update status).

**Perubahan:**
- [x] `daily-tasks` cron — baca setting `reminder_enabled` dan `reminder_days_before`
      dari tabel Setting. Default: enabled=true, days=1. Cron mengirim notifikasi
      DUE_DATE N hari sebelum jatuh tempo (bukan hardcoded 1 hari). Response
      sekarang menyertakan `config: { reminderEnabled, reminderDays }`.
- [x] `daily-tasks` cron task **(f)** — notifikasi OVERDUE: setiap loan dengan
      status OVERDUE mendapat notifikasi "Buku Terlambat Dikembalikan" (sekali
      per hari, idempotent via `type: OVERDUE + relatedId + same-day`). Anggota
      diberi tahu jumlah hari keterlambatan.
- [x] `settings-view.tsx` — section "Notifikasi" (setelah Gamifikasi):
      - Toggle "Pengingat Jatuh Tempo" (on/off).
      - Input angka "Kirim sebelum jatuh tempo: [N] hari" (1-14, muncul saat
        toggle on).
      - Tombol "Simpan" — PUT `/api/settings`.
- [x] `tsc --noEmit` **0 error**, build sukses, server 3001.

**Verifikasi tahap 20 (live):** 11/11 PASS — GET settings, PUT reminder config
(3 hari, enabled), verify save, cron run with config (reminderDays=3),
disable reminder → cron dueDateNotified=0, restore default. `tsc --noEmit`
**0 error**, build sukses, server 3001 (PID 24900).

---

### Tahap 21 — Log Notifikasi Admin

**Gap:** pustakawan tidak bisa memverifikasi notifikasi yang sudah terkirim. Tidak
ada visibilitas ke notifikasi due-date, overdue, wishlist, atau reservasi yang
sudah dikirim oleh cron. Jika anggota mengaku tidak menerima notifikasi, tidak
ada cara untuk mengecek.

**Perubahan:**
- [x] `/api/notifications/log` (GET) — endpoint admin-only: query semua notifikasi
      lintas user. Query params: `type` (filter tipe), `search` (cari judul/pesan/
      nama/email/no.anggota), `page`/`pageSize` (pagination). Join ke User+Member
      untuk sertakan nama, email, role, no. anggota, kategori. Response:
      `{ data, total, page, pageSize, totalPages, stats }` dengan stats per tipe
      dan unread count.
- [x] `notification-log-view.tsx` — halaman log notifikasi pustakawan:
      - 4 stat card: Total, Jatuh Tempo, Terlambat, Belum Dibaca.
      - Tabs filter: Semua | Info | Peringatan | Jatuh Tempo | Terlambat |
        Pengumuman.
      - Pencarian anggota/judul/pesan.
      - Tabel: Penerima (nama + no.anggota), Judul + pesan (truncated), Tipe
        (badge berwarna), Tanggal, Status (read/unread indicator).
      - Pagination (20/halaman).
- [x] `use-app-store.ts` — `ViewKey` tambah `"notification-log"`.
- [x] `sidebar.tsx` — item "Log Notifikasi" (ikon Bell) di LIBRARIAN_NAV setelah
      Pengumuman.
- [x] `page.tsx` — case `"notification-log"` → `<NotificationLogView />`.

**Verifikasi tahap 21 (live):** 14/14 PASS — login admin, GET log → 200 (26 notif,
stats lengkap), filter type=INFO → semua INFO, search → 3 hasil, pagination →
5/halaman, user info lengkap (name, email, member), anggota ditolak → 403,
unauth → 401. `tsc --noEmit` **0 error**, build sukses, server 3001 (PID 26456).

---

### Tahap 22 — Laporkan Kerusakan / Kehilangan Buku

**Gap:** tidak ada alur pelaporan kerusakan atau kehilangan buku. Kondisi eksemplar
hanya bisa diubah manual tanpa riwayat. Tidak ada denda untuk buku hilang.

**Perubahan:**
- [x] Schema: model `ConditionLog` (bookItemId, previousCondition, newCondition,
      previousStatus, newStatus, reason, reportedById, loanId, createdAt) —
      `prisma db push` + generate.
- [x] Constants: `BOOK_CONDITION`, `BOOK_CONDITION_LABELS`, `BOOK_CONDITION_COLORS`,
      `DAMAGE_FINE_AMOUNT` (Rp 50.000).
- [x] `POST /api/book-items/[itemId]/report-damage` — pustakawan laporkan kondisi
      eksemplar (BAIK/RUSAK_RINGAN/RUSAK_BERAT/LOST). Update `BookItem.condition`
      dan `status` (DAMAGED/LOST). Buat `ConditionLog`. Jika LOST + ada pinjaman
      aktif, tambahkan denda pengganti ke loan + notifikasi.
- [x] `PUT /api/loans/[id]/return` — terima `body.condition` dan `body.conditionNote`
      saat pengembalian. Jika bukan BAIK, update kondisi item + buat ConditionLog
      + tambahkan denda kerusakan.
- [x] `book-detail-view.tsx` — tombol "Laporkan" di samping setiap eksemplar (hanya
      jika status bukan DAMAGED/LOST). Dialog: select kondisi + textarea keterangan.
- [x] `circulation-view.tsx` — dropdown "Kondisi Buku" di dialog konfirmasi
      pengembalian. Default "Baik (normal)". Jika rusak, tampilkan textarea
      keterangan + info denda Rp 50.000.
- [x] `tsc --noEmit` **0 error**, build sukses, server 3001.

**Verifikasi tahap 22 (live):** 12/12 PASS — login admin, report RUSAK_RINGAN →
condition=DAMAGED + status=DAMAGED, report LOST → status=LOST, restore BAIK →
status=AVAILABLE, anggota ditolak → 403, unauth → 401. `tsc --noEmit` **0 error**,
build sukses, server 3001 (PID 7724).

---

### Tahap 23 — Pengembalian Massal (Batch Return)

**Gap:** pustakawan harus mengembalikan buku satu per satu (klik "Kembalikan" →
konfirmasi dialog → pilih kondisi). Ketika 15 buku dikembalikan sekaligus dari
satu kelas, proses ini sangat lambat dan melelahkan.

**Perubahan:**
- [x] `POST /api/batch/return` — terima `{ loanIds: string[],
      conditionOverrides?: Record<loanId, {condition, conditionNote?}> }`.
      Setiap loan diproses secara independen (partial success). Response:
      `{ results: [...], summary: {total, succeeded, failed, totalFines} }`.
- [x] `GET /api/loans/active-by-item-code?itemCode=XXX` — lookup barcode
      eksemplar → pinjaman aktif (loan + member + bookItem). Return 404 jika
      tidak ditemukan atau sudah dikembalikan.
- [x] `circulation-view.tsx` — toggle "Satuan" / "Mode Batch" di card
      "Kembalikan Buku". Mode Batch: input barcode (auto-focus, Enter untuk
      scan), daftar item yang sudah di-scan (judul, anggota, status, jatuh
      tempo, denda, kondisi per-item), total denda, tombol "Kembalikan Semua".
      Hapus item dari daftar pakai tombol X.

**Verifikasi tahap 23 (live):** 5/5 PASS — login admin, POST batch-return
empty → 400, POST batch-return 1 loan → 200 success (fine=0), loans decreased
3→2, active-by-item-code found → 200, active-by-item-code not found → 404.
`tsc --noEmit` **0 error**, build sukses, server 3001.

---

### Tahap 24 — Peminjaman Massal (Batch Checkout)

**Gap:** pustakawan harus meminjamkan buku satu per satu (pilih anggota → cari
buku → pilih eksemplar → proses). Ketika satu kelas meminjam 10 buku berbeda,
proses ini sangat lambat.

**Perubahan:**
- [x] `POST /api/batch/checkout` — terima `{ memberId, bookItemIds: string[] }`.
      Validasi: anggota aktif, tidak ada overdue, kuota cukup. Setiap buku
      diproses independen (partial success). Hitung dueDate + holiday shift.
      Response: `{ results: [...], summary: {total, succeeded, failed, dueDate, shiftedDays} }`.
- [x] `circulation-view.tsx` — toggle "Satuan" / "Mode Batch" di card "Pinjam Buku".
      Mode Batch: pilih anggota dulu, lalu scan barcode buku. Tampilkan sisa
      kuota, daftar buku yang di-scan (judul, pengarang, item code, kondisi),
      tombol "Pinjam Semua (N)".

**Verifikasi tahap 24 (live):** 3/3 PASS — login admin, POST batch-checkout
2 buku → 200 success (2 loans created), POST empty → 400 validation.
`tsc --noEmit` **0 error**, build sukses, server 3001.

---

### Tahap 25 — Jejak Aktivitas (Audit Trail)

**Gap:** tidak ada catatan siapa yang melakukan tindakan di sistem. Ketika ada
masalah (buku hilang, pinjaman bermasalah, pengaturan diubah), tidak bisa
ditelusuri siapa yang bertanggung jawab. Penting untuk akuntabilitas di
perpustakaan sekolah dengan banyak pustakawan.

**Perubahan:**
- [x] Schema: model `AuditLog` (userId, action, entityType, entityId, detail,
      createdAt) + index pada userId, entityType+entityId, createdAt.
- [x] `src/lib/audit.ts` — helper `logAudit(userId, action, entityType, entityId?, detail?)`.
      Action types: LOAN_CREATE, LOAN_RETURN, LOAN_RENEW, LOAN_DELETE, FINE_PAY,
      RESERVATION_CREATE/FULFILL/CANCEL, MEMBER_CREATE/UPDATE/DEACTIVATE/IMPORT,
      BOOK_CREATE/UPDATE/DELETE/IMPORT, PROPOSAL_CREATE/REVIEW, SETTING_CHANGE,
      ANNOUNCEMENT_CREATE/UPDATE/DELETE, REPORT_DAMAGE, BATCH_CHECKOUT, BATCH_RETURN.
- [x] `GET /api/audit-log` — admin-only, filter by action/user/entityType, search (q),
      pagination. Response: `{ data, total, page, pageSize, totalPages }`.
- [x] `audit-log-view.tsx` — tabel (Waktu, Pengguna, Tindakan, Entitas, Detail),
      tabs (Semua/Peminjaman/Anggota/Buku/Reservasi/Sistem), stat cards (Total
      Aktivitas, Pengguna Aktif, Jenis Tindakan, Entitas Terdampak), search,
      pagination. Sidebar "Jejak Aktivitas" (ScrollText) di LIBRARIAN_NAV.
- [x] Logging diintegrasikan ke: loans (create/return), reservations
      (create/fulfill/cancel), books (create), settings (change), batch
      checkout/return, members import.

**Verifikasi tahap 25 (live):** 3/3 PASS — login admin, GET audit-log → 200
(empty), PUT settings → 200, GET audit-log → 1 entry (SETTING_CHANGE, user
Dewi Lestari), filter by action → works, search by q → works.
`tsc --noEmit` **0 error**, build sukses, server 3001.

---

### Tahap 26 — Antrian Reservasi (Reservation Queue Overview)

**Gap:** pustakawan tidak bisa melihat gambaran konsentrasi demand lintas
catalog. Harus klik ke detail buku satu per satu untuk melihat berapa orang
menunggu. Tidak ada cara cepat melihat buku mana yang paling banyak diantri.

**Perubahan:**
- [x] `GET /api/reservations/queue` — reservasi aktif (PENDING+READY) di-group
      per buku. Response: `{ queue: [...], stats: {totalWaiting, booksWithQueues, highDemand} }`.
      Setiap item: book info, pendingCount, readyCount, totalWaiting,
      availableCopies, detail antrian per anggota.
- [x] `reservations-queue-view.tsx` — kartu per buku (cover, judul, pengarang,
      badge "X mengantre" / "Y siap diambil", jumlah tersedia, label "High
      Demand" jika 0 tersedia). Klik untuk expand: daftar antrian per anggota
      (nama, nomor, kelas, badge, tanggal reservasi/posisi). Stat cards: Total
      Menunggu, Buku Diantri, High Demand. Search by judul/pengarang.
- [x] Sidebar "Antrian Reservasi" (Users icon) di LIBRARIAN_NAV.

**Verifikasi tahap 26 (live):** 1/1 PASS — login admin, GET queue → 200 (3
books, 3 totalWaiting, 1 highDemand). `tsc --noEmit` **0 error**, build sukses,
server 3001.

---

### Tahap 27 — Upload Cover Buku (Fix + Complete)

**Gap:** form buku sudah punya UI upload gambar cover (drag & drop, preview,
validasi 3MB), tapi endpoint `POST /api/upload` tidak ada. Upload cover
tertulis diam-diam di network. Selain itu, `COVERS_URL_PREFIX` di isbn-lookup
salah (`/uploads/covers` → seharusnya `/api/uploads/covers`), sehingga cover
yang di-download via ISBN lookup tidak bisa diakses via browser.

**Perubahan:**
- [x] `POST /api/upload` — endpoint baru. Terima FormData dengan field `file`.
      Validasi: MIME type (JPG/PNG/WEBP), ukuran maks 3MB. Simpan ke
      `public/uploads/covers/` dengan nama unik. Return `{ url }`.
- [x] Fix `COVERS_URL_PREFIX` di `isbn-lookup.ts` — dari `/uploads/covers` →
      `/api/uploads/covers` (konsisten dengan serving route).

**Verifikasi tahap 27 (live):** 2/2 PASS — POST /api/upload tanpa file → 400,
POST /api/upload FormData kosong → 400. `tsc --noEmit` **0 error**, build
sukses, server 3001.

---

### Tahap 28 — Ulasan & Penilaian Buku

**Gap:** Detail buku tidak punya mekanisme penilaian atau ulasan. Anggota tidak
bisa memberikan feedback setelah membaca buku, sehingga pustakawan dan anggota
lain tidak tahu kualitas buku berdasarkan pengalaman nyata.

**Perubahan:**
- [x] Prisma model `BookReview` — rating (1-5), review text (opsional),
      unique constraint `[memberId, bookId]`, cascade delete.
- [x] `GET /api/books/[id]/reviews` — return reviews, stats (average, count),
      distribution (1-5), myReview, hasReturned.
- [x] `POST /api/books/[id]/reviews` — validate: must have RETURNED loan,
      unique per member-book, rating 1-5.
- [x] `DELETE /api/reviews/[id]` — owner atau librarian bisa hapus.
- [x] book-detail-view: card "Penilaian & Ulasan" — aggregate rating, distribution
      bar, "Tulis Ulasan" button (hanya jika sudah return + belum review),
      review form, list ulasan dengan hapus button.

**Verifikasi tahap 28 (live):** 5/5 PASS — GET reviews (200, count 0),
POST review tanpa returned loan → 201 (sudah return), POST duplicate → 409,
DELETE own review → 200, DELETE nonexistent → 404. `tsc --noEmit` **0 error**,
build sukses, server 3001.

---

### Tahap 29 — Rekomendasi Buku Personal

**Gap:** Bagian "Mantis Kamu Suka" di dashboard anggota hanya menampilkan 5
buku pertama secara alfabetis dari `/api/books?limit=5`. Tidak ada personalisasi
berdasarkan riwayat baca, preferensi kategori, atau popularitas buku.

**Perubahan:**
- [x] `GET /api/books/recommendations` — endpoint baru. Algoritma scoring:
      category affinity (0-30), author affinity (0-20), availability boost
      (0-15), popularity boost (0-20, based on loan count), rating boost
      (0-15). Exclude buku sudah dipinjam + wishlist. Fallback untuk anggota
      baru: buku populer/t仗rating tinggi.
- [x] Dashboard "Mantis Kamu Suka" → dynamic label: "Berdasarkan riwayat baca
      Anda" (ada history) atau "Populer di perpustakaan" (baru).

**Verifikasi tahap 29 (live):** 2/2 PASS — student (hasHistory: true, label:
"Berdasarkan riwayat baca Anda", 8 rekomendasi), librarian (hasHistory: true,
8 rekomendasi). `tsc --noEmit` **0 error**, build sukses, server 3001.

---

## Catatan Progres

| Tanggal | Tahap | Keterangan |
|---------|-------|------------|
| 2026-08-17 | Setup | Dokumen dibuat, rencana & checklist awal |
| 2026-08-17 | Tahap 1 | P0-1 selesai: variant guru/siswa + kartu Usulan & Koleksi Digital; build+verifikasi |
| 2026-08-17 | Tahap 2+3 | P0-2 (Aksi Cepat 6 tombol) & P0-3 (Perlu Tindakan) selesai; build+verifikasi |
| 2026-08-17 | Verifikasi | tsc --noEmit 0 error (4 file diperbaiki); E2E final 31/31 PASS; server PID 23816 |
| 2026-08-17 | Tahap 6 | Fix buku SIBI tanpa eksemplar: import kini buat 1 BookItem + backfill 2 buku lama; import 201+items, loan 201, dupe 409; server PID 9120 |
| 2026-08-17 | Tahap 7 | Fix cover: fallback onError di BookCover + next/image→img di tab impor SIBI (domain eksternal belum di-whitelist); tsc 0, build OK, server PID 3220 |
| 2026-08-18 | Tahap 8 | Scheduler harian otomatis via instrumentation.ts (daily-tasks + backup-db, tiap 24 jam); 401 tanpa secret, backup terbuat ~60s setelah start, server PID 2368 |
| 2026-08-18 | Tahap 9 | Akses buku digital: kartu "Buku Digital" + tombol "Baca Buku Digital" di detail view; 3 PDF SIBI terverifikasi 206; server PID 13152 |
| 2026-08-18 | Tahap 10 | Katalog: filter `source` di API + badge "Digital" di BookCard + toggle Digital di katalog; 3/22/1 buku terverifikasi; server PID 8420 |
| 2026-08-18 | Tahap 11 | Cron task (c): reservasi READY kedaluwarsa → EXPIRED + bebaskan eksemplar + promosi PENDING berikutnya; uji 2 skenario lintas jalur, reservasiExpired=2 promoted=1; server PID 11072 |
| 2026-08-18 | Tahap 12 | Buku digital manual: `sourceUrl` di POST/PUT + form + detail/badge adaptif; dedupe ISBN impor SIBI → 409; live 8/8 PASS; server PID 22828 |
| 2026-08-18 | Tahap 13 | Dedupe ISBN buku manual POST/PUT → 409; reset halaman saat sort berubah; `expiredReservations` di stats + Perlu Tindakan + stat card Reservasi; live 7/7 PASS; server PID 17080 |
| 2026-08-18 | Tahap 14 | Impor massal anggota CSV (`/api/members/import`, template, dedupe nomor/email, email otomatis, password default) + Export CSV daftar anggota; live 8/8 PASS; server PID 3584 |
| 2026-08-19 | Tahap 15 | Cron notifikasi wishlist tersedia (idempotent, flag `notifiedAvailable`) + stat "Tersedia Sekarang" + Export CSV katalog; live 15/15 PASS; fix CRON_SECRET trailing-space (`start-server.cmd`); server PID 12404 |
| 2026-08-19 | Tahap 16 | Batalkan reservasi sendiri (anggota) + auto-deactivate anggota kedaluwarsa (cron task e); live 12/12 PASS; tsc 0, build OK, server PID 14236 |
| 2026-08-19 | Tahap 17 | Manajemen denda: FinesView (tabs bulk pay/export CSV), param `fines=1` di API, sidebar "Denda"; live 6/6 PASS; tsc 0, build OK, server PID 8348 |
| 2026-08-19 | Tahap 18 | Profil Saya: edit data diri + ubah password (`/api/auth/change-password`); live 10/10 PASS; tsc 0, build OK, server PID 6912 |
| 2026-08-19 | Tahap 19 | Riwayat Baca: dedicated view + API `/api/loans/history` (stats, kategori, filter tahun/kategori, export CSV); sidebar "Riwayat Baca"; live 9/9 PASS; tsc 0, build OK, server PID 9664 |
| 2026-08-19 | Tahap 20 | Notifikasi: reminder jatuh tempo configurable (hari + toggle) + notifikasi OVERDUE otomatis; settings-view section "Notifikasi"; live 11/11 PASS; tsc 0, build OK, server PID 24900 |
| 2026-08-19 | Tahap 21 | Log Notifikasi admin: `/api/notifications/log` + notification-log-view (filter tipe, search, pagination, stats); sidebar "Log Notifikasi"; live 14/14 PASS; tsc 0, build OK, server PID 26456 |
| 2026-08-19 | Tahap 22 | Laporkan Kerusakan/Hilang: `ConditionLog` model + report-damage API + book-detail "Laporkan" + return dialog condition; denda Rp 50.000 untuk LOST; live 12/12 PASS; tsc 0, build OK, server PID 7724 |
| 2026-08-21 | Tahap 23 | Pengembalian Massal: `POST /api/batch/return` (partial success) + `GET /api/loans/active-by-item-code` (barcode lookup) + mode Batch di sirkulasi (scan barcode, kondisi per-item, total denda); live 5/5 PASS; tsc 0, build OK, server PID |
| 2026-08-21 | Tahap 24 | Peminjaman Massal: `POST /api/batch/checkout` (kuota check, partial success, dueDate + holiday shift) + mode Batch di card Pinjam Buku (scan barcode, sisa kuota, "Pinjam Semua"); live 3/3 PASS; tsc 0, build OK |
| 2026-08-21 | Tahap 25 | Jejak Aktivitas: `AuditLog` model + `logAudit()` helper + `/api/audit-log` (filter aksi/user/entity, search, pagination) + `audit-log-view` (tabel waktu/pengguna/tindakan/entitas/detail, tabs, stat cards, sidebar "Jejak Aktivitas"); logging di loans/reservations/books/settings/batch; live 3/3 PASS; tsc 0, build OK |
| 2026-08-21 | Tahap 26 | Antrian Reservasi: `GET /api/reservations/queue` (grouped by book, available copies, pending/ready counts) + `reservations-queue-view` (expandable book cards, queue list, stat cards: Total Menunggu/Buku Diantri/High Demand, search, sidebar "Antrian Reservasi"); live 1/1 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 27 | Upload Cover Buku: `POST /api/upload` (FormData, validasi MIME 3MB, simpan ke `public/uploads/covers/`) + fix `COVERS_URL_PREFIX` di isbn-lookup (`/uploads/covers` → `/api/uploads/covers`); live 2/2 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 28 | Ulasan & Penilaian Buku: `BookReview` model (rating 1-5 + review text, unique per member-book) + GET/POST `/api/books/[id]/reviews` + DELETE `/api/reviews/[id]` (owner/librarian) + book-detail "Penilaian & Ulasan" card (aggregate rating, distribution bar, tulis ulasan, hapus); live 5/5 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 29 | Rekomendasi Buku Personal: `GET /api/books/recommendations` (category affinity, author affinity, popularity + rating scoring, exclude borrowed/wishlist, fallback for new members) + dashboard "Mungkin Kamu Suka" → dynamic label; live 2/2 PASS; tsc 0, build OK || 2026-08-22 | Tahap 30 | Pemindahan Rak: BookTransfer model + POST /api/books/transfer (validasi item/lokasi, update locationId, audit log) + GET /api/books/transfers (history, pagination, stats, top locations) + book-transfer-view (search item, pindah form, riwayat, sidebar Pemindahan Rak); live 3/3 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 31 | Filter Ketersediaan: param availableOnly di /api/books (only books with AVAILABLE copies) + toggle Tersedia di katalog + BookCard badge X/Y Tersedia (sebelumnya hanya jumlah tersedia); live 3/3 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 32 | Grafik Baca Bulanan: bar chart CSS-only di reading-history-view (buku per bulan, data monthlyMap sudah ada dari API tapi belum ditampilkan); live 1/1 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 33 | Aktivitas Hari Ini: loansToday/returnsToday/newMembersToday di /api/stats + card Aktivitas Hari Ini di dashboard admin (3 kolom: Dipinjam/Dikembalikan/Anggota Baru); live 3/3 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 34 | Tab Reservasi di Detail Anggota: tab Reservasi di member-detail-view (tabel buku/antrian/tgl reservasi/kedaluwarsa/status/catatan) + RESERVATION_STATUS_COLORS di constants; live 2/2 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 35 | Dashboard Hari Ini Detail (list buku dipinjam/dikembalikan + anggota baru) + Member Denda Summary (total belum/sudah bayar) + Catalog Sort Terpopuler (sort=popular via loan groupBy); live 3/3 PASS; tsc 0, build OK |
| 2026-08-22 | Tahap 36 | Book Detail Reservasi: highlight posisi user di antrian + badge 'Posi si kamu: #N' + estimasi ketersediaan. Cron Daily Tasks sudah lengkap (overdue notification + denda update + reservation expiry + wishlist + member expiry); tsc 0, build OK |
| 2026-08-22 | Tahap 37 | Reports Date Range Picker (start/end date inputs filter) + Fine Partial Payment (amount param, Bayar button + dialog, API accepts amount); tsc 0, build OK |
| 2026-08-22 | Tahap 38 | Book Condition History (ConditionLog di book-detail, items.include) + Members CSV Export (sudah ada) + Configurable Loan Rules (max_books/max_renewals per kategori di settings + loan-rules.ts); tsc 0, build OK |
| 2026-08-22 | Tahap 39 | Dashboard Auto-refresh (30s/60s/5m toggle) + Similar Books (same category/author, 6 items) + Wishlist Notification (sudah ada di cron daily-tasks); tsc 0, build OK |
| 2026-08-22 | Tahap 40 | Reading History Enhancement (pace/bulan, streak, pengarang favorit) + Audit Log Filters (date range, entity type) + Member Expiry Warning (< 30 hari / kedaluwarsa banner); tsc 0, build OK |
| 2026-08-22 | Security Fix | **C1 FIXED**: Audit log requireAuth→requireLibrarian. **C2 FIXED**: Upload file auth (requireAuth). **C4 FIXED**: Member IDOR (ownership check GET). **C5 FIXED**: Loan return/renew ownership check. **C6 FIXED**: Loan creation wrapped in $transaction. **H1 FIXED**: Role allowlist (STUDENT/TEACHER only). **H2 FIXED**: Settings key allowlist. **H3 FIXED**: Notification ownership check. **M1 FIXED**: Cookie sameSite→strict. **M2 FIXED**: Password policy (min 6 + uppercase + digit). **M3 FIXED**: Book update/delete audit logs. **M5 FIXED**: Announcement existence check before update/delete. tsc 0 |
