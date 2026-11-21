#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  VOXI — one-click local start for macOS
#  Double-click this file in Finder. It will:
#   1. check Node.js, 2. create your .env, 3. install packages,
#   4. set up the database, 5. start VOXI and open your browser.
# ─────────────────────────────────────────────────────────────
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
purple() { printf "\033[35m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }
pause_exit() { echo; read -r -p "Press Enter to close this window…" _; exit "${1:-1}"; }

clear
purple "  V O X I  —  starting your gym ERP"
echo

# 1. Node.js
if ! command -v node >/dev/null 2>&1; then
  red "Node.js is not installed."
  echo "Opening the download page — install the LTS version, then double-click 'Start VOXI' again."
  open "https://nodejs.org/en/download"
  pause_exit
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  red "Your Node.js is version $(node -v). VOXI needs version 20 or newer."
  open "https://nodejs.org/en/download"
  pause_exit
fi
echo "✓ Node.js $(node -v)"

# 2. .env with database URL + secret
if [ ! -f .env ] || ! grep -qE '^DATABASE_URL="?postgres' .env; then
  echo
  purple "VOXI needs a PostgreSQL database."
  echo "Easiest: free cloud database at https://neon.tech"
  echo "  → Sign up (Google is fine) → Create project → copy the connection string"
  echo "    (it starts with postgresql://...)"
  open "https://console.neon.tech/signup" >/dev/null 2>&1
  echo
  read -r -p "Paste your database connection string here and press Enter: " DBURL
  DBURL=$(echo "$DBURL" | tr -d '[:space:]' | sed "s/^psql//; s/^'//; s/'$//")
  case "$DBURL" in
    postgres://*|postgresql://*) ;;
    *) red "That doesn't look like a PostgreSQL URL (it should start with postgresql://)."; pause_exit ;;
  esac
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > .env <<ENV
DATABASE_URL="$DBURL"
DATABASE_URL_UNPOOLED="$DBURL"
AUTH_SECRET="$SECRET"
SEED_PASSWORD="voxi1234"
ENV
  echo "✓ Saved your settings in .env (this file is never uploaded to GitHub)"
fi

# Older .env files: make sure the extra values exist
grep -q '^DATABASE_URL_UNPOOLED=' .env || grep -E '^DATABASE_URL=' .env | sed 's/^DATABASE_URL=/DATABASE_URL_UNPOOLED=/' >> .env
grep -q '^AUTH_SECRET=' .env || echo "AUTH_SECRET=\"$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")\"" >> .env

# 3. Packages (again after an update adds new ones)
if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
  echo; purple "Installing packages (1–3 minutes)…"
  npm install || { red "npm install failed — see the messages above."; pause_exit; }
fi
echo "✓ Packages installed"

# 4. Database tables + demo data (first time, and after updates that change the layout)
DB_VERSION=v2
if [ "$(cat .voxi-db-ready 2>/dev/null)" != "$DB_VERSION" ]; then
  if [ -f .voxi-db-ready ]; then
    echo; purple "This VOXI update changes the database (multiple gyms, photos, WhatsApp, housekeeping)."
    echo "The DEMO data will be wiped and re-created in 5 seconds — close this window to cancel."
    sleep 5
  fi
  echo; purple "Creating database tables…"
  npx prisma db push --force-reset --accept-data-loss || { red "Could not reach the database. Check the URL in .env."; pause_exit; }
  echo; purple "Adding demo gym data…"
  npm run db:seed || { red "Seeding failed — see the messages above."; pause_exit; }
  echo "$DB_VERSION" > .voxi-db-ready
fi
echo "✓ Database ready"

# 5. Start
echo
purple "Starting VOXI at http://localhost:3000"
echo "Sign in with owner@voxi.qa / voxi1234  (also: housekeeping@ · pulse@ (2nd gym) · admin@voxi.qa)"
echo "Keep this window open while you use VOXI. Close it (or press Ctrl+C) to stop."
echo
( sleep 6; open "http://localhost:3000" ) &
npm run dev
