# Dokumentasi Pengembangan Aplikasi Perpustakaan Sekolah

## Daftar Isi
1. Ringkasan Proyek
2. Tech Stack
3. Struktur Fitur
4. Skema Database
5. Instalasi & Setup Awal Project
6. Struktur Folder Project
7. Pengembangan Backend
8. Pengembangan Frontend (Web)
9. UI/UX Design
10. Mobile & PWA
11. Testing & Deployment
12. Roadmap Pengembangan
13. Referensi

---

## 1. Ringkasan Proyek

**Nama proyek:** Aplikasi Perpustakaan Sekolah (custom, dibangun sendiri, bukan menggunakan SLiMS)

**Tujuan:** Sistem manajemen perpustakaan sekolah yang bisa diakses lewat website online, laptop, dan HP Android (installable seperti aplikasi).

**Target pengguna:**
- Admin/Kepala Perpustakaan — kelola sistem secara penuh
- Pustakawan/Staff — kelola data buku & transaksi sirkulasi harian
- Siswa/Guru (anggota) — cari katalog, lihat status pinjaman sendiri

---

## 2. Tech Stack

| Komponen | Teknologi | Alasan |
|---|---|---|
| Backend | PHP 8.x + Laravel | Framework matang, auth & migration bawaan, komunitas Indonesia besar |
| Database | MySQL / MariaDB | Kompatibel dengan hampir semua hosting, sudah familiar dari XAMPP |
| Frontend web | Blade (bawaan Laravel) + Tailwind CSS | Cepat dibangun, responsive, tanpa perlu setup framework JS terpisah di awal |
| Autentikasi | Laravel Breeze | Paket resmi Laravel untuk login/register siap pakai |
| Mobile (fase awal) | PWA (Progressive Web App) | Web yang sama bisa "diinstall" ke HP tanpa coding terpisah |
| Mobile (fase lanjutan, opsional) | Flutter + Laravel REST API | Kalau nanti butuh aplikasi native sungguhan |
| Hosting | Hosting shared PHP/MySQL atau VPS | Sesuai budget sekolah |

**Software yang perlu diinstall di komputer development:**
- XAMPP atau Laragon (PHP + MySQL + Apache)
- Composer (dependency manager PHP)
- Node.js + NPM (untuk compile Tailwind CSS)
- Text editor: VS Code
- Git (untuk version control, sangat disarankan sejak awal)

---

## 3. Struktur Fitur

### Modul Autentikasi & Peran
- Login admin, pustakawan, anggota (role-based access)

### Modul Master Data
- CRUD data buku (judul, pengarang, penerbit, ISBN, kategori, tahun terbit, cover)
- CRUD kategori/klasifikasi
- CRUD data anggota (NIS/NIP, nama, kelas/jabatan, kontak)

### Modul Katalog Publik (OPAC)
- Pencarian buku (judul/pengarang/kategori)
- Halaman detail buku + status ketersediaan

### Modul Sirkulasi
- Peminjaman buku
- Pengembalian buku
- Hitung denda otomatis
- Perpanjangan pinjaman
- (Lanjutan) reservasi buku

### Modul Laporan
- Buku terpopuler
- Laporan keterlambatan
- Statistik transaksi per periode

### Modul Sistem
- Pengaturan aturan peminjaman (lama pinjam, denda/hari)
- Backup database
- Manajemen user sistem

---

## 4. Skema Database

Tabel utama dan relasinya:

**kategori**
- id (PK)
- nama_kategori

**buku**
- id (PK)
- kategori_id (FK → kategori)
- judul, pengarang, penerbit, isbn, tahun_terbit, cover_url

**eksemplar** (kopi fisik tiap buku)
- id (PK)
- buku_id (FK → buku)
- barcode, lokasi_rak, status (tersedia/dipinjam)

**anggota**
- id (PK)
- nis_nip, nama, kelas_jabatan, tipe_anggota, kontak

**users** (staff/admin)
- id (PK)
- username, password, role

**peminjaman**
- id (PK)
- anggota_id (FK → anggota)
- eksemplar_id (FK → eksemplar)
- user_id (FK → users, siapa yang memproses)
- tgl_pinjam, tgl_jatuh_tempo, tgl_kembali, denda

**Relasi:**
- Satu kategori → banyak buku
- Satu buku → banyak eksemplar
- Satu anggota → banyak peminjaman
- Satu eksemplar → banyak peminjaman (riwayat dari waktu ke waktu)

---

## 5. Instalasi & Setup Awal Project

### 5.1 Install software dasar
```
1. Install XAMPP/Laragon (jika belum ada)
2. Install Composer: https://getcomposer.org
3. Install Node.js LTS: https://nodejs.org
4. Install Git: https://git-scm.com
```

### 5.2 Buat project Laravel baru
```bash
composer create-project laravel/laravel perpustakaan-sekolah
cd perpustakaan-sekolah
```

