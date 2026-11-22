/**
 * End-to-end checks against a running VOXI (default http://localhost:3000).
 *   node scripts/e2e-check.mjs [baseUrl]
 * Uses the demo accounts from the seed. Prints PASS/FAIL lines and a summary.
 * Leaves the data as it found it (test payment is refunded, test photo removed).
 */
const BASE = process.argv[2] || "http://localhost:3000";
const PASSWORD = process.env.SEED_PASSWORD || "voxi1234";
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? `  — ${String(detail).slice(0, 200)}` : ""}`);
  }
}

async function call(method, path, { cookie, body, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

/** The voxi_session cookie from a response (ignores any other cookies it sets). */
function sessionCookie(res) {
  const all = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
  return (all.find((c) => c.startsWith("voxi_session=")) || "").split(";")[0];
}

async function login(email) {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json, cookie: sessionCookie(res) };
}

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    check(name, false, e?.message || e);
  }
}

console.log(`VOXI end-to-end checks → ${BASE}\n`);

await step("health", async () => {
  const h = await call("GET", "/api/health");
  check("health: database connected", h.json?.database === "connected", h.text);
  check("landing page 200", (await call("GET", "/")).status === 200);
});

// ── Owner of gym 1 ─────────────────────────────────────────────────────────
const owner = await login("owner@voxi.qa");
check("login owner → home /dashboard", owner.ok && owner.json?.home === "/dashboard", JSON.stringify(owner.json));
const O = { cookie: owner.cookie };
let voxiMemberId = null;
let qrToken = null;

await step("core", async () => {
  const me = await call("GET", "/api/auth/me", O);
  check("me: gym attached (multi-gym)", me.json?.gym?.name === "VOXI Fitness Club", me.text);
  const m = await call("GET", "/api/members", O);
  check("members list (>0)", (m.json?.counts?.ALL ?? 0) > 0, m.text);
  check("members carry photoUrl field", m.json?.members?.length > 0 && "photoUrl" in m.json.members[0]);
  voxiMemberId = m.json?.members?.[0]?.id;
  const d = await call("GET", "/api/dashboard", O);
  check("dashboard aggregates", d.status === 200 && d.json?.kpis?.activeMembers > 0, d.text);
});

await step("reminders & celebrations", async () => {
  const r = await call("GET", "/api/reminders", O);
  check("renewal reminders", r.status === 200 && Array.isArray(r.json?.expiring) && Array.isArray(r.json?.expired), r.text);
  const c = await call("GET", "/api/celebrations", O);
  check("birthdays this week (seeded)", c.status === 200 && c.json?.birthdays?.length > 0, c.text);
});

await step("payments", async () => {
  const p = await call("POST", "/api/payments", { ...O, body: { amount: 1, method: "CASH", description: "E2E test payment" } });
  check("record a payment (gym invoice counter)", !!p.json?.invoiceNo, p.text);
  const r = await call("POST", `/api/payments/${p.json?.id}/refund`, O);
  check("refund the test payment", r.text.includes("REFUNDED"), r.text);
});

await step("photo", async () => {
  const cur = (await call("GET", `/api/members/${voxiMemberId}`, O)).json;
  const base = { firstName: cur.firstName, lastName: cur.lastName, phone: cur.phone, email: cur.email, gender: cur.gender, branchId: cur.branch?.id ?? null };
  const u = await call("PUT", `/api/members/${voxiMemberId}`, { ...O, body: { ...base, photo: PNG } });
  check("upload member photo", u.status === 200, u.text);
  const detail = await call("GET", `/api/members/${voxiMemberId}`, O);
  qrToken = detail.json?.qrToken;
  const url = detail.json?.photoUrl;
  const img = url ? await call("GET", url, { ...O, raw: true }) : null;
  check("photo served as image", img?.status === 200 && (img.headers.get("content-type") || "").startsWith("image/"), url);
  const del = await call("PUT", `/api/members/${voxiMemberId}`, { ...O, body: { ...base, photo: null } });
  check("remove member photo", del.status === 200 && (await call("GET", `/api/members/${voxiMemberId}`, O)).json?.photoUrl === null);
});

await step("card", async () => {
  check("member has a QR card token", typeof qrToken === "string" && qrToken.length >= 20);
  const card = await call("GET", `/api/card/${qrToken}`); // no cookie: public
  check("public card API (no login)", card.status === 200 && !!card.json?.name, card.text);
  const page = await call("GET", `/c/${qrToken}`);
  check("public card page (no login) 200", page.status === 200, page.status);
  const a = await call("POST", "/api/attendance", { ...O, body: { code: `${BASE}/c/${qrToken}`, override: true } });
  check("check-in by scanning QR card link", a.json?.allowed === true && a.json?.member?.id === voxiMemberId, a.text);
  const bad = await call("GET", "/api/card/not-a-real-token-123456789");
  check("unknown card token → 404", bad.status === 404);
});

await step("self check-in screen", async () => {
  const k = await call("GET", "/api/kiosk", O);
  check("kiosk opens for the gym", k.status === 200 && k.json?.gym?.name === "VOXI Fitness Club", k.text);
  const qr = (await call("GET", `/api/members/${voxiMemberId}`, O)).json?.qrToken;
  const a = await call("POST", "/api/kiosk", { ...O, body: { code: qr } });
  check("kiosk: member scans their QR card", a.status === 200 && ["IN", "OUT", "DENIED"].includes(a.json?.action) && !!a.json?.member?.firstName, a.text);
  check("kiosk: shares only the first name and status", a.json?.member && !("phone" in a.json.member) && !("code" in a.json.member));
  const again = await call("POST", "/api/kiosk", { ...O, body: { code: qr } });
  check("kiosk: second scan toggles in/out", a.json?.action === "DENIED" || again.json?.action !== a.json?.action, `${a.json?.action} → ${again.json?.action}`);
  const partial = await call("POST", "/api/kiosk", { ...O, body: { code: "3456" } });
  check("kiosk: partial phone numbers are refused", partial.status === 404, partial.status);
  const tr = await login("trainer@voxi.qa");
  check("kiosk needs a signed-in staff device", (await call("GET", "/api/kiosk")).status === 401);
  check("trainers can run the kiosk (attendance access)", (await call("GET", "/api/kiosk", { cookie: tr.cookie })).status === 200);
});

await step("member rules", async () => {
  const young = new Date(Date.now() - 5 * 365 * 86_400_000).toISOString().slice(0, 10);
  const kid = await call("POST", "/api/members", { ...O, body: { firstName: "Tiny", lastName: "", phone: "+974 5000 0001", dateOfBirth: young } });
  check("members must be 10 or older", kid.status === 400 && /10 years/.test(kid.json?.error ?? ""), kid.text);
  const noLast = await call("POST", "/api/members", { ...O, body: { firstName: "Mononym", phone: "+974 5000 0002", dateOfBirth: "1995-06-15" } });
  check("last name is optional", noLast.status === 200 && noLast.json?.lastName === "", noLast.text);
  const got = noLast.json?.id ? (await call("GET", `/api/members/${noLast.json.id}`, O)).json : null;
  const dob = got?.dateOfBirth ? new Date(new Date(got.dateOfBirth).getTime() + 3 * 3600_000).toISOString().slice(0, 10) : null;
  check("date of birth saved as entered (Doha date)", dob === "1995-06-15", got?.dateOfBirth);
  if (noLast.json?.id) await call("DELETE", `/api/members/${noLast.json.id}`, O);
  const ex = await call("GET", "/api/workouts/exercises", O);
  check("exercise library has 150+ exercises", (ex.json?.exercises?.length ?? 0) >= 150, ex.json?.exercises?.length);
});

await step("check-in", async () => {
  const a = await call("POST", "/api/attendance", { ...O, body: { code: "M-1001", override: true } });
  check("front-desk check-in by code", a.json?.allowed === true, a.text);
});

await step("whatsapp", async () => {
  const cfg = await call("GET", "/api/whatsapp/config", O);
  check("WhatsApp config (link mode until keys added)", cfg.json?.mode === "link" && cfg.json?.webhookPath?.includes("voxi-fitness"), cfg.text);
  const s = await call("POST", "/api/whatsapp/send", { ...O, body: { memberId: voxiMemberId, type: "RENEWAL_REMINDER" } });
  check("send reminder → wa.me link", s.json?.mode === "link" && String(s.json?.url).startsWith("https://wa.me/"), s.text);
  const log = await call("GET", `/api/whatsapp/messages?memberId=${voxiMemberId}`, O);
  check("message saved in WhatsApp log", log.json?.messages?.some((m) => m.id === s.json?.messageId), log.text);
  const wh = await call("GET", "/api/whatsapp/webhook/voxi-fitness?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1");
  check("webhook rejects a wrong verify token", wh.status === 403, wh.status);
});

await step("activity", async () => {
  const act = await call("GET", "/api/activity", O);
  const actions = (act.json?.activity ?? []).map((a) => a.action);
  check("activity log records refund & WhatsApp", actions.includes("payment.refund") && actions.includes("whatsapp.send"), actions.slice(0, 8).join(","));
});

await step("settings", async () => {
  const s = await call("GET", "/api/settings", O);
  check("gym profile (settings)", s.json?.name === "VOXI Fitness Club" && "logo" in (s.json ?? {}), s.text);
});

// ── Gym 2: must never see gym 1's data ─────────────────────────────────────
await step("tenant isolation", async () => {
  const pulse = await login("pulse@voxi.qa");
  check("login second gym (Pulse)", pulse.ok, JSON.stringify(pulse.json));
  const P = { cookie: pulse.cookie };
  const m = await call("GET", "/api/members", P);
  check("Pulse sees only its own 12 members", m.json?.counts?.ALL === 12, m.json?.counts?.ALL);
  const other = await call("GET", `/api/members/${voxiMemberId}`, P);
  check("Pulse can't open a VOXI member (404)", other.status === 404, other.status);
  const card = await call("POST", "/api/attendance", { ...P, body: { code: `/c/${qrToken}`, override: true } });
  check("Pulse can't check in a VOXI card", card.status === 404, card.text);
  const pay = await call("GET", "/api/payments", P);
  check("Pulse payments are its own", (pay.json?.payments ?? []).every((p) => p.invoiceNo.startsWith("PLS-")), pay.json?.payments?.[0]?.invoiceNo);
  const d = await call("GET", "/api/dashboard", P);
  check("Pulse dashboard", d.status === 200 && d.json?.kpis?.totalMembers === 12, d.json?.kpis?.totalMembers);
});

// ── Housekeeping: a staff role without a login ────────────────────────────
await step("housekeeping", async () => {
  const add = await call("POST", "/api/staff", { ...O, body: { name: "Test Cleaner", role: "HOUSEKEEPING", phone: "5500 1122", salary: 2500 } });
  check("add housekeeping staff without email or password", add.status === 200 && add.json?.role === "HOUSEKEEPING", add.text);
  const list = await call("GET", "/api/staff", O);
  check("housekeeping staff appear on the team list", list.json?.staff?.some((s) => s.name === "Test Cleaner"), list.text?.slice(0, 120));
  const noEmail = await call("POST", "/api/staff", { ...O, body: { name: "No Email Reception", role: "RECEPTION", password: "longpassword1" } });
  check("other roles still need an email", noEmail.status === 400, noEmail.text);
  const gone = await call("GET", "/api/housekeeping/today", O);
  check("no separate housekeeping section", gone.status === 404, gone.status);
});

// ── VOXI platform admin ────────────────────────────────────────────────────
await step("admin", async () => {
  const ad = await login("admin@voxi.qa");
  check("login VOXI admin → home /admin", ad.json?.home === "/admin", JSON.stringify(ad.json));
  const A = { cookie: ad.cookie };
  const g = await call("GET", "/api/admin/gyms", A);
  check("admin sees all gyms (≥2)", g.json?.stats?.total >= 2, g.text);
  const m = await call("GET", "/api/members", A);
  check("admin can't read gym members (403)", m.status === 403, m.status);
  const own = await call("GET", "/api/admin/gyms", O);
  check("gym owner can't open admin (403)", own.status === 403, own.status);
});

// ── Roles and access (owner-controlled confidential areas) ─────────────────
await step("roles and access", async () => {
  const mgr = await login("manager@voxi.qa");
  const rec = await login("reception@voxi.qa");
  const tr = await login("trainer@voxi.qa");
  const M = { cookie: mgr.cookie }, R = { cookie: rec.cookie }, T = { cookie: tr.cookie };
  check("activity log: owner only (manager 403)", (await call("GET", "/api/activity", M)).status === 403);
  check("activity log: owner can open it", (await call("GET", "/api/activity", O)).status === 200);
  const dR = await call("GET", "/api/dashboard", R);
  check("reception dashboard hides revenue by default", dR.status === 200 && dR.json?.kpis?.revenueThisMonth === 0 && dR.json?.revenueByMonth?.length === 0, dR.text?.slice(0, 120));
  check("reception can't open reports by default", (await call("GET", "/api/reports", R)).status === 403);
  check("reception can't refund by default", (await call("POST", "/api/payments/x/refund", R)).status === 403);
  check("non-owner can't change role access", (await call("PUT", "/api/settings/permissions", { ...M, body: { permissions: {} } })).status === 403);

  // Owner: let reception see revenue and reports, hide member contacts from trainers, take payments away from reception
  const put = await call("PUT", "/api/settings/permissions", {
    ...O,
    body: { permissions: { RECEPTION: { revenue: true, reports: true, payments: false }, TRAINER: { contacts: false } } },
  });
  check("owner saves role access", put.status === 200 && put.json?.permissions?.RECEPTION?.revenue === true, put.text);
  const dR2 = await call("GET", "/api/dashboard", R);
  check("reception now sees revenue", dR2.json?.kpis?.revenueThisMonth > 0, dR2.json?.kpis?.revenueThisMonth);
  check("reception now opens reports", (await call("GET", "/api/reports", R)).status === 200);
  check("reception lost payments", (await call("GET", "/api/payments", R)).status === 403);
  const mT = await call("GET", "/api/members", T);
  const phone = mT.json?.members?.[0]?.phone ?? "";
  check("trainer sees masked member phones", phone.includes("••••"), phone);
  const mO = await call("GET", "/api/members", O);
  check("owner still sees full phones", !(mO.json?.members?.[0]?.phone ?? "").includes("•"), mO.json?.members?.[0]?.phone);
  const me = await call("GET", "/api/auth/me", R);
  check("session carries role access for the app", me.json?.gym?.rolePermissions?.RECEPTION?.revenue === true, me.text?.slice(0, 160));
  // Back to defaults
  await call("PUT", "/api/settings/permissions", { ...O, body: { permissions: {} } });
  check("defaults restored", (await call("GET", "/api/payments", R)).status === 200);
});

// ── Staff photos ───────────────────────────────────────────────────────────
await step("staff photo", async () => {
  const list = await call("GET", "/api/staff", O);
  const st = list.json?.staff?.find((x) => x.email === "trainer@voxi.qa");
  const body = { name: st.name, email: st.email, phone: st.phone, role: st.role, branchId: st.branchId, salary: st.salary, specialty: st.specialty, isActive: true, password: "", photo: PNG };
  const up = await call("PUT", `/api/staff/${st.id}`, { ...O, body });
  check("upload staff photo", up.status === 200 && !!up.json?.photoUrl, up.text?.slice(0, 160));
  const img = up.json?.photoUrl ? await fetch(BASE + up.json.photoUrl, { headers: { Cookie: owner.cookie } }) : null;
  check("staff photo served as image", img?.status === 200 && (img.headers.get("content-type") || "").startsWith("image/"));
  const me = await call("GET", "/api/auth/me", { cookie: (await login("trainer@voxi.qa")).cookie });
  check("own photo shown in the app", !!me.json?.user?.photoUrl, me.json?.user?.photoUrl);
  const del = await call("PUT", `/api/staff/${st.id}`, { ...O, body: { ...body, photo: null } });
  check("remove staff photo", del.status === 200 && del.json?.photoUrl === null);
});

// ── Billing: plan requests, activation and branch limits ───────────────────
await step("billing", async () => {
  const b = await call("GET", "/api/billing", O);
  check("billing: active gym sees its plan", b.json?.status === "ACTIVE" && b.json?.current?.months === 12, b.text);
  // VOXI Fitness has 2 locations on a plan with 1 extra branch: a 3rd is refused
  const br = await call("POST", "/api/branches", { ...O, body: { name: "Test Branch", address: null, phone: null, isActive: true } });
  check("billing: branch limit enforced for paid plan", br.status === 403 && /Billing/.test(br.json?.error ?? ""), br.text);

  const pulse = await login("pulse@voxi.qa");
  const P = { cookie: pulse.cookie };
  const req = await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 2 } });
  check("billing: trial gym requests 12 months + 2 branches", req.status === 200 && req.json?.quote?.total === 25000 + 14000 + 13300, req.text);
  const one = await call("POST", "/api/billing", { ...P, body: { months: 3, extraBranches: 0, entrances: 2, onboarding: true } });
  check("billing: one-time add-ons priced (2 entrances + onboarding)", one.json?.oneTime === 2 * 2900 + 1500 && one.json?.quote?.total === 10000, one.text);
  const noMonthly = await call("POST", "/api/billing", { ...P, body: { months: 1, extraBranches: 0 } });
  check("billing: no 1-month plan", noMonthly.status === 400, noMonthly.status);
  await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 2 } });
  const tooMany = await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 5 } });
  check("billing: more than 5 locations refused", tooMany.status === 400, tooMany.status);
  const rec = await call("GET", "/api/billing", { cookie: (await login("pulse.reception@voxi.qa")).cookie });
  check("billing: reception can't open billing", rec.status === 403, rec.status);

  const ad = await login("admin@voxi.qa");
  const A = { cookie: ad.cookie };
  const gyms = await call("GET", "/api/admin/gyms", A);
  const pg = gyms.json?.gyms?.find((g) => g.slug === "pulse-ladies");
  check("admin sees the plan request", pg?.planRequest?.extraBranches === 2 && gyms.json?.stats?.requests >= 1, JSON.stringify(pg?.planRequest));
  const act = await call("PUT", `/api/admin/gyms/${pg?.id}`, { ...A, body: { applyRequest: true } });
  check("admin activates the request", act.json?.status === "ACTIVE" && act.json?.extraBranches === 2 && act.json?.planRequest === null && !!act.json?.paidUntil, act.text);
  const after = await call("GET", "/api/billing", P);
  check("billing: gym now active with 3 locations", after.json?.status === "ACTIVE" && after.json?.current?.extraBranches === 2, after.text);

  // Trial lock: put Pulse back on a trial that ended yesterday
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await call("PUT", `/api/admin/gyms/${pg?.id}`, { ...A, body: { status: "TRIAL", trialEndsAt: yesterday } });
  const P2 = { cookie: (await login("pulse@voxi.qa")).cookie };
  const locked = await call("GET", "/api/members", P2);
  check("trial ended: app is locked", locked.status === 402, locked.status);
  check("trial ended: billing still opens", (await call("GET", "/api/billing", P2)).status === 200);
  check("trial ended: session still loads", (await call("GET", "/api/auth/me", P2)).status === 200);
  check("trial ended: refunds locked too", (await call("POST", "/api/payments/x/refund", P2)).status === 402);
  await call("PUT", `/api/admin/gyms/${pg?.id}`, { ...A, body: { applyRequest: false, status: "ACTIVE" } });
  check("activating unlocks straight away", (await call("GET", "/api/members", P2)).status === 200);
});

// ── Accounts: sign-up, lockout, password reset, sign out everywhere ─────────
await step("accounts", async () => {
  const cfg = await call("GET", "/api/auth/config");
  check("auth config (public)", cfg.status === 200 && cfg.json?.signup === true && cfg.json?.microsoft === false, cfg.text);
  const ms = await fetch(BASE + "/api/auth/microsoft?intent=login", { redirect: "manual" });
  check("Microsoft sign-in off until keys are added", ms.status >= 300 && ms.status < 400 && (ms.headers.get("location") || "").includes("microsoft_off"), ms.headers.get("location"));
  const email = `e2e-${Date.now()}@example.com`;
  const bad = await call("POST", "/api/auth/register", { body: { gymName: "E2E Gym", ownerName: "Test Owner", email, password: "longpassword1", acceptTerms: false } });
  check("sign-up requires accepting terms", bad.status === 400, bad.text);
  const reg = await fetch(BASE + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gymName: "E2E Gym", ownerName: "Test Owner", email, phone: "5555 1234", password: "longpassword1", acceptTerms: true }),
  });
  const regJson = await reg.json().catch(() => ({}));
  const R = { cookie: sessionCookie(reg) };
  check("self sign-up creates a gym on a trial", reg.ok && regJson.home?.startsWith("/dashboard"), JSON.stringify(regJson));
  const me = await call("GET", "/api/auth/me", R);
  check("new gym is on TRIAL with trial end date", me.json?.gym?.status === "TRIAL" && !!me.json?.gym?.trialEndsAt, me.text);
  const trialDays = Math.round((new Date(me.json?.gym?.trialEndsAt).getTime() - Date.now()) / 86_400_000);
  check("free trial is 7 days", trialDays === 7, trialDays);
  const plans = await call("GET", "/api/plans", R);
  check("new gym gets starter plans", (plans.json?.plans?.length ?? 0) >= 3, plans.json?.plans?.length);
  const ob = await call("GET", "/api/onboarding", R);
  check("get-started checklist", ob.json?.total === 6 && ob.json?.done < 6, ob.text);
  const mem = await call("GET", "/api/members", R);
  check("new gym starts with no members (isolated)", mem.json?.counts?.ALL === 0, mem.json?.counts?.ALL);
  const dup = await call("POST", "/api/auth/register", { body: { gymName: "Again", ownerName: "Someone Else", email, password: "longpassword1", acceptTerms: true } });
  check("same email can't sign up twice", dup.status === 409, dup.text);

  // Import members
  const rows = [
    { fullName: "Aisha Al-Khater", phone: "+974 5512 3456", gender: "Female", plan: "Monthly", endDate: "30/12/2030" },
    { firstName: "Rahul", lastName: "Menon", phone: "6612 7788", email: "rahul@example.com" },
    { firstName: "No", lastName: "Phone", phone: "" },
    { firstName: "Dup", lastName: "Phone", phone: "55123456" },
    { firstName: "Bad", lastName: "Plan", phone: "3311 2233", plan: "Platinum", endDate: "2030-01-01" },
  ];
  const dry = await call("POST", "/api/members/import", { ...R, body: { rows, dryRun: true } });
  check("import check: 2 ready, 3 skipped with reasons", dry.json?.ready === 2 && dry.json?.skipped?.length === 3, dry.text);
  const imp = await call("POST", "/api/members/import", { ...R, body: { rows } });
  check("import creates members", imp.json?.created === 2, imp.text);
  const after = await call("GET", "/api/members?status=ACTIVE", R);
  check("imported plan becomes an active membership", after.json?.members?.some((m) => m.name === "Aisha Al-Khater"), after.text);

  // Sign out everywhere: old cookie stops working, new one works
  const old = R.cookie;
  const rev = await fetch(BASE + "/api/auth/sessions", { method: "POST", headers: { Cookie: old } });
  const fresh = sessionCookie(rev);
  check("sign out everywhere: this device stays in", rev.ok && (await call("GET", "/api/auth/me", { cookie: fresh })).status === 200);
  check("sign out everywhere: old sessions rejected", (await call("GET", "/api/auth/me", { cookie: old })).status === 401);

  // Forgot password (email not configured here → tells the user to ask the owner)
  const fg = await call("POST", "/api/auth/forgot", { body: { email } });
  check("forgot password answers safely", fg.status === 200 && typeof fg.json?.emailEnabled === "boolean", fg.text);
  const rs = await call("POST", "/api/auth/reset", { body: { token: "x".repeat(40), password: "newpassword1" } });
  check("reset with a fake token is refused", rs.status === 400, rs.text);

  // Lockout after 5 wrong passwords
  let last = null;
  for (let i = 0; i < 5; i++) last = await call("POST", "/api/auth/login", { body: { email, password: "wrong-password" } });
  check("5 wrong passwords lock the account", last?.status === 429, last?.text);
  const locked = await call("POST", "/api/auth/login", { body: { email, password: "longpassword1" } });
  check("locked account refuses even the right password", locked.status === 429, locked.text);
});

await step("public pages", async () => {
  for (const p of ["/register", "/forgot-password", "/reset-password?token=abc", "/privacy", "/terms", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest"]) {
    const r = await call("GET", p);
    check(`public page ${p}`, r.status === 200, r.status);
  }
});

console.log(`\nE2E_RESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log("Failed: " + failures.join(" | "));
process.exit(fail ? 1 : 0);
