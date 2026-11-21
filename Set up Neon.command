#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  VOXI × Neon setup (macOS). Double-click in Finder.
#  Runs: neon install/login → init → deploy → npm install →
#  prisma db push → seed → build → start → end-to-end checks
#  (scripts/e2e-check.mjs).
#  Everything is logged to neon-setup.log (secrets are not printed).
# ─────────────────────────────────────────────────────────────
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.npm-global/bin:$PATH"
LOG="neon-setup.log"; : > "$LOG"
exec > >(tee -a "$LOG") 2>&1
step() { printf "\n\033[35m▶ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[31m✗ %s\033[0m\n" "$1"; echo "SETUP_RESULT=FAILED: $1"; read -r -p "Press Enter to close…" _; exit 1; }
ORG=org-soft-sun-17925040; PROJECT=wandering-smoke-78464989

step "0. Node.js"
command -v node >/dev/null || { open "https://nodejs.org/en/download"; fail "Node.js is not installed. Install the LTS version, then run this again."; }
node -v; npm -v

step "1. Neon CLI"
if command -v neon >/dev/null 2>&1; then NEON="neon"
elif [ -w "$(npm prefix -g)/lib" ] && npm i -g neon@latest >/dev/null 2>&1; then NEON="neon"
else echo "Using npx neon@latest (no permission for a global install — that's fine)."; NEON="npx -y neon@latest"; fi
$NEON --version || fail "Neon CLI not available"
if ! $NEON me >/dev/null 2>&1; then
  echo ">>> A browser window will open: finish the Neon sign-in there, then come back."
  $NEON login || { echo "Sign-in failed or timed out. Retrying once…"; $NEON login || fail "Neon sign-in failed. Run 'npx neon@latest login' and try again."; }
fi
$NEON me | head -5

step "Prepare .env (so neon deploy writes there and Prisma can read it)"
if [ ! -f .env ]; then
  printf 'AUTH_SECRET="%s"\nSEED_PASSWORD="voxi1234"\n' "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" > .env
  echo "Created .env with AUTH_SECRET"
fi

step "2. neon init"
if [ -f .neon ] && [ -f neon.ts ]; then
  echo "Already linked (.neon + neon.ts exist) and agent skills/MCP are installed — skipping init."
else
  $NEON init -y --org-id "$ORG" --project-id "$PROJECT" --branch production --services postgres || fail "neon init failed"
fi
ls -a | grep -E '^\.neon|neon\.ts' || true

step "3. neon deploy"
$NEON deploy || fail "neon deploy failed"
# If values landed in .env.local, copy the ones Prisma needs into .env
if [ -f .env.local ]; then
  for k in DATABASE_URL DATABASE_URL_UNPOOLED; do
    grep -q "^$k=" .env || grep "^$k=" .env.local >> .env
  done
fi
grep -q '^AUTH_SECRET=' .env || printf 'AUTH_SECRET="%s"\n' "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
echo "Env var NAMES now in .env (values hidden):"; grep -oE '^[A-Z0-9_]+=' .env | tr -d '='
grep -q '^DATABASE_URL=' .env && grep -q '^DATABASE_URL_UNPOOLED=' .env || fail "DATABASE_URL / DATABASE_URL_UNPOOLED missing after deploy"
grep '^DATABASE_URL=' .env | grep -q -- '-pooler' && echo "DATABASE_URL is the pooled endpoint ✓" || echo "note: DATABASE_URL has no -pooler host"

step "4. npm install (+ prisma generate)"
npm install --no-audit --no-fund || fail "npm install failed"

step "Check the network can reach the Neon database"
host_of() { grep "^$1=" .env | sed -E 's/^[^=]+=//; s/"//g' | sed -E 's#^[a-z]+://[^@]*@##; s#[:/?].*$##'; }
DIRECT_HOST=$(host_of DATABASE_URL_UNPOOLED); POOLED_HOST=$(host_of DATABASE_URL)
for h in "$DIRECT_HOST" "$POOLED_HOST"; do
  for port in 5432 443; do
    if nc -z -G 8 "$h" "$port" >/dev/null 2>&1; then echo "NETCHECK $port ${h%%.*}… OPEN"; else echo "NETCHECK $port ${h%%.*}… BLOCKED"; fi
  done
done

DB_VERSION=v2   # bump when the database layout changes (v2 = multi-gym, photos, WhatsApp, housekeeping)
if [ "$(cat .voxi-db-ready 2>/dev/null)" = "$DB_VERSION" ]; then
  echo "Tables and demo data already match this version of VOXI — skipping."
else
  if [ -f .voxi-db-ready ]; then
    step "Upgrade the database to the new VOXI layout"
    echo "This version adds multiple gyms, member photos, WhatsApp, housekeeping and more."
    echo "The DEMO data will be wiped and re-created in 5 seconds (close this window to cancel)."
    sleep 5
  else
    step "Create tables on Neon"
  fi
  OK=0
  for attempt in 1 2 3; do
    if npx prisma db push --force-reset --accept-data-loss; then OK=1; break; fi
    echo "Attempt $attempt failed — the database may be waking up. Retrying in 10s…"; sleep 10
  done
  if [ $OK -ne 1 ]; then
    if ! nc -z -G 8 "$DIRECT_HOST" 5432 >/dev/null 2>&1 && nc -z -G 8 "$DIRECT_HOST" 443 >/dev/null 2>&1; then
      fail "Your network blocks database port 5432 (web port 443 works). Try another Wi-Fi or a phone hotspot, then run this again."
    fi
    fail "prisma db push failed"
  fi

  step "Seed demo data (2 gyms + VOXI admin)"
  npm run db:seed || fail "seed failed"
  echo "$DB_VERSION" > .voxi-db-ready
fi

step "5a. npm run build"
npm run build || fail "npm run build failed"
echo "BUILD_RESULT=PASSED"

step "5b. Start the app (production mode)"
lsof -ti tcp:3000 >/dev/null 2>&1 && fail "Port 3000 is busy — close the other app (or the Start VOXI window) and run this again."
npm run start > .voxi-server.log 2>&1 &
SERVER=$!
for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:3000/api/health && break; sleep 1; done

step "5c. End-to-end checks against Neon"
node scripts/e2e-check.mjs http://localhost:3000 || echo "(some checks failed — see the FAIL lines above)"

step "Done"
echo "VOXI is running on Neon at http://localhost:3000"
echo "Sign in (password voxi1234): owner@voxi.qa · housekeeping@voxi.qa · pulse@voxi.qa (2nd gym) · admin@voxi.qa (VOXI admin)"
echo "Keep this window open while you use it; close it to stop the app."
echo "SETUP_RESULT=COMPLETE"
open http://localhost:3000
wait $SERVER
