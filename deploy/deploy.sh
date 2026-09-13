#!/usr/bin/env bash
set -Eeuo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "این اسکریپت باید با sudo اجرا شود: sudo bash deploy/deploy.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="/opt/pouya-loyalty"
LOG_DIR="/var/log/pouya-loyalty"

echo "[1/7] نصب پیش‌نیازها"
apt-get update -qq
apt-get install -y -qq curl nginx postgresql postgresql-contrib rsync >/dev/null

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
if ! command -v pm2 >/dev/null 2>&1; then npm install -g pm2 >/dev/null; fi

echo "[2/7] کپی نسخه برنامه"
mkdir -p "$APP_DIR/backend" "$APP_DIR/frontend" "$LOG_DIR"
rsync -a --delete --exclude node_modules --exclude .env --exclude .tmp "$SOURCE_ROOT/crm-backend/" "$APP_DIR/backend/"

echo "[3/7] تنظیم محیط"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cp "$SCRIPT_DIR/.env.production" "$APP_DIR/backend/.env"
  echo "فایل $APP_DIR/backend/.env ساخته شد. مقادیر YOUR_... را تنظیم و اسکریپت را دوباره اجرا کنید."
  exit 2
fi
if grep -q 'YOUR_' "$APP_DIR/backend/.env"; then
  echo "ابتدا مقادیر محرمانه فایل $APP_DIR/backend/.env را کامل کنید."
  exit 2
fi

echo "[4/7] نصب و مهاجرت بک‌اند"
cd "$APP_DIR/backend"
npm ci >/dev/null
npx prisma migrate deploy
if [ "${RUN_SEED:-false}" = "true" ]; then npx prisma db seed; fi

echo "[5/7] ساخت فرانت‌اند"
cd "$SOURCE_ROOT/crm-frontend"
npm ci >/dev/null
VITE_API_BASE_URL=/api/v1 npm run build
rsync -a --delete dist/ "$APP_DIR/frontend/dist/"

echo "[6/7] اجرای سرویس"
cp "$SCRIPT_DIR/ecosystem.config.js" "$APP_DIR/backend/ecosystem.config.js"
pm2 delete pouya-loyalty-backend >/dev/null 2>&1 || true
pm2 start "$APP_DIR/backend/ecosystem.config.js" --env production
pm2 save

echo "[7/7] تنظیم Nginx"
cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/pouya-loyalty
ln -sfn /etc/nginx/sites-available/pouya-loyalty /etc/nginx/sites-enabled/pouya-loyalty
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "باشگاه مشتریان با موفقیت مستقر شد. وضعیت: pm2 status"
