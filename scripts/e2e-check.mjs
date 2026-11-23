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

/** Read the last emailed code for an address from the server log (EMAIL_DEV_LOG=1 test mode). */
async function codeFor(email) {
  const { readFile } = await import("node:fs/promises");
  const log = await readFile(process.env.EMAIL_LOG_FILE ?? "server.log", "utf8").catch(() => "");
  const hits = [...log.matchAll(new RegExp(`\\[email-dev\\] to=${email.replace(/[.+]/g, "\\$&")} subject=(\\d{6}) is your VOXI code`, "g"))];
  return hits.at(-1)?.[1] ?? null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email, password = PASSWORD, code) {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...(code ? { code } : {}) }),
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
  const dohaDob = cur.dateOfBirth ? new Date(new Date(cur.dateOfBirth).getTime() + 3 * 3600_000).toISOString().slice(0, 10) : "1990-01-15";
  const base = { firstName: cur.firstName, lastName: cur.lastName || "Member", phone: cur.phone, email: cur.email, gender: cur.gender ?? "MALE", dateOfBirth: dohaDob, qid: cur.qid || "28463400123", branchId: cur.branch?.id ?? null };
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
  const good = { firstName: "Rule", lastName: "Tester", phone: "+974 5000 0002", gender: "FEMALE", dateOfBirth: "1995-06-15", qid: "28463400123" };
  const kid = await call("POST", "/api/members", { ...O, body: { ...good, dateOfBirth: young } });
  check("members must be 10 or older", kid.status === 400 && /10 years/.test(kid.json?.error ?? "") && !!kid.json?.fields?.dateOfBirth, kid.text);
  const bads = [
    ["letters in phone are refused", { phone: "+974 5512abcd" }, "phone"],
    ["Qatar numbers need 8 digits", { phone: "+974 5512345" }, "phone"],
    ["long phone numbers are refused", { phone: "+974 55123456789012345678" }, "phone"],
    ["16 digits is one too many", { phone: "+974 5512345678901234" }, "phone"],
    ["India numbers need 10 digits", { phone: "+91 98765 4321" }, "phone"],
    ["a sentence is not an email", { email: "this is not an email" }, "email"],
    ["email without a domain is refused", { email: "name@gmail" }, "email"],
    ["last name is required", { lastName: "" }, "lastName"],
    ["names can't contain numbers", { firstName: "R2D2" }, "firstName"],
    ["gender is required", { gender: null }, "gender"],
    ["date of birth is required", { dateOfBirth: null }, "dateOfBirth"],
    ["future birthdays are refused", { dateOfBirth: "2099-01-01" }, "dateOfBirth"],
    ["QID must be 11 digits", { qid: "12345" }, "qid"],
    ["QID is required", { qid: "" }, "qid"],
    ["emergency phone is checked too", { emergencyPhone: "+974 12" }, "emergencyPhone"],
  ];
  for (const [label, patch, field] of bads) {
    const r = await call("POST", "/api/members", { ...O, body: { ...good, ...patch } });
    check(label, r.status === 400 && !!r.json?.fields?.[field], r.text);
  }
  const noLast = await call("POST", "/api/members", { ...O, body: { ...good, phone: "+974 5000-0002", email: "Rule.Tester@Example.com", emergencyPhone: "+974 " } });
  check("valid member saves (phone tidied, email lower-cased)", noLast.status === 200 && noLast.json?.lastName === "Tester", noLast.text);
  const gotM = noLast.json?.id ? (await call("GET", `/api/members/${noLast.json.id}`, O)).json : null;
  check("phone saved as +974 50000002", gotM?.phone === "+974 50000002" && gotM?.email === "rule.tester@example.com" && gotM?.emergencyPhone == null, JSON.stringify([gotM?.phone, gotM?.email, gotM?.emergencyPhone]));
  const fifteen = await call("POST", "/api/members", { ...O, body: { ...good, firstName: "Fifteen", phone: "+974 551234567890123" } });
  check("phone numbers can have up to 15 digits", fifteen.status === 200, fifteen.text);
  if (fifteen.json?.id) await call("DELETE", `/api/members/${fifteen.json.id}`, O);
  const india = await call("POST", "/api/members", { ...O, body: { ...good, firstName: "Arjun", phone: "+91 98765 43210" } });
  check("10-digit Indian mobile accepted", india.status === 200, india.text);
  if (india.json?.id) await call("DELETE", `/api/members/${india.json.id}`, O);
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

