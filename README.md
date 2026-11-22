# VOXI — Gym ERP for Qatar

VOXI is a full-stack web app for running premium gyms: members, memberships, biometric access,
attendance, workouts, classes, leaderboard, payments in **QAR**, cash drawer sessions, expenses,
reports, leads and staff — plus a public landing page and pricing page.

One project contains both halves:

| Part | Lives in | Built with |
|------|----------|-----------|
| **Frontend** (what you see) | `src/app/**/page.tsx`, `src/components/` | Next.js 15 (React 19), Tailwind CSS 4 |
| **Backend** (the API) | `src/app/api/**/route.ts`, `src/server/` | Next.js route handlers, Prisma ORM, Zod validation |
| **Database** | `prisma/schema.prisma` | PostgreSQL |

It deploys to **Vercel** as a single app — no separate server to manage.

---

## 1. Run it on your computer

You need **Node.js 20+** and a **PostgreSQL** database.

```bash
# 1. install packages
npm install

# 2. create your settings file
cp .env.example .env          # Windows: copy .env.example .env

# 3. start a database (pick ONE)
docker compose up -d          # a) local Postgres with Docker (matches .env.example)
#  b) or create a free database on https://neon.tech and paste its URL into DATABASE_URL in .env

# 4. create the tables and fill them with demo data
npm run db:push
npm run db:seed

# 5. start the app
npm run dev
```

Open **http://localhost:3000** → landing page. Click **Sign in** and use a demo account
(password **`voxi1234`**):

| Email | Role | Sees |
|-------|------|------|
| `owner@voxi.qa` | Owner | Everything, incl. settings & salaries |
| `manager@voxi.qa` | Manager | Operations, reports, staff |
| `reception@voxi.qa` | Reception | Members, sales, payments, cash drawer, check-in |
| `trainer@voxi.qa` | Trainer | Members (view), check-in, workouts, classes |
| `pulse@voxi.qa` | Owner of **Pulse Ladies Studio** | A second gym — sees only its own data |
| `admin@voxi.qa` | VOXI admin | All gyms on `/admin` (create gyms, plans, trials, suspend) — no member details |

Useful commands:

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the app with hot reload |
| `npm run db:studio` | Open Prisma Studio — a spreadsheet-like view of your database |
| `npm run db:reset` | **Wipe** the database and re-seed demo data |
| `npm run typecheck` | Check the whole project for TypeScript errors |
| `npm run biometric:simulate -- 1001` | Pretend to be a turnstile scanning member 1001 |
| `npm run create-owner -- email pass "Name" "Gym name"` | Create a gym + its owner on a real database |
| `npm run create-owner -- --admin email pass "Name"` | Create a VOXI platform admin |
| `npm run test:e2e` | Run the end-to-end checks against the running app |

---

## 2. Folder structure

```
voxi/
├── prisma/
│   ├── schema.prisma        ← database tables (members, plans, payments …)
│   ├── seed.ts              ← writes demo data into the database
│   └── seed-data.ts         ← generates realistic Doha demo data
├── public/brand/            ← logo images
├── scripts/
│   └── biometric-simulator.ts
├── docs/                    ← ARCHITECTURE, API, BIOMETRIC, DEPLOYMENT guides
└── src/
    ├── app/                         ← every folder = a URL
    │   ├── page.tsx                 → /            (landing page)
    │   ├── pricing/page.tsx         → /pricing     (QAR pricing)
    │   ├── login/page.tsx           → /login
    │   ├── (app)/                   ← logged-in area (sidebar layout)
    │   │   ├── layout.tsx
    │   │   ├── dashboard/page.tsx   → /dashboard
    │   │   ├── members/page.tsx     → /members
    │   │   ├── members/[id]/page.tsx→ /members/abc123
    │   │   └── … memberships, plans, leads, attendance, biometric, workouts,
    │   │         classes, leaderboard, payments, cash-sessions, expenses,
    │   │         reports, staff, settings
    │   ├── (print)/invoice/[id]/    → /invoice/abc123 (printable receipt)
    │   └── api/                     ← THE BACKEND (one folder per resource)
    │       ├── members/route.ts     → GET/POST   /api/members
    │       ├── members/[id]/route.ts→ GET/PUT/DELETE /api/members/:id
    │       └── …
    ├── server/                      ← backend logic (never sent to the browser)
    │   ├── db.ts                    ← Prisma database client
    │   ├── auth.ts                  ← login sessions + permission checks
    │   ├── http.ts                  ← route() helper, error handling
    │   ├── validators.ts            ← input rules for every endpoint (zod)
    │   └── services/                ← business logic, one file per module
    ├── components/
    │   ├── ui/                      ← Button, Card, Modal, Badge, Toast …
    │   ├── charts/                  ← lightweight SVG charts
    │   ├── layout/                  ← sidebar, top bar, mobile nav, search
    │   ├── members/                 ← member/plan/payment forms used in many pages
    │   └── marketing/               ← landing & pricing pieces
    ├── hooks/                       ← useApi (data loading), useForm …
    ├── lib/                         ← shared helpers: dates (Qatar time), QAR formatting, permissions
    ├── types/api.ts                 ← shapes of API responses
    └── middleware.ts                ← redirects to /login if not signed in
```

### How a request flows

```
Page (src/app/(app)/members/page.tsx)
   └─ useApi("/api/members")                     ← src/hooks/use-api.ts
        └─ route handler (src/app/api/members/route.ts)
             ├─ requireSession("members")        ← src/server/auth.ts  (who are you? allowed?)
             └─ listMembers()                    ← src/server/services/members.service.ts
                  └─ db.member.findMany(…)       ← Prisma → PostgreSQL
```

