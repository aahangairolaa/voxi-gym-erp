# Deploying VOXI to Vercel

VOXI is one Next.js app (frontend + API). Vercel hosts it; your data lives in a PostgreSQL
database in the cloud.

## 1. Create the database (5 minutes)

Any PostgreSQL works. Easiest options:

- **Neon** (neon.tech) — free tier. Create a project, choose a region close to Qatar
  (e.g. *Europe – Frankfurt* or *Asia – Singapore*), copy the **connection string**.
- **Supabase** (supabase.com) — Project Settings → Database → Connection string (URI).
- **Vercel Postgres / Neon via Vercel Marketplace** — Storage tab in your Vercel project.

The URL looks like `postgresql://user:password@host/dbname?sslmode=require`.

> Tip: if your provider gives a "pooled" URL (contains `-pooler` or port 6543), use it for
> `DATABASE_URL` on Vercel — serverless functions open many short connections.

## 2. Create the tables

On your computer, put the cloud URL in `.env` as `DATABASE_URL`, then:

```bash
npm run db:push        # creates all tables
npm run db:seed        # optional: demo data + demo logins (password voxi1234)
```

For a **real gym**, skip the demo seed and create your owner account instead:

```bash
npm run create-owner -- owner@yourgym.qa "StrongPassword123" "Your Name" "The Pearl"
```

Then sign in, set up the gym profile (Settings), plans, staff and members.

## 3. Deploy

1. Push the project to GitHub (see README).
2. vercel.com → **Add New… → Project** → import the repository.
3. Framework preset: **Next.js** (auto-detected). Leave build settings as they are —
   `npm run build` already runs `prisma generate`.
4. **Environment Variables**:
   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | your Postgres URL |
   | `AUTH_SECRET` | a long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
5. **Deploy**. Your app is live at `https://<project>.vercel.app`.
6. Connect your own domain (next section).

Check health anytime at `/api/health`.

## 4. Use your own domain (e.g. app.voxi.qa)

1. Vercel → your project → **Settings → Domains** → type the domain → **Add**.
2. Vercel shows the DNS record to create. At your domain registrar (e.g. Ooredoo/Qatar
   Domains Registry reseller, GoDaddy, Namecheap, Cloudflare):
   - **Subdomain** like `app.voxi.qa` → a `CNAME` record pointing to `cname.vercel-dns.com`
   - **Root domain** like `voxi.qa` → an `A` record pointing to `76.76.21.21`
   (Always copy the exact values Vercel shows — they are the source of truth.)
3. Wait for DNS to update (minutes, sometimes up to a few hours). Vercel issues the HTTPS
   certificate automatically.
4. Biometric devices and the ZKTeco "Cloud Server" setting should then use this domain.

No code changes are needed — the app uses relative URLs everywhere.

## 5. Updating

Every `git push` to `main` redeploys automatically. If you changed `prisma/schema.prisma`,
run `npm run db:push` against the production database **before** pushing.

(When the app has real data, switch to migrations: `npx prisma migrate dev` locally and
`npx prisma migrate deploy` in production — safer than `db push` for live databases.)

## 6. Biometric devices in production

Devices must reach your public URL over HTTPS. See [BIOMETRIC.md](BIOMETRIC.md).