await step("send invoice and card to a member", async () => {
  const p = await call("POST", "/api/payments", { ...O, body: { memberId: voxiMemberId, amount: 250, method: "CARD", description: "E2E invoice to share" } });
  check("invoice payment recorded", !!p.json?.id, p.text);
  const inv = await call("GET", `/api/payments/${p.json?.id}`, O);
  check("invoice carries a share link token", typeof inv.json?.shareToken === "string" && inv.json.shareToken.startsWith(p.json?.id), inv.text);
  const pub = await call("GET", `/api/public/invoice/${inv.json?.shareToken}`);
  check("shared invoice opens without signing in", pub.status === 200 && pub.json?.payment?.invoiceNo === p.json?.invoiceNo && pub.json?.payment?.cashSessionId === null, pub.text);
  const fake = await call("GET", `/api/public/invoice/${p.json?.id}.AAAAAAAAAAAAAAAAAAAAAA`);
  check("a forged invoice link is refused", fake.status === 404, fake.status);
  const page = await fetch(`${BASE}/r/${inv.json?.shareToken}`, { redirect: "manual" });
  check("shared invoice page is public", page.status === 200, page.status);
  const pdf = Buffer.from("%PDF-1.4\n%%EOF\n").toString("base64");
  const wa = await call("POST", `/api/members/${voxiMemberId}/send`, { ...O, body: { channel: "WHATSAPP", text: "Hi", attachments: [{ name: "x.pdf", type: "application/pdf", data: pdf }] } });
  check("WhatsApp files need the Business API (link mode shares from the phone)", wa.status === 400 && /Business API/.test(wa.json?.error ?? ""), wa.text);
  const bad = await call("POST", `/api/members/${voxiMemberId}/send`, { ...O, body: { channel: "EMAIL", text: "Hi", attachments: [{ name: "x.exe", type: "application/x-msdownload", data: pdf }] } });
  check("only PDF and image attachments", bad.status === 400, bad.text);
  const em = await call("POST", `/api/members/${voxiMemberId}/send`, { ...O, body: { channel: "EMAIL", subject: "Your invoice", text: "Hi, here is your invoice.", attachments: [{ name: `${p.json?.invoiceNo}.pdf`, type: "application/pdf", data: pdf }] } });
  check("email with the invoice attached", em.status === 200 || (em.status === 400 && /no email/.test(em.json?.error ?? "")), em.text);
  const other = await call("POST", "/api/members/does-not-exist/send", { ...O, body: { channel: "EMAIL", text: "Hi" } });
  check("can't send to a member of another gym", other.status === 404, other.status);
  await call("POST", `/api/payments/${p.json?.id}/refund`, O);
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
  const tb = await call("POST", "/api/branches", { ...P, body: { name: "Trial Branch", address: null, phone: null, isActive: true } });
  check("trial: only one location, a branch needs a plan", tb.status === 403 && /one location/.test(tb.json?.error ?? ""), tb.text);
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
  const noPhone = await call("POST", "/api/staff", { ...O, body: { name: "No Phone", role: "HOUSEKEEPING", phone: "" } });
  check("staff need a mobile number", noPhone.status === 400 && !!noPhone.json?.fields?.phone, noPhone.text);
  check("add housekeeping staff without email or password", add.status === 200 && add.json?.role === "HOUSEKEEPING", add.text);
  const list = await call("GET", "/api/staff", O);
  check("housekeeping staff appear on the team list", list.json?.staff?.some((s) => s.name === "Test Cleaner"), list.text?.slice(0, 120));
  const noEmail = await call("POST", "/api/staff", { ...O, body: { name: "No Email Reception", role: "RECEPTION", phone: "+974 55001123", password: "longpassword1" } });
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
  // Every switch works for every role: give trainers payments, reception the team page
  await call("PUT", "/api/settings/permissions", { ...O, body: { permissions: { TRAINER: { payments: true }, RECEPTION: { staff: true } } } });
  check("owner can give trainers payments", (await call("GET", "/api/payments", T)).status === 200);
  check("owner can give reception the team page", (await call("GET", "/api/staff", R)).status === 200);
  // Back to defaults
  await call("PUT", "/api/settings/permissions", { ...O, body: { permissions: {} } });
  check("defaults restored", (await call("GET", "/api/payments", R)).status === 200);
  check("defaults: trainers have no payments", (await call("GET", "/api/payments", T)).status === 403);
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

// ── New staff confirm their email on first sign-in ─────────────────────────
await step("staff email check", async () => {
  const em = `new-staff-${Date.now()}@example.com`;
  const add = await call("POST", "/api/staff", { ...O, body: { name: "New Receptionist", email: em, phone: "+974 55001124", role: "RECEPTION", branchId: null, salary: null, specialty: null, isActive: true, password: "longpassword1" } });
  check("owner adds a staff login", add.status === 200, add.text?.slice(0, 120));
  const first = await call("POST", "/api/auth/login", { body: { email: em, password: "longpassword1" } });
  check("first sign-in asks for an email code", first.json?.needsCode === true, first.text);
  await sleep(300);
  const code = await codeFor(em);
  const ok = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em, password: "longpassword1", code }) });
  const okJson = await ok.json().catch(() => ({}));
  check("right code signs them in", ok.ok && okJson.user?.role === "RECEPTION", JSON.stringify(okJson).slice(0, 120));
  const next = await call("POST", "/api/auth/login", { body: { email: em, password: "longpassword1" } });
  check("no code needed after that", next.status === 200 && !next.json?.needsCode, next.text?.slice(0, 80));
  const wrongPw = await call("POST", "/api/auth/login", { body: { email: em, password: "wrongpassword" } });
  check("wrong password never sends a code", wrongPw.status === 401, wrongPw.status);
});

