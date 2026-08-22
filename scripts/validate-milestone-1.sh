#!/usr/bin/env bash
# scripts/validate-milestone-1.sh
# Script validasi untuk Milestone 1: Critical Fixes
# Jalankan: bash scripts/validate-milestone-1.sh

set -e

echo "🔍 Milestone 1 Validation: Critical Fixes"
echo "==========================================="
echo ""

# 1. Cek file-file kritis ada
echo "📁 1. File struktur..."
files=(
  "src/lib/rate-limit.ts"
  "src/lib/two-factor.ts"
  "src/lib/temp-token.ts"
  "src/lib/email.ts"
  "src/lib/whatsapp.ts"
  "src/lib/notification-service.ts"
  "src/lib/error-tracker.ts"
  "src/lib/client-error.ts"
  "src/app/api/auth/forgot-password/route.ts"
  "src/app/api/auth/reset-password/route.ts"
  "src/app/api/auth/2fa/setup/route.ts"
  "src/app/api/auth/2fa/confirm/route.ts"
  "src/app/api/auth/2fa/verify/route.ts"
  "src/app/api/auth/2fa/status/route.ts"
  "src/app/api/auth/sessions/route.ts"
  "src/app/api/auth/sessions/[id]/route.ts"
  "src/app/api/error-log/route.ts"
  "src/app/api/error-log/[id]/route.ts"
  "src/app/api/error-log/client/route.ts"
  "src/app/reset-password/page.tsx"
)

missing=0
for f in "${files[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ MISSING: $f"
    missing=$((missing+1))
  fi
done
echo ""

if [ $missing -gt 0 ]; then
  echo "❌ $missing file(s) missing!"
  exit 1
fi

# 2. Cek schema.prisma mengandung model baru
echo "🗄️ 2. Schema validation..."
schema="prisma/schema.prisma"
models=(
  "model TwoFactorSecret"
  "model PasswordResetToken"
  "model ActiveSession"
  "model EmailLog"
  "model WhatsAppLog"
  "model LibraryRoom"
  "model RoomBooking"
  "model Visitor"
  "model Asset"
  "model AssetLoan"
  "model ApiKey"
  "model ErrorLog"
  "model AuditLogArchive"
)

for m in "${models[@]}"; do
  if grep -q "$m" "$schema"; then
    echo "  ✓ $m"
  else
    echo "  ✗ MISSING: $m"
  fi
done
echo ""

# 3. Cek dependencies ditambahkan
echo "📦 3. Package.json dependencies..."
deps=("nodemailer" "otplib" "@types/nodemailer")
pkg="package.json"
for d in "${deps[@]}"; do
  if grep -q "\"$d\":" "$pkg"; then
    echo "  ✓ $d"
  else
    echo "  ✗ MISSING dep: $d"
  fi
done
echo ""

# 4. Cek rate limit dipakai di login
echo "🔐 4. Security integration..."
if grep -q "rateLimit" src/app/api/auth/login/route.ts; then
  echo "  ✓ Rate limiting di login"
else
  echo "  ✗ Rate limit TIDAK ada di login route"
fi

if grep -q "createTempToken" src/app/api/auth/login/route.ts; then
  echo "  ✓ 2FA check di login"
else
  echo "  ✗ 2FA check TIDAK ada di login"
fi
echo ""

# 5. Cek env vars yang dibutuhkan
echo "🔑 5. Environment variables (perlu di .env sekolah)..."
echo "  Wajib diset:"
echo "    - JWT_SECRET (sudah ada)"
echo "    - CRON_SECRET (sudah ada)"
echo "    - GMAIL_USER (untuk email)"
echo "    - GMAIL_APP_PASSWORD (untuk email)"
echo "    - FONNTE_TOKEN (untuk WhatsApp)"
echo "    - NEXTAUTH_URL (untuk reset password link)"
echo ""

echo "✅ Validasi struktur selesai."
echo ""
echo "🚀 Next steps:"
echo "  1. cd ke project root"
echo "  2. bun install (install deps baru: nodemailer, otplib, @types/nodemailer)"
echo "  3. bunx prisma generate (generate Prisma client)"
echo "  4. bunx prisma db push (apply schema baru)"
echo "  5. Set env vars di .env (GMAIL_USER, GMAIL_APP_PASSWORD, FONNTE_TOKEN)"
echo "  6. bun run dev"
echo "  7. Test login → setup 2FA → test WhatsApp blast"