### 5.3 Konfigurasi file .env
Buka file `.env`, sesuaikan koneksi database:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=perpustakaan_sekolah
DB_USERNAME=root
DB_PASSWORD=
```
Buat database kosong bernama `perpustakaan_sekolah` lewat phpMyAdmin.

### 5.4 Install paket autentikasi (Breeze)
```bash
composer require laravel/breeze --dev
php artisan breeze:install blade
npm install
npm run build
```

### 5.5 Jalankan migration awal
```bash
php artisan migrate
```

### 5.6 Jalankan project
```bash
php artisan serve
```
Buka `http://127.0.0.1:8000` di browser — jika halaman login Laravel muncul, setup awal berhasil.

### 5.7 Inisialisasi Git (sangat disarankan)
```bash
git init
git add .
git commit -m "Initial Laravel setup"
```

---

## 6. Struktur Folder Project

```
perpustakaan-sekolah/
├── app/
│   ├── Http/Controllers/     → logika tiap fitur (BukuController, PeminjamanController, dst)
│   └── Models/                → representasi tabel (Buku, Anggota, Eksemplar, dst)
├── database/
│   ├── migrations/            → definisi struktur tabel
│   └── seeders/                → data awal/dummy
├── resources/
│   └── views/                  → tampilan Blade (admin, opac, auth)
├── routes/
│   └── web.php                 → daftar URL & fungsi yang menanganinya
└── public/                      → file yang diakses langsung (gambar cover, dsb)
```

---

## 7. Pengembangan Backend

### 7.1 Urutan pembuatan Model + Migration
Buat berurutan sesuai dependensi (kategori dulu, baru buku, dst):
```bash
php artisan make:model Kategori -m
php artisan make:model Buku -m
php artisan make:model Eksemplar -m
php artisan make:model Anggota -m
php artisan make:model Peminjaman -m
```
Setiap perintah di atas membuat file model + file migration. Isi file migration dengan kolom sesuai skema di Bagian 4, lalu jalankan:
```bash
php artisan migrate
```

### 7.2 Buat Controller untuk tiap modul
```bash
php artisan make:controller BukuController --resource
php artisan make:controller AnggotaController --resource
php artisan make:controller PeminjamanController --resource
```
Controller `--resource` otomatis membuat fungsi standar: index (lihat semua), create, store (simpan), edit, update, destroy (hapus).

### 7.3 Routing
Di `routes/web.php`, daftarkan:
```php
Route::resource('buku', BukuController::class);
Route::resource('anggota', AnggotaController::class);
Route::resource('peminjaman', PeminjamanController::class);
```

### 7.4 Middleware & Role Access
Gunakan middleware Laravel untuk membatasi akses halaman admin hanya untuk role tertentu (admin/pustakawan), sementara anggota hanya bisa akses OPAC & data pinjamannya sendiri.

### 7.5 (Fase Lanjutan) REST API untuk Mobile
Kalau nanti butuh aplikasi Android native, buat API terpisah:
```bash
php artisan make:controller Api/BukuApiController --api
```
Lalu daftarkan di `routes/api.php`, dan gunakan Laravel Sanctum untuk autentikasi token API.

---

## 8. Pengembangan Frontend (Web)

### 8.1 Dua sisi tampilan yang perlu dibangun
- **Sisi Publik (OPAC):** halaman pencarian & detail buku, bisa diakses tanpa login
- **Sisi Admin/Dashboard:** untuk pustakawan kelola data & transaksi, wajib login

### 8.2 Halaman-halaman inti yang perlu dibuat
1. Halaman utama/beranda OPAC
2. Halaman pencarian & hasil pencarian buku
3. Halaman detail buku
4. Halaman login (staff & anggota)
5. Dashboard admin (ringkasan statistik)
6. Halaman kelola buku (list, tambah, edit, hapus)
7. Halaman kelola anggota
8. Halaman transaksi peminjaman & pengembalian
9. Halaman laporan

### 8.3 Styling
Gunakan Tailwind CSS (sudah otomatis terpasang lewat Breeze) untuk mempercepat pembuatan tampilan responsive tanpa menulis CSS manual dari nol.

---

## 9. UI/UX Design

### 9.1 Prinsip dasar
- **Sederhana dan jelas** — pengguna utama adalah siswa & guru, bukan orang IT
- **Konsisten** — warna, tombol, dan pola navigasi sama di semua halaman
- **Mobile-first** — desain untuk layar kecil dulu, baru sesuaikan ke layar besar (karena target akhir termasuk HP)

### 9.2 Saran palet warna & tipografi
- Warna utama: sesuaikan dengan warna identitas sekolah (misal warna seragam/logo)
- Warna aksen: 1 warna kontras untuk tombol aksi utama (mis. tombol "Pinjam")
- Font: gunakan font sans-serif standar (Inter, Poppins, atau default sistem) — hindari font dekoratif untuk teks utama