// ── Billing: plan requests, activation and branch limits ───────────────────
await step("sales, PT, extras and lead import", async () => {
  const O = { cookie: (await login("owner@voxi.qa")).cookie };
  const R = { cookie: (await login("reception@voxi.qa")).cookie };
  const T = { cookie: (await login("trainer@voxi.qa")).cookie };
  const sellers = (await call("GET", "/api/staff/sellers", R)).json?.staff ?? [];
  const recId = (await call("GET", "/api/auth/me", R)).json?.user?.staffId;
  const trainerId = (await call("GET", "/api/auth/me", T)).json?.user?.staffId;
  const rec = sellers.find((x) => x.id === recId);
  const trainer = sellers.find((x) => x.id === trainerId);
  check("Sold by list is synced with staff", !!rec && !!trainer && sellers.every((x) => x.name), JSON.stringify(sellers.slice(0, 3)));

  const before = (await call("GET", "/api/sales?period=day", O)).json;
  check("sales page loads for today", typeof before?.totals?.revenue === "number" && Array.isArray(before?.board), JSON.stringify(before?.totals));

  // A new member sold by reception, found via WhatsApp, with a plan
  const plans = (await call("GET", "/api/plans?active=1", O)).json?.plans ?? [];
  const plan = plans.find((p) => p.price > 0);
  const m = await call("POST", "/api/members", { ...R, body: { firstName: "Sales", lastName: "Tester", phone: `+974 5${String(Date.now()).slice(-7)}`, gender: "MALE", dateOfBirth: "1992-04-10", qid: "28463400124", source: "WHATSAPP", soldById: rec.id, planId: plan.id, amountPaid: plan.price, paymentMethod: "CARD" } });
  check("member saved with Sold by and source", m.status === 200, m.text);
  const md = (await call("GET", `/api/members/${m.json?.id}`, O)).json;
  check("member shows who sold it and where they came from", md?.soldBy?.id === rec.id && md?.source === "WHATSAPP" && md?.memberships?.[0]?.soldById === rec.id, JSON.stringify([md?.soldBy, md?.source]));
  const badSeller = await call("POST", "/api/members", { ...R, body: { firstName: "Bad", lastName: "Seller", phone: "+974 55001199", gender: "MALE", dateOfBirth: "1992-04-10", qid: "28463400125", soldById: "not-a-staff-id" } });
  check("Sold by must be someone on your staff", badSeller.status === 400, badSeller.text);

  // Extras
  const extras = (await call("GET", "/api/extras", R)).json?.items ?? [];
  check("starter extras price list (towel, sauna...)", extras.some((x) => /towel/i.test(x.name)) && extras.some((x) => /sauna/i.test(x.name)), JSON.stringify(extras.map((x) => x.name)));
  const sauna = extras.find((x) => /sauna/i.test(x.name));
  const recEdit = await call("POST", "/api/extras", { ...R, body: { name: "Ice bath", price: 40 } });
  check("reception can't change the extras price list", recEdit.status === 403, recEdit.text);
  const ch = await call("POST", "/api/extras/charge", { ...R, body: { extraItemId: sauna.id, quantity: 2, memberId: m.json?.id, method: "CASH", soldById: rec.id } });
  check("charge 2 sauna sessions to a member", ch.status === 200 && ch.json?.amount === sauna.price * 2, ch.text);
  const walkIn = await call("POST", "/api/extras/charge", { ...R, body: { extraItemId: extras[0].id, quantity: 1, method: "CARD" } });
  check("charge an extra to a walk-in", walkIn.status === 200 && walkIn.json?.memberId == null, walkIn.text);

  // PT: a PT-only client, a package, sessions
  const ptc = await call("POST", "/api/members", { ...R, body: { firstName: "Pt", lastName: "Only", phone: `+974 6${String(Date.now()).slice(-7)}`, gender: "FEMALE", dateOfBirth: "1996-08-01", qid: "28463400126", ptOnly: true, source: "WALK_IN" } });
  check("PT-only client saved without a membership", ptc.status === 200, ptc.text);
  const trainerSell = await call("POST", "/api/pt/packages", { ...T, body: { memberId: ptc.json?.id, trainerId: trainer.id, sessionsTotal: 3, price: 900, amountPaid: 900, paymentMethod: "CARD" } });
  check("trainers can't sell PT packages", trainerSell.status === 403, trainerSell.text);
  const pkg = await call("POST", "/api/pt/packages", { ...R, body: { memberId: ptc.json?.id, trainerId: trainer.id, sessionsTotal: 2, price: 600, amountPaid: 600, paymentMethod: "CARD", soldById: trainer.id } });
  check("reception sells a 2-session PT package", pkg.status === 200 && pkg.json?.pkg?.name === "2 PT sessions" && pkg.json?.payment?.amount === 600, pkg.text);
  const pid = pkg.json?.pkg?.id;
  const visit = await call("POST", "/api/attendance", { ...R, body: { code: ptc.json?.code } });
  check("PT-only client can check in with sessions left", visit.status === 200 && visit.json?.allowed === true, visit.text);

  const tView = (await call("GET", "/api/pt", T)).json;
  check("trainer sees their PT client", tView?.isTrainer === true && tView?.packages?.some((p) => p.id === pid), JSON.stringify(tView?.packages?.map((p) => p.id)));
  const s1 = await call("POST", "/api/pt/sessions", { ...T, body: { packageId: pid, notes: "Legs: squats 5x5" } });
  check("trainer logs session 1 of 2", s1.status === 200 && s1.json?.sessionsUsed === 1, s1.text);
  const s2 = await call("POST", "/api/pt/sessions", { ...T, body: { packageId: pid } });
  check("session 2 completes the package", s2.json?.completed === true, s2.text);
  const s3 = await call("POST", "/api/pt/sessions", { ...T, body: { packageId: pid } });
  check("no sessions past the package", s3.status === 400, s3.text);
  const undo = await call("DELETE", `/api/pt/sessions/${s2.json?.session?.id}`, T);
  const after = (await call("GET", "/api/pt?status=all", O)).json?.packages?.find((p) => p.id === pid);
  check("undo puts the session back and reopens the package", undo.status === 200 && after?.sessionsUsed === 1 && after?.status === "ACTIVE", JSON.stringify(after));
  const board = (await call("GET", "/api/pt", O)).json?.board ?? [];
  check("trainer leaderboard counts sessions", (board.find((b) => b.trainerId === trainer.id)?.sessions ?? 0) >= 1, JSON.stringify(board));

  // Sales page adds it all up, by staff
  const day = (await call("GET", "/api/sales?period=day", O)).json;
  const recRow = day?.board?.find((b) => b.staffId === rec.id);
  const tRow = day?.board?.find((b) => b.staffId === trainer.id);
  check("sales board: reception's membership and extras", recRow?.memberships >= 1 && recRow?.extras >= 2 && recRow?.revenue >= plan.price + sauna.price * 2, JSON.stringify(recRow));
  check("sales board: PT sale counted for its seller", tRow?.pt >= 1 && tRow?.revenue >= 600, JSON.stringify(tRow));
  check("sales by type and source", day?.byKind?.PT?.amount >= 600 && day?.byKind?.EXTRA?.amount >= sauna.price * 2 && day?.bySource?.some((x) => x.source === "WHATSAPP"), JSON.stringify(day?.byKind));
  check("today's revenue went up by everything sold", day?.totals?.revenue - before?.totals?.revenue >= plan.price + sauna.price * 2 + 600, `${before?.totals?.revenue} -> ${day?.totals?.revenue}`);
  const month = await call("GET", "/api/sales?period=month", O);
  check("monthly sales view", month.status === 200 && month.json?.totals?.revenue >= day?.totals?.revenue, month.text?.slice(0, 120));
  check("reception can see the day but not month or year", (await call("GET", "/api/sales?period=year", R)).status === 403);
  for (const period of ["day", "month", "year"]) {
    const t = (await call("GET", `/api/dashboard/revenue?period=${period}`, O)).json;
    const want = { day: 30, month: 12, year: 5 }[period];
    check(`dashboard revenue timeline: ${period}`, t?.buckets?.length === want && typeof t?.current === "number", JSON.stringify(t)?.slice(0, 120));
  }

  // Trainer focus: the owner switches off the trainer's dashboard and members list
  await call("PUT", "/api/settings/permissions", { ...O, body: { permissions: { TRAINER: { trainerDashboard: false, trainerMembers: false } } } });
  const T2 = { cookie: (await login("trainer@voxi.qa")).cookie };
  check("trainer focus: dashboard switched off", (await call("GET", "/api/dashboard", T2)).status === 403);
  check("trainer focus: PT still works", (await call("GET", "/api/pt", T2)).status === 200);
  check("trainer switches don't affect reception", (await call("GET", "/api/members", R)).status === 200);
  await call("PUT", "/api/settings/permissions", { ...O, body: { permissions: {} } });

  // Lead import + sources
  const stamp = String(Date.now()).slice(-6);
  const rows = [
    { name: "Import One", phone: `55${stamp}`, source: "whatsapp", interest: "Annual" },
    { name: "Import Two", phone: `+974 66${stamp}`, source: "Walk in" },
    { name: "Bad Phone", phone: "12ab" },
    { name: "", phone: "55001234" },
    { name: "Dup One", phone: `55${stamp}` },
  ];
  const dry = await call("POST", "/api/leads/import", { ...R, body: { rows, commit: false } });
  check("lead import check: 2 ready, 3 skipped", dry.json?.ready === 2 && dry.json?.skipped?.length === 3 && dry.json?.imported === 0, dry.text);
  const real = await call("POST", "/api/leads/import", { ...R, body: { rows, commit: true } });
  const leads = (await call("GET", "/api/leads", R)).json?.leads ?? [];
  const one = leads.find((l) => l.name === "Import One");
  check("leads imported with their source", real.json?.imported === 2 && one?.source === "WHATSAPP" && leads.find((l) => l.name === "Import Two")?.source === "WALK_IN", real.text);
  const again = await call("POST", "/api/leads/import", { ...R, body: { rows, commit: false } });
  check("importing the same file twice skips duplicates", again.json?.ready === 0, again.text);
  for (const l of leads.filter((x) => x.name.startsWith("Import "))) await call("DELETE", `/api/leads/${l.id}`, O);
  const newSrc = await call("POST", "/api/leads", { ...R, body: { name: "Phone Caller", phone: "+974 55443322", source: "PHONE_CALL" } });
  check("new lead sources (phone call, Google, TikTok...)", newSrc.status === 200 && newSrc.json?.source === "PHONE_CALL", newSrc.text);
  if (newSrc.json?.id) await call("DELETE", `/api/leads/${newSrc.json.id}`, O);
});

