# Mini-Services

Direktori untuk microservices tambahan yang berjalan bersama aplikasi utama Perpustakaan.

## Tujuan

Direktori ini menyimpan service-service independen yang:
- Berjalan di port berbeda dari aplikasi utama (port 3000)
- Memiliki `package.json` dan script `dev` sendiri
- Diluncurkan otomatis oleh `dev.sh` dan `start.sh`

## Struktur yang Diharapkan

```
mini-services/
├── service-a/
│   ├── package.json      # Wajib: harus punya script "dev"
│   ├── src/
│   └── ...
├── service-b/
│   ├── package.json
│   └── ...
└── README.md
```

## Cara Menambah Service Baru

1. Buat direktori baru di dalam `mini-services/`:
   ```bash
   mkdir mini-services/my-service
   cd mini-services/my-service
   ```

2. Inisialisasi package:
   ```bash
   bun init
   ```

3. Pastikan `package.json` memiliki script `dev`:
   ```json
   {
     "scripts": {
       "dev": "bun run src/index.ts"
     }
   }
   ```

4. Service akan otomatis diluncurkan saat menjalankan `dev.sh` atau `start.sh`

## Catatan

- Setiap service berjalan di background dengan log terpisah
- Log tersimpan di `.zscripts/mini-service-<nama>.log`
- Service harus bisa dihentikan dengan signal SIGTERM

## Status Saat Ini

Direktori ini masih kosong (hanya berisi `.gitkeep`). Infrastructure sudah siap, tinggal menambahkan service yang dibutuhkan.