### 9.3 Alur pengguna (user flow) yang wajib digambarkan sebelum coding
1. **Alur pencarian buku:** Beranda → cari judul → lihat hasil → buka detail → lihat status ketersediaan
2. **Alur peminjaman (sisi petugas):** Login staff → cari anggota → scan/cari eksemplar → konfirmasi pinjam → cetak/tampilkan struk
3. **Alur pengembalian:** Login staff → cari transaksi aktif → konfirmasi kembali → sistem hitung denda otomatis jika telat
4. **Alur anggota cek pinjaman sendiri:** Login anggota → lihat daftar buku yang sedang dipinjam & tanggal jatuh tempo

### 9.4 Rekomendasi alat bantu desain (opsional)
Sebelum coding tampilan, buat dulu wireframe sederhana pakai Figma (gratis) — ini membantu Anda dan siapa pun yang membantu mengembangkan agar tidak bolak-balik ubah desain di tengah jalan.

---

## 10. Mobile & PWA

### 10.1 Membuat web menjadi installable (PWA)
Tambahkan dua file ke project Laravel:

**public/manifest.json**
```json
{
  "name": "Perpustakaan Sekolah",
  "short_name": "Perpus",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1d4ed8",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**public/sw.js** (service worker sederhana, minimal)
```javascript
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());
```

Lalu daftarkan di layout utama (`resources/views/layouts/app.blade.php`):
```html
<link rel="manifest" href="/manifest.json">
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

Setelah ini, saat website dibuka lewat Chrome Android, akan muncul opsi "Install App" / "Add to Home Screen" secara otomatis.

### 10.2 Opsi bungkus jadi APK (jika ingin ada di Play Store)
Gunakan layanan seperti PWABuilder (pwabuilder.com) — masukkan URL website yang sudah live, alat ini otomatis membungkus jadi file APK/AAB siap upload ke Play Store.

### 10.3 Fase lanjutan: aplikasi native Flutter
Hanya diperlukan jika nanti butuh fitur yang tidak bisa dilakukan PWA (misalnya notifikasi push yang sangat andal, akses kamera lebih dalam). Aplikasi Flutter akan mengambil data lewat REST API Laravel yang sudah dibuat di Bagian 7.5.

---

## 11. Testing & Deployment

### 11.1 Testing lokal
- Uji setiap alur (pinjam, kembali, cari buku) di komputer sendiri sebelum online
- Cek tampilan di ukuran layar HP lewat DevTools browser (mode responsive)

### 11.2 Persiapan hosting
- Cari hosting yang mendukung PHP 8.x dan MySQL
- Pastikan bisa akses SSH/Composer, atau minimal File Manager + phpMyAdmin

### 11.3 Deploy ke hosting
```bash
# Di server (jika akses SSH tersedia):
git clone <repo-project-anda>
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan config:cache
```
Jika hosting tidak mendukung SSH, upload file lewat File Manager/FTP, lalu jalankan migration lewat fitur terminal yang disediakan hosting (jika ada), atau import struktur tabel manual lewat phpMyAdmin.

### 11.4 Domain & SSL
- Arahkan domain (mis. `perpus.namasekolah.sch.id`) ke hosting
- Aktifkan SSL (HTTPS) — ini **wajib** untuk PWA, karena service worker hanya berjalan di koneksi aman (HTTPS)

---

## 12. Roadmap Pengembangan (bertahap)

| Tahap | Fokus | Estimasi |
|---|---|---|
| 1 | Setup Laravel, database, autentikasi | 1 minggu |
| 2 | CRUD buku, kategori, anggota | 1-2 minggu |
| 3 | Fitur sirkulasi (pinjam, kembali, denda) | 1-2 minggu |
| 4 | Halaman OPAC publik + pencarian | 1 minggu |
| 5 | UI/UX polish + responsive testing | 1 minggu |
| 6 | Setup PWA + testing di HP Android | 3-4 hari |
| 7 | Deploy ke hosting + domain | 2-3 hari |
| 8 (opsional) | Laporan & statistik lanjutan | 1 minggu |
| 9 (opsional) | API + aplikasi Flutter native | fase terpisah |

---

## 13. Referensi Belajar

- Dokumentasi resmi Laravel: laravel.com/docs
- Dokumentasi Tailwind CSS: tailwindcss.com/docs
- Laravel Breeze: laravel.com/docs/starter-kits
- PWABuilder (untuk konversi ke APK): pwabuilder.com
- Figma (desain wireframe/UI): figma.com

---

*Dokumen ini adalah panduan awal. Sesuaikan detail teknis (nama kolom, aturan bisnis peminjaman, dsb.) dengan kebutuhan aktual sekolah Anda.*