await step("admin: storage, export, announcements, delete gym", async () => {
  const A = { cookie: (await login("admin@voxi.qa")).cookie };
  const O = { cookie: (await login("owner@voxi.qa")).cookie };
  const st = await call("GET", "/api/admin/storage", A);
  check("storage: database size and per-gym usage", st.json?.database?.bytes > 0 && st.json?.gyms?.length > 0 && st.json?.gyms?.every((g) => g.bytes >= 0), st.text?.slice(0, 200));
  check("gyms can't see storage", (await call("GET", "/api/admin/storage", O)).status === 403);

  // Announcements
  const n = await call("POST", "/api/admin/notices", { ...A, body: { message: "Maintenance tonight from 2 to 3 am", tone: "WARNING", audience: "ALL", link: "/help" } });
  check("admin posts an announcement", n.status === 200 && n.json?.active === true, n.text);
  const seen = await call("GET", "/api/notice", O);
  check("gyms see the announcement", seen.json?.notice?.message === "Maintenance tonight from 2 to 3 am" && seen.json?.notice?.tone === "WARNING", seen.text);
  const trialOnly = await call("POST", "/api/admin/notices", { ...A, body: { message: "Your trial includes everything", audience: "TRIAL" } });
  check("a new announcement replaces the old one, by audience", (await call("GET", "/api/notice", O)).json?.notice === null, "");
  await call("PATCH", `/api/admin/notices/${trialOnly.json?.id}`, { ...A, body: { active: false } });
  check("gyms can't post announcements", (await call("POST", "/api/admin/notices", { ...O, body: { message: "hello there" } })).status === 403);

  // A throwaway gym: create, export, refuse to delete until suspended, then delete
  const stamp = Date.now().toString().slice(-6);
  const g = await call("POST", "/api/admin/gyms", { ...A, body: { name: `Delete Me ${stamp}`, branchName: "Main", billingMonths: 12, extraBranches: 0, status: "TRIAL", trialDays: 7, ownerName: "Temp Owner", ownerEmail: `temp${stamp}@example.com`, ownerPassword: "longpassword1" } });
  check("admin creates a throwaway gym", g.status === 200, g.text);
  const gid = g.json?.id;
  let tl = await login(`temp${stamp}@example.com`, "longpassword1");
  if (tl.json?.needsCode) tl = await login(`temp${stamp}@example.com`, "longpassword1", await codeFor(`temp${stamp}@example.com`));
  const TO = { cookie: tl.cookie };
  const mem = await call("POST", "/api/members", { ...TO, body: { firstName: "Temp", lastName: "Member", phone: "+974 55112233", gender: "MALE", dateOfBirth: "1990-01-01", qid: "28463400129" } });
  check("throwaway gym has a member", mem.status === 200, mem.text);
  const ex = await call("GET", `/api/admin/gyms/${gid}/export`, A);
  check("export downloads all the gym's data", ex.status === 200 && ex.json?.counts?.members === 1 && ex.json?.members?.[0]?.photo === undefined && !JSON.stringify(ex.json?.staff).includes("passwordHash"), ex.text?.slice(0, 160));
  const notYet = await call("DELETE", `/api/admin/gyms/${gid}`, { ...A, body: { confirmName: `Delete Me ${stamp}` } });
  check("can't delete a gym that isn't suspended", notYet.status === 400 && /Suspend/.test(notYet.json?.error ?? ""), notYet.text);
  await call("PUT", `/api/admin/gyms/${gid}`, { ...A, body: { status: "SUSPENDED" } });
  const wrong = await call("DELETE", `/api/admin/gyms/${gid}`, { ...A, body: { confirmName: "Some Other Gym" } });
  check("delete needs the exact gym name", wrong.status === 400 && /match/.test(wrong.json?.error ?? ""), wrong.text);
  check("only VOXI admins can delete gyms", (await call("DELETE", `/api/admin/gyms/${gid}`, { ...O, body: { confirmName: `Delete Me ${stamp}` } })).status === 403);
  const del = await call("DELETE", `/api/admin/gyms/${gid}`, { ...A, body: { confirmName: `delete me ${stamp}` } });
  check("suspended gym deleted with everything in it", del.status === 200, del.text);
  const list = (await call("GET", "/api/admin/gyms", A)).json?.gyms ?? [];
  check("deleted gym is gone from the list", !list.some((x) => x.id === gid));
  check("its staff can't sign in any more", (await call("GET", "/api/auth/me", TO)).status === 401);
  const gone = await call("GET", "/api/admin/deleted", A);
  check("deleted gyms list keeps just the name", gone.json?.gyms?.some((x) => x.name === `Delete Me ${stamp}` && x.ownerEmail === `temp${stamp}@example.com`), gone.text?.slice(0, 200));
  check("only VOXI admins see deleted gyms", (await call("GET", "/api/admin/deleted", O)).status === 403);
  const log = await call("GET", "/api/admin/activity", A);
  check("admin activity logs create and delete", ["gym.create", "gym.delete"].every((a) => log.json?.entries?.some((e) => e.action === a && e.gymName === `Delete Me ${stamp}`)), log.text?.slice(0, 200));
  check("only VOXI admins see admin activity", (await call("GET", "/api/admin/activity", O)).status === 403);
  const gl = await call("GET", "/api/admin/gyms", A);
  check("platform stats: check-ins and money taken", typeof gl.json?.stats?.checkinsToday === "number" && typeof gl.json?.stats?.processed30d === "number" && "phone" in (gl.json?.gyms?.[0]?.owner ?? {}), JSON.stringify(gl.json?.stats));
});

