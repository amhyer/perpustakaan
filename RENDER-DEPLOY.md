# Render Deployment Guide

## Step 1: Login ke Render

Buka browser → https://dashboard.render.com
Login atau buat akun baru (bisa pakai GitHub)

## Step 2: Create Web Service

1. Klik **"New +"** → **"Web Service"**
2. Klik **"Build and deploy from a Git repository"** → **Next**
3. Klik **"GitHub"** → Authorize Render
4. Cari & pilih repo **`amhyer/perpustakaan`** → **Connect**

## Step 3: Isi Form (Copy-Paste)

| Field | Value |
|-------|-------|
| **Name** | `perpustakaan-jendela-ilmu` |
| **Region** | `Oregon (US West)` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npx prisma db push --accept-data-loss && npm run build` |
| **Start Command** | `npm run start` |
| **Plan** | `Free` |

## Step 4: Environment Variables

Klik **"Advanced"** → **"Add Environment Variable"** → Tambahkan satu per satu:

```
KEY: DATABASE_URL
VALUE: file:./db/custom.db
```

```
KEY: JWT_SECRET
VALUE: s7o6FqfxP48iuKi6XU0UJsST/DwmnTOgi8VdN/uV1yk=
```

```
KEY: NEXT_PUBLIC_APP_URL
VALUE: https://perpustakaan-jendela-ilmu.onrender.com
```

```
KEY: TRUST_PROXY
VALUE: true
```

```
KEY: SENTRY_DSN
VALUE: https://95d68474f906fbf68a34f317ecccbdf4@o4507003076280320.ingest.us.sentry.io/4511960652578816
```

```
KEY: NEXT_PUBLIC_SENTRY_DSN
VALUE: https://95d68474f906fbf68a34f317ecccbdf4@o4507003076280320.ingest.us.sentry.io/4511960652578816
```

```
KEY: NODE_ENV
VALUE: production
```

## Step 5: Deploy

1. Klik **"Create Web Service"**
2. Tunggu build selesai (~5-10 menit)
3. Build log akan muncul di bawah

## Step 6: Cek Hasil

App URL: `https://perpustakaan-jendela-ilmu.onrender.com`

Login:
- Email: `pustakawan@jendelailmu.sch.id`
- Password: `password123`

## Step 7: Cek Sentry

Buka: `https://sentry.io/organizations/upt-spf-sd-negeri-unggulan-mon/projects/javascript-nextjs/issues/`

Error akan muncul dalam 1-2 menit setelah ada aktivitas di app.
