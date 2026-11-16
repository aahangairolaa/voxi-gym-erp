# VOXI API reference

All endpoints live under `/api`, return JSON and require a signed-in staff session (cookie set by
`/api/auth/login`) unless marked **public** or **device**. Errors look like `{ "error": "message" }`
with a matching HTTP status (400 validation, 401 not signed in, 403 not allowed, 404, 409 conflict).
Money is whole **QAR**. Dates are ISO strings (UTC); date filters accept `YYYY-MM-DD` (Qatar day).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` **public** | `{ email, password }` → sets session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current staff member |
| POST | `/api/auth/password` | `{ currentPassword, newPassword }` |
| GET | `/api/dashboard` | KPIs, charts, expiring list, today's classes |
| GET | `/api/search?q=` | Quick member search |
| GET / POST | `/api/members` | List (`search`, `status`, `branchId`) / create (+ optional plan sale) |
| GET / PUT / DELETE | `/api/members/:id` | Profile with history / update / delete |
| GET / POST | `/api/plans` | List (`active=1`) / create |
| PUT / DELETE | `/api/plans/:id` | Update / delete (archives if ever sold) |
| GET / POST | `/api/memberships` | List (`status`, `search`) / sell or renew `{ memberId, planId, discount, amountPaid, paymentMethod }` |
| POST | `/api/memberships/:id` | `{ action: "freeze" | "unfreeze" | "cancel" }` |
| GET / POST | `/api/payments` | List (`from`, `to`, `method`, `search`, `memberId`) / record |
| GET | `/api/payments/:id` | Invoice data |
| POST | `/api/payments/:id/refund` | Mark refunded (owner/manager) |
| GET / POST | `/api/cash-sessions` | List / open `{ branchId, openingFloat }` |
| GET | `/api/cash-sessions/:id` | Session with its payments |
| POST | `/api/cash-sessions/:id/close` | `{ countedCash, notes }` |
| GET / POST | `/api/expenses` | List (`from`, `to`) / create |
| DELETE | `/api/expenses/:id` | Delete |
| GET / POST | `/api/attendance` | Day list (`date`, `branchId`) / check in-out `{ memberId | code, override }` |
| POST | `/api/attendance/:id/checkout` | Manual check-out |
| GET / POST | `/api/biometric/devices` | List / register (returns API key once) |
| PUT / DELETE | `/api/biometric/devices/:id` | Update / remove |
| POST | `/api/biometric/devices/:id/rotate-key` | New API key |
| GET / POST | `/api/biometric/enrollments` | Enrolled members / link `{ memberId, biometricId }` |
| GET | `/api/biometric/events?limit=` | Latest scans |
| POST | `/api/biometric/scan` **device** | Header `x-device-key`; `{ biometricUserId }` |
| GET/POST | `/iclock/cdata`, `/iclock/getrequest` **device** | ZKTeco ADMS protocol |
| GET / POST | `/api/workouts` | Programmes (`memberId`) / create |
| GET / PUT / DELETE | `/api/workouts/:id` | Programme |
| POST | `/api/workouts/:id/assign` | Copy template to `{ memberId }` |
| GET / POST | `/api/workouts/exercises` | Exercise library |
| GET / POST | `/api/workouts/logs` | Workout log |
| GET / POST | `/api/classes` | Week of classes (`from`, `days`) / create |
| PUT / DELETE | `/api/classes/:id` | Update / delete |
| POST / PATCH | `/api/classes/:id/bookings` | Book `{ memberId }` / set `{ bookingId, status }` |
| GET | `/api/leaderboard?period=week|month|all` | Ranked members |
| GET | `/api/reports?from=&to=` | Financial & attendance report |
| GET | `/api/reports/export?type=members|payments|attendance|expenses` | CSV download |
| GET / POST | `/api/leads` | Pipeline / create |
| PUT / PATCH / DELETE | `/api/leads/:id` | Update / partial update / delete |
| POST | `/api/leads/:id/convert` | Create member from lead |
| GET / POST | `/api/staff` | List / create |
| PUT | `/api/staff/:id` | Update (empty password = unchanged) |
| GET | `/api/staff/trainers` | Trainer dropdown |
| GET / PUT | `/api/settings` | Gym profile |
| GET / POST | `/api/branches` · PUT `/api/branches/:id` | Branches |
| GET | `/api/health` **public** | App + database status |

Permissions per module are defined in `src/lib/permissions.ts`.