await step("expense categories", async () => {
  const O = { cookie: (await login("owner@voxi.qa")).cookie };
  const R = { cookie: (await login("reception@voxi.qa")).cookie };
  const c0 = (await call("GET", "/api/expenses/categories", O)).json;
  check("more built-in expense categories", c0?.categories?.includes("Cleaning") && c0?.categories?.includes("Staff visas") && c0?.categories?.at(-1) === "Other", JSON.stringify(c0?.categories));
  const put = await call("PUT", "/api/expenses/categories", { ...O, body: { custom: ["Supplements stock", "  supplements   STOCK ", "Rent", "Event costs"] } });
  check("owner adds custom categories (no duplicates, no built-ins)", JSON.stringify(put.json?.custom) === JSON.stringify(["Supplements stock", "Event costs"]), put.text);
  check("reception can't change categories", (await call("PUT", "/api/expenses/categories", { ...R, body: { custom: [] } })).status === 403);
  const c1 = (await call("GET", "/api/expenses/categories", O)).json;
  check("custom categories show up in the list", c1?.categories?.includes("Supplements stock"), JSON.stringify(c1?.categories));
  const e = await call("POST", "/api/expenses", { ...O, body: { category: "Event costs", amount: 250, method: "BANK_TRANSFER" } });
  check("expense saved in a custom category", e.status === 200, e.text);
  if (e.json?.id) await call("DELETE", `/api/expenses/${e.json.id}`, O);
  await call("PUT", "/api/expenses/categories", { ...O, body: { custom: [] } });
});

