# Deployment Guide — Perpustakaan Jendela Ilmu

Panduan deployment production-ready untuk berbagai environment.

## 📑 Daftar Isi

1. [Persiapan](#1-persiapan)
2. [Build](#2-build)
3. [Deployment Options](#3-deployment-options)
   - [Option A: VPS dengan Caddy](#option-a-vps-dengan-caddy)
   - [Option B: Docker](#option-b-docker)
   - [Option C: Vercel + Managed DB](#option-c-vercel--managed-db)
4. [Post-Deployment](#4-post-deployment)
5. [Backup & Recovery](#5-backup--recovery)
6. [Monitoring](#6-monitoring)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Persiapan

### System Requirements

| Komponen | Minimum | Recommended |
|---|---|---|
| CPU | 1 vCPU | 2+ vCPU |
| RAM | 1 GB | 2+ GB |
| Storage | 5 GB | 20+ GB (untuk backup) |
| OS | Ubuntu 20.04 | Ubuntu 22.04 LTS |
| Node.js | 20 LTS | 22 LTS |
| Bun | 1.3+ | latest |

### Domain & SSL

Anda membutuhkan:
- Domain sendiri (mis. `perpustakaan.sekolah.sch.id`)
- SSL certificate (Let's Encrypt via Caddy otomatis)

### Secrets yang Harus Disiapkan

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)

echo "JWT_SECRET: $JWT_SECRET"
echo "CRON_SECRET: $CRON_SECRET"

# Simpan di password manager (Bitwarden, 1Password, dll)
```

### Email (Gmail SMTP)

1. Buat akun Gmail khusus: `perpustakaan@sekolah.sch.id`
2. Enable 2-Step Verification: https://myaccount.google.com/security
3. Buat App Password: https://myaccount.google.com/apppasswords
4. Pilih "Mail" + "Other (Custom name)" → "Perpustakaan App"
5. Copy 16-char password

### WhatsApp (Fonnte)

1. Daftar di https://fonnte.com
2. Pilih paket (mulai Rp 100rb/bulan untuk unlimited)
3. Hubungkan nomor WA sekolah via scan QR
4. Copy API token

---

## 2. Build

### 2.1 Clone & Install

```bash
# SSH ke server
ssh user@perpustakaan.sekolah.sch.id

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone repo
git clone https://github.com/amhyer/perpustakaan.git
cd perpustakaan

# Install deps
bun install --frozen-lockfile

# Generate Prisma
bunx prisma generate
```

### 2.2 Environment File

```bash
# Buat .env
cat > .env <<EOF
# Secrets
JWT_SECRET=PASTE_HERE
CRON_SECRET=PASTE_HERE

# Database
DATABASE_URL=file:/var/lib/perpustakaan/data.db

# Public URL
NEXTAUTH_URL=https://perpustakaan.sekolah.sch.id

# Email
GMAIL_USER=perpustakaan@sekolah.sch.id
GMAIL_APP_PASSWORD=your-app-password

# WhatsApp
FONNTE_TOKEN=your-fonnte-token

# Upload directory
UPLOAD_DIR=/var/lib/perpustakaan/uploads
EOF

chmod 600 .env
```

### 2.3 Database Setup

```bash
# Buat folder data
sudo mkdir -p /var/lib/perpustakaan/{uploads,backups}
sudo chown -R $USER:$USER /var/lib/perpustakaan

# Create initial DB
mkdir -p db
bunx prisma db push --accept-data-loss

# Seed demo data (opsional, untuk testing)
bunx tsx prisma/seed.ts
```

### 2.4 Build

```bash
bun run build
```

Output di `.next/standalone/`.

### 2.5 Smoke Test

```bash
# Test run langsung
NODE_ENV=production PORT=3000 bun .next/standalone/server.js

# Di terminal lain
curl http://localhost:3000/api/auth/me
# → {"user":null}

# Stop test
Ctrl+C
```

---

## 3. Deployment Options

### Option A: VPS dengan Caddy (Recommended)

**Cocok untuk**: Sekolah dengan budget terbatas, kontrol penuh, server on-premise.

#### Stack:
- Ubuntu 22.04
- Bun runtime
- Caddy reverse proxy
- systemd service
- Cron job

#### Setup:

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y caddy

# 2. Setup application directory
sudo mkdir -p /opt/perpustakaan
sudo cp -r .next /opt/perpustakaan/
sudo cp -r public /opt/perpustakaan/
sudo cp -r prisma /opt/perpustakaan/
sudo cp -r src/lib /opt/perpustakaan/src/lib  # untuk instrumentation
sudo cp package.json bun.lock /opt/perpustakaan/
sudo cp -n .env /opt/perpustakaan/
sudo chown -R www-data:www-data /opt/perpustakaan

# 3. Install Bun di production path
sudo -u www-data bash -c 'curl -fsSL https://bun.sh/install | bash'

# 4. Install deps (production only)
cd /opt/perpustakaan
sudo -u www-data bash -c '~/.bun/bin/bun install --production --frozen-lockfile'
sudo -u www-data bash -c '~/.bun/bin/bunx prisma generate'
```

#### systemd Service:

```bash
# Buat /etc/systemd/system/perpustakaan.service
sudo tee /etc/systemd/system/perpustakaan.service > /dev/null <<EOF
[Unit]
Description=Perpustakaan Jendela Ilmu
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/perpustakaan
EnvironmentFile=/opt/perpustakaan/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/home/www-data/.bun/bin/bun .next/standalone/server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/perpustakaan/app.log
StandardError=append:/var/log/perpustakaan/error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

# Setup log folder
sudo mkdir -p /var/log/perpustakaan
sudo chown www-data:www-data /var/log/perpustakaan

# Enable & start
sudo systemctl daemon-reload
sudo systemctl enable perpustakaan
sudo systemctl start perpustakaan
sudo systemctl status perpustakaan
```

#### Caddyfile:

```caddyfile
# /etc/caddy/Caddyfile
perpustakaan.sekolah.sch.id {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Optional: enable compression
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logging
    log {
        output file /var/log/caddy/perpustakaan.log
    }
}
```

```bash
# Reload Caddy
sudo systemctl reload caddy
```

#### Cron untuk Daily Backup:

```bash
# /etc/cron.d/perpustakaan-backup
0 2 * * * www-data curl -s -H "X-Cron-Secret: $CRON_SECRET" http://localhost:3000/api/cron/backup-db >> /var/log/perpustakaan/backup.log 2>&1
```

```bash
# Enable
sudo systemctl restart cron
```

#### Folder Permissions:

```bash
# Data & uploads perlu writable
sudo chown -R www-data:www-data /var/lib/perpustakaan
sudo chmod -R 755 /var/lib/perpustakaan
```

#### Verify:

```bash
# Check service
sudo systemctl status perpustakaan

# Check logs
sudo journalctl -u perpustakaan -f
tail -f /var/log/perpustakaan/app.log

# Test dari browser
curl -I https://perpustakaan.sekolah.sch.id
# → 200 OK

# Test login
curl -X POST https://perpustakaan.sekolah.sch.id/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pustakawan@jendelailmu.sch.id","password":"password123"}'
```

---

### Option B: Docker

**Cocok untuk**: Tim DevOps, reproducible deployment, multi-container.

#### Dockerfile:

```dockerfile
# /Dockerfile
FROM oven/bun:1.3 as base
WORKDIR /app

# Install deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Generate Prisma
COPY prisma ./prisma
RUN bunx prisma generate

# Build
COPY . .
RUN bun run build

# Production
FROM oven/bun:1.3-slim
WORKDIR /app

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "server.js"]
```

#### docker-compose.yml:

```yaml
version: "3.8"

services:
  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - perpustakaan_data:/var/lib/perpustakaan
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/auth/me"]
      interval: 30s
      timeout: 10s
      retries: 3

  caddy:
    image: caddy:2
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  perpustakaan_data:
  caddy_data:
  caddy_config:
```

```bash
# Deploy
docker compose up -d --build

# Check
docker compose logs -f app
```

---

### Option C: Vercel + Managed DB

**Cocok untuk**: Sekolah yang ingin zero-ops, skala besar, CDN global.

**Catatan**: Vercel serverless tidak ideal untuk SQLite + standalone build. Lebih cocok untuk PostgreSQL (Neon, Supabase).

```bash
# 1. Push ke GitHub
git push origin main

# 2. Import di Vercel
# https://vercel.com/new

# 3. Set env vars di Vercel dashboard

# 4. Switch ke PostgreSQL
# Edit prisma/schema.prisma:
#   provider = "postgresql"
#   url = env("DATABASE_URL")

# 5. Deploy
```

**⚠️ LIMITASI**: Cron job harus pakai Vercel Cron (bukan instrumentation.ts), upload file harus ke S3/R2 (bukan local disk).

---

## 4. Post-Deployment

### 4.1 First-Time Setup

1. **Login** dengan akun default: `pustakawan@jendelailmu.sch.id` / `password123`
2. **Ganti password default** (Settings → Keamanan)
3. **Aktifkan 2FA** untuk pustakawan
4. **Update Settings**:
   - Identitas perpustakaan (nama, alamat, kepala)
   - Aturan peminjaman (override default)
   - Reminder (default 1 hari)
5. **Setup email channel** (Settings → Channel Notifikasi)
6. **Setup WhatsApp channel**
7. **Hapus akun demo** (atau ganti password)
8. **Import anggota** (CSV)
9. **Import koleksi buku** (manual atau SIBI)

### 4.2 Cron Verification

```bash
# Manual trigger
curl -X POST https://perpustakaan.sekolah.sch.id/api/cron/daily-tasks \
  -H "Authorization: Bearer $CRON_SECRET"

# Expected response:
# {
#   "success": true,
#   "tasks": {
#     "preDueReminders": 0,
#     "overdueReminders": 0,
#     "overdueUpdated": 0,
#     ...
#   }
# }
```

### 4.3 Test Notification Channels

- Buat announcement test → cek email & WA masuk
- Set due date 1 hari lagi untuk test loan → tunggu cron job

### 4.4 Firewall

```bash
# Allow only SSH, HTTP, HTTPS
sudo ufw default deny incoming
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## 5. Backup & Recovery

### 5.1 Automated Backup (sudah built-in)

Cron job `/api/cron/backup-db` membuat snapshot ke `db/backups/`:
- ✅ Auto-rotate 7 hari
- ✅ Trigger via external cron (recommended) atau instrumentation.ts

### 5.2 Manual Backup

```bash
# Via UI: Settings → Backup Database → Unduh

# Via CLI:
cp /var/lib/perpustakaan/data.db /backup/perpustakaan-$(date +%Y%m%d).db

# Upload juga:
tar -czf /backup/uploads-$(date +%Y%m%d).tar.gz /var/lib/perpustakaan/uploads/
```

### 5.3 Off-Site Backup (Recommended)

```bash
# rclone ke Google Drive
rclone sync /var/lib/perpustakaan/backups/ gdrive:perpustakaan-backups/

# Atau rsync ke server lain
rsync -avz /var/lib/perpustakaan/backups/ backup@backup.sekolah.sch.id:/backups/perpustakaan/
```

### 5.4 Disaster Recovery

```bash
# 1. Setup server baru
# 2. Install dependencies (lihat Step 2)
# 3. Restore database
cp /backup/data.db /var/lib/perpustakaan/data.db
chown www-data:www-data /var/lib/perpustakaan/data.db

# 4. Restore uploads
tar -xzf /backup/uploads.tar.gz -C /var/lib/perpustakaan/

# 5. Apply migrations
bunx prisma db push

# 6. Start service
sudo systemctl start perpustakaan
```

---

## 6. Monitoring

### 6.1 Application Logs

```bash
# Real-time
sudo journalctl -u perpustakaan -f

# Last 100 lines
sudo journalctl -u perpustakaan -n 100

# Since 1 hour ago
sudo journalctl -u perpustakaan --since "1 hour ago"
```

### 6.2 Built-in Monitoring (recommended)

Akses via UI:
- **Settings → Jejak Aktivitas**: Audit log semua aksi
- **Menu Log Notifikasi**: Tracking email & WA
- **Dashboard**: Stats real-time

### 6.3 External Monitoring (opsional)

**Uptime monitoring** (cek apakah site hidup):
- UptimeRobot (gratis)
- BetterStack
- Healthchecks.io

**Error tracking** (untuk production besar):
- Sentry
- GlitchTip
- Highlight.io

**Server monitoring**:
- Netdata (ringan, self-hosted)
- Prometheus + Grafana

### 6.4 Health Check Endpoint

Tambahkan di production (opsional):

```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
```

---

## 7. Troubleshooting

### 7.1 "502 Bad Gateway" dari Caddy

Cek aplikasi:
```bash
sudo systemctl status perpustakaan
sudo journalctl -u perpustakaan -n 50
```

### 7.2 Disk Penuh

```bash
# Cek usage
df -h /var/lib/perpustakaan

# Hapus backup lama
find /var/lib/perpustakaan/db/backups -mtime +30 -delete

# Hapus log lama
sudo journalctl --vacuum-time=7d
```

### 7.3 Database Locked

```bash
# Cek lock
ls -la /var/lib/perpustakaan/data.db*
fuser /var/lib/perpustakaan/data.db

# Kill proses yang lock (HATI-HATI)
# Restart service
sudo systemctl restart perpustakaan
```

### 7.4 Email Tidak Terkirim

Cek logs:
```bash
# Application
sudo journalctl -u perpustakaan | grep -i "email"

# Settings UI
# Settings → Jejak Aktivitas → filter by Email
```

Common issues:
- ❌ Gmail App Password salah → generate ulang
- ❌ 2FA Gmail belum aktif
- ❌ GMAIL_USER tidak sama dengan akun Gmail

### 7.5 WhatsApp Gagal

Cek:
- ✅ Fonnte device connected (cek dashboard Fonnte)
- ✅ Saldo Fonnte cukup
- ✅ Format nomor HP (08xx, +62, atau 628xx)

### 7.6 Memory Leak / Out of Memory

```bash
# Cek memory
free -h
ps aux | grep bun

# Tambah swap kalau perlu
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Restart service
sudo systemctl restart perpustakaan
```

### 7.7 Slow Performance

1. **Cek database size**:
   ```bash
   ls -lh /var/lib/perpustakaan/data.db
   du -sh /var/lib/perpustakaan/uploads/
   ```

2. **Vacuum SQLite** (optimize):
   ```bash
   sqlite3 /var/lib/perpustakaan/data.db "VACUUM;"
   ```

3. **Cek slow queries**: Tambah logging di `instrumentation.ts`

4. **Upgrade server**: Tambah RAM/CPU

5. **Migrate ke PostgreSQL**: Untuk scale besar (> 100 concurrent users)

---

## 8. Maintenance Schedule

### Harian (otomatis via cron)
- ✅ Reminder jatuh tempo (jam 00:00)
- ✅ Update OVERDUE status
- ✅ Auto-expired reservations
- ✅ Backup database (jam 02:00)

### Mingguan (manual)
- 📋 Review error log → fix bugs
- 📋 Review audit log → anomali
- 📋 Cek disk space
- 📋 Verifikasi backup integrity

### Bulanan (manual)
- 📊 Review statistik & laporan
- 📧 Test kirim email blast
- 📱 Test kirim WhatsApp
- 🔄 Update dependencies (`bun update`)

### Tahunan
- 🔐 Rotate JWT_SECRET
- 🔐 Rotate CRON_SECRET
- 📋 Review retention policy
- 🆙 Major version upgrade

---

## 9. Cost Estimation (Indonesia)

| Komponen | Provider | Biaya/bulan |
|---|---|---|
| VPS 2GB RAM | IDCloudhost / DigitalOcean | Rp 100-200rb |
| Domain .sch.id | PANDI | Rp 100-150rb/tahun |
| SSL | Let's Encrypt (via Caddy) | Gratis |
| Email (Gmail) | Google Workspace | Rp 60rb/user/bulan |
| WhatsApp Gateway | Fonnte | Rp 100-500rb |
| Backup storage (50GB) | included di VPS | - |
| **Total estimasi** | | **Rp 350-900rb/bulan** |

Untuk skala kecil-menengah, **< Rp 500rb/bulan** sudah sangat cukup.

---

*Dokumentasi ini akan diupdate seiring perkembangan aplikasi. Untuk pertanyaan, hubungi maintainer atau buka GitHub issue.*