**Rule of thumb:** pages never touch the database; route files stay tiny; real logic lives in
`src/server/services/`.

---

## 3. Common changes

- **Colours / fonts:** `src/app/globals.css` (tokens at the top) and `src/app/layout.tsx`.
- **Who can see what:** `src/lib/permissions.ts` — used by both the sidebar and the API.
- **Sidebar links:** `src/components/layout/nav.ts`.
- **Your VOXI subscription prices (QAR):** `src/components/marketing/pricing-data.ts`.
- **Leaderboard points:** `POINTS` in `src/server/services/leaderboard.service.ts`.
- **Add a database field:** edit `prisma/schema.prisma` → `npm run db:push` → use it in a service.
- **Add a new module:** model in schema → service in `src/server/services/` → route in
  `src/app/api/<name>/route.ts` → page in `src/app/(app)/<name>/page.tsx` → link in `nav.ts`
  → permission in `permissions.ts`.

---

## 4. Put it on GitHub

```bash
git init
git add .
git commit -m "VOXI MVP"
git branch -M main
git remote add origin https://github.com/<you>/voxi.git
git push -u origin main
```

`.env` is in `.gitignore`, so your database password and secret never go to GitHub.

## 5. Deploy on Vercel

Short version (full guide in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)):

1. Create a Postgres database (Neon, Supabase or Vercel Postgres) and copy its connection URL.
2. On vercel.com → **Add New Project** → import your GitHub repo.
3. Add environment variables `DATABASE_URL` and `AUTH_SECRET`, then **Deploy**.
4. From your computer, point `.env` at the cloud database once and run `npm run db:push` and
   `npm run db:seed` for demo data — or `npm run create-owner` for a real gym (see the guide).

---

## 6. What's included in this MVP

- **Many gyms in one VOXI** (multi-tenant): every record belongs to a gym and every query is filtered by
  the signed-in person's gym. VOXI admins create gyms, set plans/trials and suspend gyms on `/admin`
- Gym profiles: logo, brand colour, opening hours, Instagram — used on invoices, the sidebar and member cards
- Role-based login (Owner, Manager, Reception, Trainer, VOXI admin) with secure httpOnly cookies, plus a
  **Housekeeping** staff role (on the team list with branch, phone and salary — no login needed)
- **Member photos**: upload or take with the webcam/phone camera; shown at check-in, in lists and on cards
- **Digital member card + QR**: a public link (`/c/<token>`) members save on their phone; reception scans
  the QR with the camera (Attendance → Scan QR) or a USB scanner. Cards can be re-issued
- **WhatsApp** (phase 2): renewal / expired / welcome / card / birthday / milestone / custom messages.
  Works immediately via WhatsApp links; with Meta WhatsApp Business (Cloud) API keys it sends
  automatically, supports “Remind all”, approved templates, and delivery/read receipts via webhook.
  Tokens are stored encrypted. Full message log on `/messages` ([`docs/WHATSAPP.md`](docs/WHATSAPP.md))
- **Dashboard**: renewal reminders (ending soon / recently expired, last reminded) and celebrations
  (birthdays this week, 10th/25th/50th… visit milestones)
- **Activity log**: who sold, refunded, deleted, overrode or changed settings, and when
- **Accounts**: self-service sign-up (7-day free trial with starter data), “Continue with Google”
  (when Google keys are set), forgot-password emails (when Resend is set), lockout after 5 wrong
  passwords, “sign out on all other devices”, instant sign-out when staff are deactivated
- **Onboarding**: “Get started” checklist for new gyms, trial banner, **member import from Excel/CSV**
  (column matching, duplicate check, current plans carried over)
- Privacy policy & terms pages (templates for Qatar — have a lawyer review), SEO, installable app
  (Add to Home Screen), security headers; the public site works even before a database is connected
- Members with QID, nationality, emergency contacts, notes, branch, biometric ID
- Plans (QAR prices, duration, PT session packs, freeze allowance)
- Selling & renewing memberships (auto-chained renewals), discounts, partial payments & balances,
  freeze/unfreeze (extends end date), cancel
- Payments: Cash, Card, **Fawran**, bank transfer, online · sequential invoice numbers · printable
  receipts · refunds
- Cash sessions: open with float, cash payments auto-linked, close with count, shortages flagged
- Expenses by category and branch
- Attendance: front-desk check-in/out with membership validation and staff override, live "inside now"
- **Biometric**: device registry with hashed API keys, live scan feed, enrollment, generic webhook +
  ZKTeco ADMS push protocol support ([`docs/BIOMETRIC.md`](docs/BIOMETRIC.md))
- Workouts: exercise library, programme builder, assign to members, workout logs
- Classes: weekly timetable, capacity, bookings, attendance marking
- Leaderboard with points (week / month / all-time)
- Leads pipeline with WhatsApp links and convert-to-member
- Reports: revenue vs expenses, payment methods, plan sales, busy-hours heatmap, CSV/Excel exports
- Multi-branch, staff management with salaries (owner-only), gym settings
- Light & dark themes, fully responsive with a mobile tab bar, Ctrl+K member search

### Suggested next steps

Arabic (RTL) interface · scheduled (automatic daily) WhatsApp reminders · member portal for bookings ·
online payments (a Qatar payment gateway) · VOXI subscription billing · photo storage in object storage
(S3/R2) for very large gyms.
