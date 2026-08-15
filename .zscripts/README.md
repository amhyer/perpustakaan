# ZScripts - Deployment & Development Scripts

Kumpulan script untuk development dan deployment aplikasi Perpustakaan.

## Daftar Script

| Script | Fungsi | Penggunaan |
|--------|--------|------------|
| `dev.sh` | Menjalankan development server | `./dev.sh` |
| `build.sh` | Build production | `./build.sh` |
| `start.sh` | Menjalankan production server | `./start.sh` |
| `database-runtime-build.sh` | Setup database untuk deployment | Dipanggil oleh `build.sh` |
| `python-runtime-build.sh` | Setup Python dependencies | Dipanggil oleh `build.sh` |
| `mini-services-build.sh` | Build mini-services | Dipanggil oleh `build.sh` |
| `mini-services-install.sh` | Install dependencies mini-services | Dipanggil oleh `build.sh` |
| `mini-services-start.sh` | Menjalankan mini-services | Dipanggil oleh `start.sh` |

## Alur Eksekusi

### Development
```
dev.sh
  ├── bun install
  ├── bun run db:push
  ├── bun run dev (port 3000)
  └── start_mini_services() (jika ada)
```

### Production Build
```
build.sh
  ├── bun install
  ├── bun run build
  ├── mini-services-install.sh
  ├── mini-services-build.sh
  ├── python-runtime-build.sh
  └── database-runtime-build.sh
```

### Production Start
```
start.sh
  ├── mini-services-start.sh
  └── node .next/standalone/server.js
```

## Prasyarat

- **bun** - JavaScript runtime
- **curl** - Untuk health check
- Database sudah dikonfigurasi (lihat `prisma/schema.prisma`)

## Catatan

- Script menggunakan `set -e` atau `set -euo pipefail` untuk error handling
- Log output tersimpan di `.zscripts/mini-service-*.log` untuk mini-services
- Environment variable `NEXT_TELEMETRY_DISABLED=1` digunakan untuk menonaktifkan telemetry

## Troubleshooting

### Port 3000 sudah digunakan
```bash
# Cari proses yang menggunakan port
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Hentikan proses
kill -9 <PID>
```

### Database connection error
```bash
# Pastikan database sudah dikonfigurasi
bun run db:push
```

### Mini-services tidak jalan
```bash
# Cek log
cat .zscripts/mini-service-*.log
```
