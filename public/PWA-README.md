# PWA Installation Guide

Jendela Ilmu dapat diinstall sebagai aplikasi native di berbagai device.

## 📱 Install di Android

### Cara 1: Otomatis (Recommended)
1. Buka **https://perpustakaan.sekolahanda.sch.id** di Chrome
2. Tunggu beberapa detik — akan muncul banner "Install App" otomatis
3. Tap **Install**
4. App muncul di home screen

### Cara 2: Manual
1. Buka website di Chrome
2. Tap **⋮** (3 titik) di pojok kanan atas
3. Pilih **"Add to Home Screen"** atau **"Install App"**
4. Tap **Add** untuk konfirmasi

## 🍎 Install di iPhone / iPad

1. Buka **https://perpustakaan.sekolahanda.sch.id** di **Safari** (wajib Safari!)
2. Tap tombol **Share** (kotak dengan panah ke atas) di bar bawah
3. Scroll ke bawah, pilih **"Add to Home Screen"**
4. Ganti nama jika perlu, tap **Add**

> ⚠️ Chrome di iOS tidak mendukung install PWA. Harus pakai Safari.

## 💻 Install di Laptop (Windows / Mac / Linux)

### Chrome / Edge
1. Buka website
2. Lihat icon **⊕** di address bar (kanan)
3. Klik **Install Jendela Ilmu**
4. App akan terinstall dan muncul di Start Menu / Applications

### Firefox
1. Buka website
2. Klik **☰** → **Install Site as App** (experimental)

## 📋 Fitur Setelah Install

Setelah terinstall, Jendela Ilmu menjadi seperti app native:

| Fitur | Benefit |
|-------|---------|
| 📱 **Home Screen Icon** | Tap langsung dari home screen, seperti app lain |
| ⚡ **Super Cepat** | Loading instant, no browser bar |
| 📡 **Offline Mode** | Buka katalog & lihat pinjaman tanpa internet |
| 🔔 **Push Notifications** | Pengingat jatuh tempo, rekomendasi baru |
| 🔐 **Login Persistent** | Tidak perlu login ulang setiap buka app |
| 🖥️ **Multi-device** | Install di HP, tablet, & laptop — data sync |
| 📊 **App-like UX** | Full screen, no browser chrome |

## 🔧 Untuk Tim IT Sekolah

### Hosting Requirements
- HTTPS (wajib untuk PWA) — Let's Encrypt cukup
- Service worker di-serve dari root `/sw.js`
- Manifest di-serve dari `/manifest.json`
- Header COEP/COOP untuk SharedArrayBuffer (optional)

### Update PWA
Setiap deploy, browser otomatis check update:
- Update dalam 1-2 hari (default) atau
- Force update via service worker `skipWaiting()`

### Generate PNG Icons
PNG icons bisa di-generate otomatis dari SVG menggunakan tools:
```bash
# Install imagemagick atau librsvg
rsvg-convert -w 192 -h 192 public/icons/icon-192.svg -o public/icons/icon-192.png
rsvg-convert -w 512 -h 512 public/icons/icon-512.svg -o public/icons/icon-512.png

# Atau pakai online tool seperti https://realfavicongenerator.net/
```

Required sizes: 72, 96, 128, 144, 152, 192, 384, 512

### Convert to APK (Optional)
Untuk distribusi via Play Store atau instalasi offline:
- **PWA Builder**: https://www.pwabuilder.com/ (recommended)
- **Bubblewrap**: CLI tool dari Google Chrome team
- Output signed APK untuk sideloading

### Convert ke iOS App Store
- PWA tidak bisa langsung ke App Store
- Tapi bisa pakai **PWA Builder iOS Package** untuk wrap ke Xcode project
- Submit via TestFlight atau App Store Connect

## 📊 Monitoring

Cek status PWA di:
- Chrome DevTools → Application → Manifest
- Chrome DevTools → Application → Service Workers
- Lighthouse PWA audit

Target score: **100/100** untuk semua PWA criteria.
