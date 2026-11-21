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

// ── Accounts: sign-up, lockout, password reset, sign out everywhere ─────────
await step("accounts", async () => {
  const cfg = await call("GET", "/api/auth/config");
  check("auth config (public)", cfg.status === 200 && cfg.json?.signup === true, cfg.text);
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
