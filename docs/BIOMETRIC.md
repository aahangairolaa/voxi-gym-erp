# Connecting biometric devices

VOXI turns every fingerprint / face / card scan into a check-in or check-out, and tells the
device whether the member is allowed in (active plan) or not (expired, frozen, unknown).

```
 Member scans finger ─► Device / bridge ─► POST /api/biometric/scan ─► VOXI checks membership
                                                                         ├─ logs the scan (live feed)
                                                                         ├─ records attendance
                    ◄── { allowed: true/false } ◄─────────────────────────┘
 Turnstile opens if allowed
```

## Step 1 — Register the device

Biometric page → **Add device**. Enter name, type, brand and the device **serial number**.
VOXI shows an **API key once** (`vxk_…`). Copy it. Only a SHA-256 hash is stored, so if you
lose it use the 🔄 button to issue a new one.

## Step 2 — Enroll members

On the device, enroll each member's finger/face using a **User ID**. We recommend the number
part of their VOXI code (member `M-1042` → User ID `1042`). Then link the same ID in VOXI:
the member's profile → *Biometric access*, or Biometric page → *Enrolled members*.

## Step 3 — Send scans to VOXI (choose one)

### Option A — Generic webhook (any brand)

Most devices (Suprema, Hikvision, Anviz, ZKTeco with SDK…) either support HTTP callbacks or
come with an SDK you can run in a small "bridge" program on the reception PC. For each scan,
call:

```http
POST https://<your-voxi-domain>/api/biometric/scan
x-device-key: vxk_your_device_key
Content-Type: application/json

{ "biometricUserId": "1042", "scannedAt": "2026-11-12T18:30:00+03:00", "direction": "auto" }
```

Response:

```json
{ "allowed": true, "action": "IN", "reason": null,
  "member": { "code": "M-1042", "name": "Karim Fawzi", "status": "ACTIVE" } }
```

- `direction`: `"auto"` (first scan of the day = IN, next = OUT), `"in"` or `"out"`
  (for separate entry/exit readers).
- When `allowed` is `true`, trigger the turnstile relay.
- Unknown IDs and denied members are logged and shown in the live feed.

Test without hardware:

```bash
npm run biometric:simulate -- 1042
VOXI_URL=https://your-app.vercel.app DEVICE_KEY=vxk_... npm run biometric:simulate -- 1042
```

### Option B — ZKTeco "ADMS / Cloud server" (no extra software)

Many ZKTeco terminals (SpeedFace, ProFace, F22, MB series…) can push logs directly:

1. Register the device in VOXI with its exact serial number (Menu → System Info).
2. On the terminal: **COMM → Cloud Server Setting**
   - Server address: your VOXI domain (e.g. `voxi-gym.vercel.app`)
   - Port: `443`, **HTTPS on**, Proxy off
3. The device calls `/iclock/cdata` (handled by `src/app/api/biometric/iclock/`), sends its
   attendance log lines, and VOXI processes them like webhook scans.

Note: in ADMS mode the *device* decides whether to open the door based on its own user list —
VOXI records attendance and flags expired members, but can't block the door. For real-time
blocking, use Option A with a bridge, or disable expired users on the device.

## Where the code is

| What | File |
|------|------|
| Scan logic, device auth, ADMS parsing | `src/server/services/biometric.service.ts` |
| Membership validation (shared with front desk) | `recordAccess()` in `src/server/services/attendance.service.ts` |
| Webhook endpoint | `src/app/api/biometric/scan/route.ts` |
| ZKTeco endpoints | `src/app/api/biometric/iclock/*` (+ rewrite in `next.config.ts`) |
| Admin UI | `src/app/(app)/biometric/page.tsx` |