await step("cafe add-on", async () => {
  const O = { cookie: (await login("owner@voxi.qa")).cookie };
  const R = { cookie: (await login("reception@voxi.qa")).cookie };
  const T = { cookie: (await login("trainer@voxi.qa")).cookie };
  const A = { cookie: (await login("admin@voxi.qa")).cookie };
  const gyms = await call("GET", "/api/admin/gyms", A);
  const voxi = gyms.json?.gyms?.find((g) => g.slug === "voxi-fitness");
  await call("PUT", `/api/admin/gyms/${voxi?.id}`, { ...A, body: { cafeEnabled: false } });

  const locked = await call("GET", "/api/cafe", O);
  check("café is a locked preview until paid", locked.status === 200 && locked.json?.enabled === false && locked.json?.price === 8000, locked.text);
  const tryAdd = await call("POST", "/api/cafe/items", { ...O, body: { name: "Flat White", category: "COFFEE", price: 18 } });
  check("locked café refuses changes with 402", tryAdd.status === 402 && /Billing/.test(tryAdd.json?.error ?? ""), tryAdd.text);
  check("trainers can't open the café", (await call("GET", "/api/cafe", T)).status === 403);

  const on = await call("PUT", `/api/admin/gyms/${voxi?.id}`, { ...A, body: { cafeEnabled: true } });
  check("VOXI admin unlocks the café", on.json?.cafeEnabled === true, on.text);
  const open = await call("GET", "/api/cafe", O);
  for (const it of open.json?.items ?? []) await call("DELETE", `/api/cafe/items/${it.id}`, O);

  const bad = await call("POST", "/api/cafe/items", { ...O, body: { name: "", category: "TEA", price: 0 } });
  check("café item rules (name, category, price)", bad.status === 400 && !!bad.json?.fields?.name && !!bad.json?.fields?.category && !!bad.json?.fields?.price, bad.text);
  const shake = (await call("POST", "/api/cafe/items", { ...O, body: { name: "Whey Protein Shake", category: "SHAKE", price: 25, protein: 30, stock: 2 } })).json;
  const coffee = (await call("POST", "/api/cafe/items", { ...O, body: { name: "Flat White", category: "COFFEE", price: 18 } })).json;
  check("owner adds menu items", !!shake?.id && !!coffee?.id && shake.stock === 2);
  const recAdd = await call("POST", "/api/cafe/items", { ...R, body: { name: "Sneaky Item", category: "SNACK", price: 5 } });
  check("reception can't change the menu", recAdd.status === 403, recAdd.text);
  for (let i = 3; i <= 14; i++) await call("POST", "/api/cafe/items", { ...O, body: { name: `Item ${String.fromCharCode(64 + i)}`, category: "SNACK", price: 10 } });
  const fifteenth = await call("POST", "/api/cafe/items", { ...O, body: { name: "One Too Many", category: "SNACK", price: 10 } });
  check("menu holds at most 14 items", fifteenth.status === 400 && /14/.test(fifteenth.json?.error ?? ""), fifteenth.text);

  const sale = await call("POST", "/api/cafe/sales", { ...R, body: { items: [{ itemId: shake.id, qty: 2 }, { itemId: coffee.id, qty: 1 }], method: "CASH" } });
  check("reception rings up a sale (prices from the menu)", sale.status === 200 && sale.json?.total === 2 * 25 + 18, sale.text);
  const soldOut = await call("POST", "/api/cafe/sales", { ...R, body: { items: [{ itemId: shake.id, qty: 1 }], method: "CARD" } });
  check("sold-out items can't be sold", soldOut.status === 400 && /sold out/i.test(soldOut.json?.error ?? ""), soldOut.text);
  const after = (await call("GET", "/api/cafe", O)).json;
  check("today's café takings add up", after?.today?.total >= 68 && after?.today?.cash >= 68 && after?.items?.find((i) => i.id === shake.id)?.stock === 0, JSON.stringify(after?.today));
  check("reception can't void a sale", (await call("DELETE", `/api/cafe/sales/${sale.json?.id}`, R)).status === 403);
  const voided = await call("DELETE", `/api/cafe/sales/${sale.json?.id}`, O);
  const back = (await call("GET", "/api/cafe", O)).json;
  check("voiding a sale puts the stock back", voided.status === 200 && back?.items?.find((i) => i.id === shake.id)?.stock === 2, voided.text);

  const someone = back?.staff?.find((st) => st.role === "RECEPTION");
  const role = await call("PUT", `/api/cafe/team/${someone?.id}`, { ...O, body: { cafeRole: "Barista" } });
  const withTeam = (await call("GET", "/api/cafe", O)).json;
  check("café team: give someone a café job", role.json?.cafeRole === "Barista" && withTeam?.team?.some((t) => t.id === someone?.id), role.text);
  await call("PUT", `/api/cafe/team/${someone?.id}`, { ...O, body: { cafeRole: null } });

  // Billing: the café add-on is priced into the plan
  const q = await call("POST", "/api/billing", { ...O, body: { months: 12, extraBranches: 0, cafe: true } });
  check("billing: VOXI Café adds QAR 8,000 a year", q.json?.quote?.total === 25000 + 8000 && q.json?.request?.cafe === true, q.text);
  const q3 = await call("POST", "/api/billing", { ...O, body: { months: 3, extraBranches: 0, cafe: true } });
  check("billing: VOXI Café is pro rata on 3 months", q3.json?.quote?.cafe === 3520, q3.text);
  await call("DELETE", "/api/billing", O);

  // Tidy up so the test can run again
  for (const it of withTeam?.items ?? []) await call("DELETE", `/api/cafe/items/${it.id}`, O);
  await call("PUT", `/api/admin/gyms/${voxi?.id}`, { ...A, body: { cafeEnabled: false } });
});

