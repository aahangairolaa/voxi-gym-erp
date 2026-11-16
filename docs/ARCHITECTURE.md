# Architecture

## Layers

1. **Pages** (`src/app/**/page.tsx`) — React client components. They load data with
   `useApi(url)` and send changes with `api.post/put/del` (`src/lib/api-client.ts`).
2. **API routes** (`src/app/api/**/route.ts`) — thin: check the session/role, validate input,
   call a service, return JSON. Wrapped in `route()` from `src/server/http.ts`, which converts
   thrown errors into clean JSON responses.
3. **Services** (`src/server/services/*.service.ts`) — all business rules (renewal chaining,
   freeze math, cash drawer totals, access decisions, reports). Easy to test and reuse.
4. **Database** — Prisma models in `prisma/schema.prisma` → PostgreSQL.

## Key decisions

- **Money as whole QAR integers.** Gym prices are whole riyals; integers avoid rounding bugs.
  If you ever need dirhams, change the columns to `Decimal`.
- **Qatar time everywhere.** Servers run in UTC; `src/lib/dates.ts` makes "today" and "this month"
  mean Doha time (UTC+3, no daylight saving).
- **Status is computed, not stored.** A membership saved as ACTIVE whose end date passed is shown
  as EXPIRED (`effectiveStatus()` in `services/_shared.ts`), so nothing needs a nightly job.
- **One access function.** `recordAccess()` is used by both the front desk and biometric devices,
  so rules can't drift apart.
- **Permissions in one table.** `src/lib/permissions.ts` drives both the sidebar and API checks.
- **Sessions:** signed JWT (jose, HS256) in an httpOnly, SameSite=Lax cookie, 12-hour expiry.
  `src/middleware.ts` redirects signed-out visitors away from app pages.
- **Human-friendly numbers** (M-1001, INV-000123) come from the atomic `Counter` table.
- **No chart library.** Small SVG charts in `src/components/charts/` keep the bundle light.

## Scaling notes

- Lists load up to 500–1000 rows and filter/paginate in the browser. For gyms beyond a few
  thousand members, move filtering + pagination into the services (add `skip`/`take`).
- Single-tenant: one deployment + database per gym. For SaaS with many gyms in one database,
  add a `gymId` to every model and scope every query by the signed-in user's gym.
