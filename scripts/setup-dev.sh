#!/bin/bash
# Setup & run Perpustakaan Jendela Ilmu dev server.
#
# Usage:
#   bash scripts/setup-dev.sh
#
# Akan otomatis:
# 1. Check Node.js & install bun jika belum ada
# 2. Install dependencies
# 3. Setup .env
# 4. Generate Prisma client
# 5. Push schema ke database
# 6. Seed sample data
# 7. Start dev server di http://localhost:3001

set -e

cd "$(dirname "$0")/.."

echo "════════════════════════════════════════"
echo "  Setup Perpustakaan Jendela Ilmu"
echo "════════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js tidak ditemukan. Install dulu dari https://nodejs.org"
  exit 1
fi
echo "✓ Node.js $(node --version)"

# Install bun jika belum ada
if ! command -v bun &> /dev/null; then
  echo "→ Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  if ! command -v bun &> /dev/null; then
    echo "❌ Gagal install bun. Coba manual: https://bun.sh/docs/installation"
    exit 1
  fi
fi
echo "✓ bun $(bun --version)"

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo "→ Installing dependencies (mungkin butuh 2-3 menit)..."
  bun install
fi
echo "✓ Dependencies installed"

# Setup .env
if [ ! -f ".env" ]; then
  echo "→ Creating .env..."
  cat > .env <<EOF
# Database
DATABASE_URL="file:./prisma/db/custom.db"

# Auth
JWT_SECRET="$(openssl rand -base64 32 2>/dev/null || echo 'change-me-in-production-min-32-chars-long')"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3001"
PORT=3001
NODE_ENV=development

# Optional: Email
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Optional: WhatsApp (Fonnte)
# FONNTE_DEVICE=your-device-id
EOF
  echo "✓ .env created (JWT_SECRET auto-generated)"
fi

# Generate Prisma client
echo "→ Generating Prisma client..."
bunx prisma generate

# Push schema
echo "→ Pushing database schema..."
bunx prisma db push --accept-data-loss

# Seed sample data
echo "→ Seeding sample data..."
bunx prisma db seed 2>/dev/null || echo "  (no seed script — skip)"

echo ""
echo "════════════════════════════════════════"
echo "  ✓ Setup selesai!"
echo "════════════════════════════════════════"
echo ""
echo "Demo accounts (jika seed dijalankan):"
echo "  Pustakawan  : pustakawan@jendelailmu.sch.id"
echo "  Guru         : budi@jendelailmu.sch.id"
echo "  Siswa        : ahmad@jendelailmu.sch.id"
echo "  Password      : password123"
echo ""
echo "Starting dev server di http://localhost:3001"
echo "(tekan Ctrl+C untuk stop)"
echo ""

# Start dev server
bun run dev