await step("billing", async () => {
  const b = await call("GET", "/api/billing", O);
  check("billing: active gym sees its plan", b.json?.status === "ACTIVE" && b.json?.current?.months === 12, b.text);
  // VOXI Fitness has 2 locations on a plan with 1 extra branch: a 3rd is refused
  const br = await call("POST", "/api/branches", { ...O, body: { name: "Test Branch", address: null, phone: null, isActive: true } });
  check("billing: branch limit enforced for paid plan", br.status === 403 && /Billing/.test(br.json?.error ?? ""), br.text);

  const pulse = await login("pulse@voxi.qa");
  const P = { cookie: pulse.cookie };
  const req = await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 2 } });
  check("billing: trial gym requests 12 months + 2 branches", req.status === 200 && req.json?.quote?.total === 25000 + 12000 + 9600, req.text);
  const four = await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 4 } });
  check("billing: branches 4 and 5 are 50% and 60% off", four.json?.quote?.total === 25000 + 12000 + 9600 + 6000 + 4800, four.text);
  const half = await call("POST", "/api/billing", { ...P, body: { months: 6, extraBranches: 0 } });
  check("billing: 6 months is QAR 2,750 a month", half.json?.quote?.total === 16500 && half.json?.quote?.perMonth === 2750, half.text);
  const one = await call("POST", "/api/billing", { ...P, body: { months: 3, extraBranches: 0, entrances: 2, onboarding: true } });
  check("billing: one-time add-ons priced (2 entrances + onboarding)", one.json?.oneTime === 1500 + 1430 + 1500 && one.json?.quote?.total === 11000, one.text);
  const noMonthly = await call("POST", "/api/billing", { ...P, body: { months: 1, extraBranches: 0 } });
  check("billing: no 1-month plan", noMonthly.status === 400, noMonthly.status);
  const tooMany = await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 5 } });
  check("billing: more than 5 locations refused", tooMany.status === 400, tooMany.status);
  const rec = await call("GET", "/api/billing", { cookie: (await login("pulse.reception@voxi.qa")).cookie });
  check("billing: reception can't open billing", rec.status === 403, rec.status);

  const ad = await login("admin@voxi.qa");
  const A = { cookie: ad.cookie };

  // Declining a request clears it; the gym can ask again
  const pulseId = (await call("GET", "/api/admin/gyms", A)).json?.gyms?.find((g) => g.slug === "pulse-ladies")?.id;
  const dec = await call("PUT", `/api/admin/gyms/${pulseId}`, { ...A, body: { declineRequest: true } });
  check("admin declines a plan request", dec.status === 200 && dec.json?.planRequest === null && dec.json?.status === "TRIAL", dec.text);
  const again = await call("POST", "/api/billing", { ...P, body: { months: 3, extraBranches: 0, entrances: 2, onboarding: true } });
  check("gym can request again after a decline", again.status === 200, again.text);

  // Promo codes: VOXI creates them, gyms apply them on Billing
  const code = `E2E${Date.now().toString().slice(-6)}`;
  const mk = await call("POST", "/api/admin/promos", { ...A, body: { code: code.toLowerCase(), kind: "PERCENT", value: 20, appliesTo: "ALL" } });
  check("admin creates a promo code (stored upper-case)", mk.status === 200 && mk.json?.code === code, mk.text);
  const dup = await call("POST", "/api/admin/promos", { ...A, body: { code, kind: "PERCENT", value: 10 } });
  check("duplicate promo code refused", dup.status === 409, dup.text);
  const over = await call("POST", "/api/admin/promos", { ...A, body: { code: code + "X", kind: "PERCENT", value: 150 } });
  check("promo over 100% refused", over.status === 400 && !!over.json?.fields?.value, over.text);
  const annualOnly = `${code}Y`;
  await call("POST", "/api/admin/promos", { ...A, body: { code: annualOnly, kind: "AMOUNT", value: 3000, appliesTo: "SUBSCRIPTION", minMonths: 12 } });
  const gymCant = await call("POST", "/api/admin/promos", { ...P, body: { code: "HACK", kind: "PERCENT", value: 100 } });
  check("gyms can't create promo codes", gymCant.status === 403, gymCant.status);
  const chk = await call("GET", `/api/billing/promo?code=${code.toLowerCase()}&months=12`, P);
  check("gym checks a promo code", chk.status === 200 && chk.json?.value === 20 && chk.json?.label === "20% off", chk.text);
  const bogus = await call("GET", "/api/billing/promo?code=NOPE123&months=12", P);
  check("unknown promo code refused", bogus.status === 400 && /isn't valid/.test(bogus.json?.error ?? ""), bogus.text);
  const short = await call("GET", `/api/billing/promo?code=${annualOnly}&months=3`, P);
  check("annual-only code refused on 3 months", short.status === 400 && /Annual/.test(short.json?.error ?? ""), short.text);
  const withPromo = await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 2, entrances: 1, promoCode: code } });
  check(
    "promo comes off the first invoice",
    withPromo.status === 200 && withPromo.json?.totalToday === Math.round((25000 + 12000 + 9600 + 1500) * 0.8) && withPromo.json?.request?.promoCode === code,
    withPromo.text,
  );
  const amt = await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 0, promoCode: annualOnly } });
  check("fixed-amount code takes QAR off the subscription", amt.json?.totalToday === 25000 - 3000, amt.text);
  await call("POST", "/api/billing", { ...P, body: { months: 12, extraBranches: 2, promoCode: code } });
  const gyms = await call("GET", "/api/admin/gyms", A);
  const pg = gyms.json?.gyms?.find((g) => g.slug === "pulse-ladies");
  check("admin sees the plan request", pg?.planRequest?.extraBranches === 2 && gyms.json?.stats?.requests >= 1, JSON.stringify(pg?.planRequest));
  const act = await call("PUT", `/api/admin/gyms/${pg?.id}`, { ...A, body: { applyRequest: true } });
  check("admin activates the request", act.json?.status === "ACTIVE" && act.json?.extraBranches === 2 && act.json?.planRequest === null && !!act.json?.paidUntil, act.text);
  const promos = await call("GET", "/api/admin/promos", A);
  const used = promos.json?.promos?.find((p) => p.code === code);
  check("activating counts one promo use", used?.uses === 1, JSON.stringify(used));
  await call("PATCH", `/api/admin/promos/${used?.id}`, { ...A, body: { active: false } });
  const off = await call("GET", `/api/billing/promo?code=${code}&months=12`, P);
  check("switched-off promo code refused", off.status === 400, off.text);
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
  const bad = await call("POST", "/api/auth/register", { body: { gymName: "E2E Gym", firstName: "Test", lastName: "Owner", email, phone: "+974 5555 1234", password: "longpassword1", acceptTerms: false } });
  check("sign-up requires accepting terms", bad.status === 400, bad.text);
  const form = { gymName: "E2E Gym", firstName: "Test", lastName: "Owner", email, phone: "+974 5555 1234", password: "longpassword1", acceptTerms: true, marketingOptIn: true };
  for (const [label, patch, field] of [
    ["sign-up needs a last name", { lastName: "" }, "lastName"],
    ["sign-up needs a mobile number", { phone: "+974 " }, "phone"],
    ["sign-up refuses letters in the mobile", { phone: "+974 55ab1234" }, "phone"],
    ["sign-up refuses a sentence as email", { email: "hello there friend" }, "email"],
    ["sign-up password needs a number", { password: "onlyletters" }, "password"],
  ]) {
    const r = await call("POST", "/api/auth/register", { body: { ...form, ...patch } });
    check(label, r.status === 400 && !!r.json?.fields?.[field], r.text);
  }
  const step1 = await call("POST", "/api/auth/register", { body: form });
  check("email sign-up sends a code first (no gym yet)", step1.json?.needsCode === true && !sessionCookie({ headers: step1.headers }), step1.text);
  await sleep(300);
  const code = await codeFor(email);
  check("code email was sent", /^\d{6}$/.test(code ?? ""), code);
  const wrong = await call("POST", "/api/auth/register", { body: { ...form, code: code === "000000" ? "111111" : "000000" } });
  check("wrong code is refused", wrong.status === 400 && /isn't right/.test(wrong.json?.error ?? ""), wrong.text);
  const taken = await call("POST", "/api/auth/register", { body: { ...form, email: "owner@voxi.qa" } });
  check("existing email can't sign up again (no code sent)", taken.status === 409, taken.status);
  const reg = await fetch(BASE + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...form, code }),
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
  const dup = await call("POST", "/api/auth/register", { body: { gymName: "Again", firstName: "Someone", lastName: "Else", email, phone: "+974 5555 9876", password: "longpassword1", acceptTerms: true } });
  check("same email can't sign up twice", dup.status === 409, dup.text);

  // Import members
  const rows = [
    { fullName: "Alice Carter-Lane", phone: "+974 5512 3456", gender: "Female", plan: "Monthly", endDate: "30/12/2030" },
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
  check("imported plan becomes an active membership", after.json?.members?.some((m) => m.name === "Alice Carter-Lane"), after.text);

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
  for (const p of ["/register", "/forgot-password", "/reset-password?token=abc", "/privacy", "/terms", "/help", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest"]) {
    const r = await call("GET", p);
    check(`public page ${p}`, r.status === 200, r.status);
  }
});

console.log(`\nE2E_RESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log("Failed: " + failures.join(" | "));
process.exit(fail ? 1 : 0);
