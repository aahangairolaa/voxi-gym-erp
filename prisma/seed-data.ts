/**
 * Generates realistic demo data for a premium gym in Doha.
 * Pure data only (no database calls) — prisma/seed.ts writes it to the database.
 * Everything is relative to "now", so the demo always looks current.
 */
import { createHash } from "node:crypto";
import { addDays, endOfDay, startOfDay } from "../src/lib/dates";

// ── Tiny deterministic random generator (same data every time) ───────────────
let seed = 20261112;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const chance = (p: number) => rand() < p;
function weighted<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[0]![0];
}
let idCounter = 0;
const id = (prefix: string) => `${prefix}_${(++idCounter).toString(36).padStart(6, "0")}${Math.floor(rand() * 1e6).toString(36)}`;
const at = (day: Date, hour: number, minute = 0) => new Date(day.getTime() + (hour * 60 + minute) * 60_000);

export const DEMO_DEVICE_KEYS = {
  pearl: "vxk_demo_the_pearl_entrance_000000000000000000",
  lusail: "vxk_demo_lusail_entrance_00000000000000000000",
};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function generateSeedData(passwordHash: string) {
  seed = 20261112;
  idCounter = 0;
  const now = new Date();
  const today = startOfDay(now);
  const nowHour = (now.getUTCHours() + 3) % 24;

  // ── Settings & branches ────────────────────────────────────────────────────
  const settings = {
    id: "default",
    gymName: "VOXI Fitness Club",
    legalName: "VOXI Fitness W.L.L.",
    crNumber: "154872",
    phone: "+974 4000 1234",
    email: "hello@voxi.qa",
    address: "Porto Arabia, The Pearl-Qatar, Doha",
    website: "voxi.qa",
    invoicePrefix: "INV",
    invoiceFooter: "Thank you for training with VOXI. Memberships are non-transferable.",
    expiryWarnDays: 7,
  };
  const branches = [
    { id: "br_pearl", name: "The Pearl", address: "Porto Arabia, Tower 21, The Pearl-Qatar", phone: "+974 4000 1234" },
    { id: "br_lusail", name: "Lusail", address: "Marina District, Lusail City", phone: "+974 4000 5678" },
  ];

  // ── Staff ──────────────────────────────────────────────────────────────────
  const staff = [
    { id: "st_owner", name: "Abdulla Al-Kuwari", email: "owner@voxi.qa", role: "OWNER", branchId: null, salary: null, specialty: null, phone: "+974 5500 0001" },
    { id: "st_manager", name: "Rania Haddad", email: "manager@voxi.qa", role: "MANAGER", branchId: "br_pearl", salary: 18000, specialty: null, phone: "+974 5500 0002" },
    { id: "st_rec1", name: "Joanna Cruz", email: "reception@voxi.qa", role: "RECEPTION", branchId: "br_pearl", salary: 6500, specialty: null, phone: "+974 5500 0003" },
    { id: "st_rec2", name: "Imran Sheikh", email: "lusail@voxi.qa", role: "RECEPTION", branchId: "br_lusail", salary: 6500, specialty: null, phone: "+974 5500 0004" },
    { id: "st_tr1", name: "Coach Karim Mansour", email: "trainer@voxi.qa", role: "TRAINER", branchId: "br_pearl", salary: 12000, specialty: "Strength & Conditioning", phone: "+974 5500 0005" },
    { id: "st_tr2", name: "Coach Elena Petrova", email: "elena@voxi.qa", role: "TRAINER", branchId: "br_pearl", salary: 11500, specialty: "Pilates & Mobility", phone: "+974 5500 0006" },
    { id: "st_tr3", name: "Coach Marcus Reid", email: "marcus@voxi.qa", role: "TRAINER", branchId: "br_lusail", salary: 11000, specialty: "Boxing & HIIT", phone: "+974 5500 0007" },
    { id: "st_tr4", name: "Coach Hessa Al-Sada", email: "hessa@voxi.qa", role: "TRAINER", branchId: "br_lusail", salary: 11000, specialty: "Ladies Fitness", phone: "+974 5500 0008" },
  ].map((s) => ({ ...s, passwordHash, isActive: true, role: s.role as "OWNER" | "MANAGER" | "RECEPTION" | "TRAINER" }));
  const trainers = staff.filter((s) => s.role === "TRAINER");

  // ── Plans (QAR) ────────────────────────────────────────────────────────────
  const plans = [
    { id: "pl_monthly", name: "Monthly", durationDays: 30, price: 550, freezeDays: 0, color: "#7C5CFF", sortOrder: 1, sessions: null, description: "Full gym access, both branches.", features: ["Gym floor access", "Locker & towel", "Group classes"] },
    { id: "pl_quarterly", name: "Quarterly", durationDays: 90, price: 1500, freezeDays: 14, color: "#5B8DEF", sortOrder: 2, sessions: null, description: "Three months, best for building a habit.", features: ["Everything in Monthly", "1 body-composition scan", "14 freeze days"] },
    { id: "pl_semi", name: "Semi-annual", durationDays: 180, price: 2700, freezeDays: 30, color: "#22B8A6", sortOrder: 3, sessions: null, description: "Six months of training.", features: ["Everything in Quarterly", "2 PT intro sessions", "30 freeze days"] },
    { id: "pl_annual", name: "Annual", durationDays: 365, price: 4800, freezeDays: 60, color: "#B45CFF", sortOrder: 4, sessions: null, description: "Our best value — a full year.", features: ["Everything in Semi-annual", "4 PT sessions", "Guest passes ×6", "60 freeze days"] },
    { id: "pl_student", name: "Student", durationDays: 30, price: 350, freezeDays: 0, color: "#F59E0B", sortOrder: 5, sessions: null, description: "Valid university ID required.", features: ["Gym floor access", "Off-peak classes"] },
    { id: "pl_couples", name: "Couples", durationDays: 30, price: 950, freezeDays: 0, color: "#EC4899", sortOrder: 6, sessions: null, description: "Monthly access for two.", features: ["2 memberships", "Group classes"] },
    { id: "pl_pt12", name: "PT Pack (12)", durationDays: 60, price: 2400, freezeDays: 7, color: "#0EA5E9", sortOrder: 7, sessions: 12, description: "12 personal-training sessions within 60 days.", features: ["12 × 60-min PT sessions", "Custom programme", "Progress check-ins"] },
  ].map((p) => ({ ...p, isActive: true }));
  const planById = new Map(plans.map((p) => [p.id, p]));

  // ── Names ──────────────────────────────────────────────────────────────────
  const qMale = ["Hamad", "Khalid", "Abdullah", "Mohammed", "Tamim", "Jassim", "Faisal", "Nasser", "Ali", "Saad", "Fahad", "Mubarak", "Hamad", "Sultan", "Rashid"];
  const qFemale = ["Noora", "Aisha", "Maryam", "Hessa", "Latifa", "Shaikha", "Al Anoud", "Lulwa", "Dana", "Reem", "Moza", "Fatima"];
  const qLast = ["Al-Thani", "Al-Kuwari", "Al-Marri", "Al-Naimi", "Al-Sulaiti", "Al-Mohannadi", "Al-Hajri", "Al-Kaabi", "Al-Mansouri", "Al-Emadi", "Al-Sada", "Al-Obaidli", "Al-Attiyah", "Al-Khulaifi"];
  const expats: [string, string, "MALE" | "FEMALE", string][] = [
    ["Omar", "Haddad", "MALE", "Lebanese"], ["Sara", "Mahmoud", "FEMALE", "Egyptian"], ["Yousef", "Nasr", "MALE", "Jordanian"],
    ["Mariam", "Khan", "FEMALE", "Pakistani"], ["Tariq", "Aziz", "MALE", "Pakistani"], ["Rahul", "Menon", "MALE", "Indian"],
    ["Priya", "Nair", "FEMALE", "Indian"], ["Arjun", "Pillai", "MALE", "Indian"], ["Maria", "Santos", "FEMALE", "Filipino"],
    ["Paolo", "Reyes", "MALE", "Filipino"], ["James", "Whitfield", "MALE", "British"], ["Emma", "Clarke", "FEMALE", "British"],
    ["Karim", "Fawzi", "MALE", "Egyptian"], ["Lina", "Saleh", "FEMALE", "Syrian"], ["Ahmed", "Osman", "MALE", "Sudanese"],
    ["Daniel", "Brooks", "MALE", "American"], ["Nadia", "Rahman", "FEMALE", "Other"], ["Bilal", "Qureshi", "MALE", "Pakistani"],
    ["Sneha", "Iyer", "FEMALE", "Indian"], ["Hassan", "Darwish", "MALE", "Lebanese"], ["Rana", "Khoury", "FEMALE", "Lebanese"],
    ["Mostafa", "Elsayed", "MALE", "Egyptian"], ["Anjali", "Sharma", "FEMALE", "Indian"], ["Kiran", "Thapa", "MALE", "Nepali"],
  ];
  const phone = () => `+974 ${pick(["3", "5", "6", "7"])}${int(0, 9)}${int(0, 9)}${int(0, 9)} ${int(1000, 9999)}`;

  // ── Members, memberships, payments ────────────────────────────────────────
  type M = Record<string, unknown> & { id: string; code: string; firstName: string; lastName: string; branchId: string; createdAt: Date; biometricId: string | null };
  const members: M[] = [];
  const memberships: Record<string, unknown>[] = [];
  const payments: (Record<string, unknown> & { method: string; paidAt: Date; amount: number; status: string; cashSessionId?: string | null; branchId: string })[] = [];
  const activeMembers: { id: string; branchId: string; until: Date; from: Date; frequency: number; enrolled: boolean; status: string }[] = [];

  const MEMBER_COUNT = 240;
  let invoice = 0;
  const method = () => weighted<string>([["CARD", 45], ["CASH", 25], ["FAWRAN", 15], ["BANK_TRANSFER", 10], ["ONLINE", 5]]);

  for (let i = 0; i < MEMBER_COUNT; i++) {
    const qatari = chance(0.45);
    const [firstName, lastName, gender, nationality] = qatari
      ? (() => {
          const g = chance(0.6) ? "MALE" : "FEMALE";
          return [pick(g === "MALE" ? qMale : qFemale), pick(qLast), g, "Qatari"] as const;
        })()
      : pick(expats);
    const code = `M-${1001 + i}`;
    const branchId = chance(0.58) ? "br_pearl" : "br_lusail";
    // Newer members are more common (growing gym)
    const joinedDaysAgo = Math.floor(Math.pow(rand(), 1.4) * 360);
    const createdAt = at(addDays(today, -joinedDaysAgo), int(8, 21), int(0, 59));
    const enrolled = chance(0.72);
    const memberId = id("mem");

    members.push({
      id: memberId,
      code,
      firstName,
      lastName,
      phone: phone(),
      email: chance(0.7) ? `${firstName.toLowerCase().replace(/\s/g, "")}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}${int(1, 99)}@gmail.com` : null,
      gender,
      dateOfBirth: new Date(Date.UTC(int(1972, 2006), int(0, 11), int(1, 28))),
      qid: `2${int(70, 99)}${int(10000000, 99999999)}`,
      nationality,
      emergencyName: chance(0.5) ? `${pick(qMale)} ${lastName}` : null,
      emergencyPhone: chance(0.5) ? phone() : null,
      notes: chance(0.08) ? pick(["Knee injury — avoid heavy squats", "Prefers morning sessions", "Referred by a friend", "Corporate deal — Ooredoo"]) : null,
      branchId,
      biometricId: enrolled ? String(1001 + i) : null,
      biometricEnrolled: enrolled ? addDays(createdAt, 0) : null,
      createdAt,
      updatedAt: createdAt,
    });

    // Membership history
    let planId = weighted<string>([["pl_monthly", 34], ["pl_quarterly", 22], ["pl_semi", 10], ["pl_annual", 12], ["pl_student", 9], ["pl_couples", 6], ["pl_pt12", 7]]);
    let start = startOfDay(createdAt);
    const willChurn = chance(0.16);
    for (let guard = 0; guard < 20; guard++) {
      const plan = planById.get(planId)!;
      const end = endOfDay(addDays(start, plan.durationDays - 1));
      const discount = chance(0.12) ? Math.round(plan.price * 0.1) : 0;
      const isCurrent = end >= today;
      const msId = id("ms");
      let status = isCurrent ? "ACTIVE" : "EXPIRED";
      let frozenAt: Date | null = null;
      if (isCurrent && plan.freezeDays > 0 && chance(0.07)) {
        status = "FROZEN";
        frozenAt = addDays(today, -int(1, 6));
      }
      memberships.push({
        id: msId, memberId, planId, startDate: start, endDate: end, status, price: plan.price, discount,
        frozenAt, freezeDaysUsed: 0, sessionsUsed: plan.sessions ? int(0, plan.sessions) : 0, createdAt: at(start, int(9, 20)),
      });
      const due = plan.price - discount;
      const partial = isCurrent && chance(0.07);
      const paidAt = start < today ? at(start, int(9, 21), int(0, 59)) : at(today, Math.max(0, nowHour - int(0, 2)), int(0, 59));
      payments.push({
        id: id("pay"), invoiceNo: `INV-${String(++invoice).padStart(6, "0")}`, memberId, membershipId: msId,
        amount: partial ? Math.round(due / 2) : due, method: method(), status: "PAID",
        description: `${plan.name} membership`, reference: null, paidAt,
        receivedById: branchId === "br_pearl" ? "st_rec1" : "st_rec2", branchId,
      });

      if (isCurrent) {
        activeMembers.push({ id: memberId, branchId, from: start, until: end, frequency: 0.25 + rand() * 0.5, enrolled, status });
        break;
      }
      // Decide whether they renewed
      const renew = !willChurn ? chance(0.85) : chance(0.3);
      if (!renew) {
        // Expired members still trained while they had a plan
        activeMembers.push({ id: memberId, branchId, from: start, until: end, frequency: 0.2 + rand() * 0.3, enrolled, status: "EXPIRED" });
        break;
      }
      start = startOfDay(addDays(end, chance(0.8) ? 1 : int(3, 20)));
      if (start > today) break;
      if (chance(0.25)) planId = weighted<string>([["pl_monthly", 3], ["pl_quarterly", 3], ["pl_semi", 2], ["pl_annual", 2]]);
    }
  }

  // A few one-off payments (PT top-ups, merchandise)
  for (let i = 0; i < 26; i++) {
    const m = pick(members);
    payments.push({
      id: id("pay"), invoiceNo: `INV-${String(++invoice).padStart(6, "0")}`, memberId: m.id, membershipId: null,
      amount: pick([60, 90, 120, 250, 300]), method: method(), status: chance(0.04) ? "REFUNDED" : "PAID",
      description: pick(["Single PT session", "VOXI shaker & towel", "Protein bar pack", "Guest day pass", "Body composition scan"]),
      reference: null, paidAt: at(addDays(today, -int(0, 150)), int(9, 21), int(0, 59)),
      receivedById: "st_rec1", branchId: m.branchId,
    });
  }

  // ── Biometric devices ──────────────────────────────────────────────────────
  const devices = [
    { id: "dev_pearl", name: "Pearl — Main turnstile", type: "FACE", vendor: "ZKTeco SpeedFace-V5L", serialNumber: "CKJE221560123", apiKeyHash: sha(DEMO_DEVICE_KEYS.pearl), apiKeyHint: DEMO_DEVICE_KEYS.pearl.slice(-4), branchId: "br_pearl", isActive: true, lastSeenAt: new Date(now.getTime() - 2 * 60_000) },
    { id: "dev_lusail", name: "Lusail — Entrance", type: "FINGERPRINT", vendor: "ZKTeco F22", serialNumber: "BOCK20330987", apiKeyHash: sha(DEMO_DEVICE_KEYS.lusail), apiKeyHint: DEMO_DEVICE_KEYS.lusail.slice(-4), branchId: "br_lusail", isActive: true, lastSeenAt: new Date(now.getTime() - 4 * 60_000) },
  ];
  const deviceFor = (branchId: string) => (branchId === "br_pearl" ? "dev_pearl" : "dev_lusail");

  // ── Attendance (last 45 days) ──────────────────────────────────────────────
  const attendance: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];
  const hourWeights: [number, number][] = [
    [6, 8], [7, 10], [8, 7], [9, 4], [10, 3], [11, 2], [12, 2], [13, 2], [14, 2], [15, 3], [16, 5],
    [17, 9], [18, 12], [19, 13], [20, 11], [21, 8], [22, 4],
  ];
  for (let d = 44; d >= 0; d--) {
    const day = addDays(today, -d);
    const weekday = new Date(day.getTime() + 3 * 3600_000).getUTCDay();
    const dayFactor = weekday === 5 ? 0.55 : weekday === 6 ? 0.8 : 1; // quieter Friday
    for (const m of activeMembers) {
      if (day < m.from || day > m.until || m.status === "FROZEN") continue;
      if (!chance(m.frequency * dayFactor * 0.95)) continue;
      const hour = weighted(hourWeights);
      if (d === 0 && hour > nowHour) continue;
      const minute = int(0, 59);
      const checkInAt = at(day, hour, minute);
      const duration = int(40, 115);
      let checkOutAt: Date | null = new Date(checkInAt.getTime() + duration * 60_000);
      if (d === 0 && checkOutAt > now) checkOutAt = null;
      const biometric = m.enrolled && chance(0.88);
      const attId = id("att");
      attendance.push({ id: attId, memberId: m.id, branchId: m.branchId, checkInAt, checkOutAt, source: biometric ? "BIOMETRIC" : "MANUAL", deviceId: biometric ? deviceFor(m.branchId) : null });
      if (biometric && d <= 2) {
        const member = members.find((x) => x.id === m.id)!;
        events.push({ id: id("evt"), deviceId: deviceFor(m.branchId), biometricUserId: member.biometricId, memberId: m.id, result: "GRANTED_IN", reason: null, scannedAt: checkInAt, createdAt: checkInAt });
        if (checkOutAt) events.push({ id: id("evt"), deviceId: deviceFor(m.branchId), biometricUserId: member.biometricId, memberId: m.id, result: "GRANTED_OUT", reason: null, scannedAt: checkOutAt, createdAt: checkOutAt });
      }
    }
  }
  // Some denied & unknown scans for realism
  const expiredEnrolled = members.filter((m) => m.biometricId && activeMembers.find((a) => a.id === m.id && a.status === "EXPIRED"));
  for (let i = 0; i < 6; i++) {
    const t = new Date(now.getTime() - int(10, 60 * 40) * 60_000);
    const m = expiredEnrolled[i % Math.max(1, expiredEnrolled.length)];
    if (m && i % 2 === 0) events.push({ id: id("evt"), deviceId: deviceFor(m.branchId), biometricUserId: m.biometricId, memberId: m.id, result: "DENIED", reason: "Membership has expired", scannedAt: t, createdAt: t });
    else events.push({ id: id("evt"), deviceId: pick(["dev_pearl", "dev_lusail"]), biometricUserId: String(int(3000, 3999)), memberId: null, result: "UNKNOWN_USER", reason: "No member enrolled with this ID", scannedAt: t, createdAt: t });
  }

  // ── Cash sessions (last 7 days) ────────────────────────────────────────────
  const cashSessions: Record<string, unknown>[] = [];
  for (let d = 6; d >= 0; d--) {
    for (const b of branches) {
      const day = addDays(today, -d);
      const sid = id("cash");
      const openingFloat = 500;
      const dayCash = payments.filter((p) => p.method === "CASH" && p.branchId === b.id && p.paidAt >= day && p.paidAt <= endOfDay(day));
      dayCash.forEach((p) => (p.cashSessionId = sid));
      const cashIn = dayCash.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
      const expected = openingFloat + cashIn;
      const isToday = d === 0;
      const diff = isToday ? null : chance(0.7) ? 0 : pick([-20, -10, 5, 10, -50]);
      cashSessions.push({
        id: sid, branchId: b.id, status: isToday ? "OPEN" : "CLOSED", openingFloat,
        expectedCash: isToday ? null : expected, countedCash: isToday ? null : expected + (diff ?? 0), difference: diff,
        notes: diff && diff < 0 ? "Short — checked with reception" : null,
        openedById: b.id === "br_pearl" ? "st_rec1" : "st_rec2", closedById: isToday ? null : b.id === "br_pearl" ? "st_rec1" : "st_rec2",
        openedAt: at(day, 6, 0), closedAt: isToday ? null : at(day, 23, 5),
      });
    }
  }

  // ── Exercises & workouts ───────────────────────────────────────────────────
  const exerciseList: [string, string, string][] = [
    ["Barbell Back Squat", "Legs", "Barbell"], ["Romanian Deadlift", "Legs", "Barbell"], ["Leg Press", "Legs", "Machine"],
    ["Walking Lunges", "Legs", "Dumbbell"], ["Leg Curl", "Legs", "Machine"], ["Hip Thrust", "Legs", "Barbell"],
    ["Bench Press", "Chest", "Barbell"], ["Incline Dumbbell Press", "Chest", "Dumbbell"], ["Cable Fly", "Chest", "Cable"], ["Push-up", "Chest", "Bodyweight"],
    ["Deadlift", "Back", "Barbell"], ["Pull-up", "Back", "Bodyweight"], ["Lat Pulldown", "Back", "Cable"], ["Seated Cable Row", "Back", "Cable"], ["Single-arm DB Row", "Back", "Dumbbell"],
    ["Overhead Press", "Shoulders", "Barbell"], ["Lateral Raise", "Shoulders", "Dumbbell"], ["Face Pull", "Shoulders", "Cable"],
    ["Barbell Curl", "Arms", "Barbell"], ["Triceps Pushdown", "Arms", "Cable"], ["Hammer Curl", "Arms", "Dumbbell"],
    ["Plank", "Core", "Bodyweight"], ["Hanging Knee Raise", "Core", "Bodyweight"], ["Cable Woodchop", "Core", "Cable"],
    ["Kettlebell Swing", "Full body", "Kettlebell"], ["Burpee", "Full body", "Bodyweight"], ["Thruster", "Full body", "Barbell"],
    ["Rowing Machine", "Cardio", "Machine"], ["Assault Bike", "Cardio", "Machine"], ["Incline Treadmill Walk", "Cardio", "Machine"],
  ];
  const exercises = exerciseList.map(([name, muscleGroup, equipment]) => ({ id: id("ex"), name, muscleGroup, equipment }));
  const ex = (name: string) => exercises.find((e) => e.name === name)!.id;

  const templates: { name: string; goal: string; level: string; days: number; trainer: string; desc: string; items: [string, number, number, string, number][] }[] = [
    { name: "Foundations 3-Day", goal: "General fitness", level: "Beginner", days: 3, trainer: "st_tr1", desc: "Full-body sessions to learn the main lifts.",
      items: [["Barbell Back Squat", 1, 3, "8-10", 90], ["Bench Press", 1, 3, "8-10", 90], ["Lat Pulldown", 1, 3, "10-12", 60], ["Plank", 1, 3, "40s", 45],
              ["Romanian Deadlift", 2, 3, "8-10", 90], ["Overhead Press", 2, 3, "8-10", 90], ["Seated Cable Row", 2, 3, "10-12", 60],
              ["Leg Press", 3, 3, "12", 75], ["Incline Dumbbell Press", 3, 3, "10", 75], ["Rowing Machine", 3, 1, "10 min", 0]] },
    { name: "Hypertrophy Push/Pull/Legs", goal: "Muscle gain", level: "Intermediate", days: 3, trainer: "st_tr1", desc: "Classic PPL split for size.",
      items: [["Bench Press", 1, 4, "6-8", 120], ["Incline Dumbbell Press", 1, 3, "8-12", 90], ["Lateral Raise", 1, 4, "12-15", 45], ["Triceps Pushdown", 1, 3, "12", 45],
              ["Deadlift", 2, 3, "5", 150], ["Pull-up", 2, 4, "AMRAP", 90], ["Single-arm DB Row", 2, 3, "10", 60], ["Barbell Curl", 2, 3, "10-12", 45],
              ["Barbell Back Squat", 3, 4, "6-8", 120], ["Hip Thrust", 3, 3, "10", 90], ["Leg Curl", 3, 3, "12", 60], ["Walking Lunges", 3, 2, "12/leg", 60]] },
    { name: "Fat-Loss Conditioning", goal: "Fat loss", level: "Intermediate", days: 4, trainer: "st_tr3", desc: "Circuits + steady cardio.",
      items: [["Kettlebell Swing", 1, 4, "20", 30], ["Burpee", 1, 4, "12", 30], ["Assault Bike", 1, 6, "30s on/30s off", 0],
              ["Thruster", 2, 4, "12", 45], ["Push-up", 2, 4, "15", 30], ["Incline Treadmill Walk", 2, 1, "25 min", 0],
              ["Walking Lunges", 3, 3, "16", 45], ["Cable Woodchop", 3, 3, "12/side", 30], ["Rowing Machine", 4, 5, "500 m", 60]] },
    { name: "Ladies Tone & Strength", goal: "Toning", level: "Beginner", days: 3, trainer: "st_tr4", desc: "Glutes, posture and core focus.",
      items: [["Hip Thrust", 1, 4, "12", 60], ["Walking Lunges", 1, 3, "10/leg", 60], ["Face Pull", 1, 3, "15", 45],
              ["Romanian Deadlift", 2, 3, "10", 75], ["Lat Pulldown", 2, 3, "12", 60], ["Plank", 2, 3, "45s", 30],
              ["Leg Press", 3, 3, "15", 60], ["Lateral Raise", 3, 3, "15", 45], ["Incline Treadmill Walk", 3, 1, "20 min", 0]] },
  ];
  const workoutPlans: Record<string, unknown>[] = [];
  const workoutItems: Record<string, unknown>[] = [];
  const addPlan = (t: (typeof templates)[number], memberId: string | null) => {
    const pid = id("wp");
    workoutPlans.push({ id: pid, name: t.name, goal: t.goal, level: t.level, description: t.desc, daysPerWeek: t.days, trainerId: t.trainer, memberId, createdAt: addDays(today, -int(5, 90)) });
    t.items.forEach(([name, day, sets, reps, restSeconds], i) => workoutItems.push({ id: id("wi"), workoutPlanId: pid, exerciseId: ex(name), day, sets, reps, restSeconds, order: i }));
    return pid;
  };
  templates.forEach((t) => addPlan(t, null));

  const workoutLogs: Record<string, unknown>[] = [];
  const committed = activeMembers.filter((m) => m.status === "ACTIVE").slice(0, 40);
  committed.forEach((m, i) => {
    const member = members.find((x) => x.id === m.id)!;
    const tpl = member.gender === "FEMALE" && chance(0.6) ? templates[3]! : templates[i % 3]!;
    const pid = addPlan(tpl, m.id);
    const perWeek = int(1, 5);
    for (let d = 29; d >= 0; d--) {
      if (!chance(perWeek / 7)) continue;
      workoutLogs.push({ id: id("wl"), memberId: m.id, workoutPlanId: pid, durationMin: int(35, 95), calories: int(220, 780), notes: null, loggedAt: at(addDays(today, -d), int(6, 21), int(0, 59)) });
    }
  });

  // ── Classes (this week) ────────────────────────────────────────────────────
  const classTemplates = [
    { name: "HIIT Burn", trainer: "st_tr3", branch: "br_lusail", room: "Studio A", hour: 7, dur: 45, cap: 18 },
    { name: "Power Yoga", trainer: "st_tr2", branch: "br_pearl", room: "Zen Studio", hour: 8, dur: 60, cap: 14 },
    { name: "Ladies Pilates", trainer: "st_tr4", branch: "br_lusail", room: "Studio B", hour: 10, dur: 50, cap: 12 },
    { name: "Boxing Fundamentals", trainer: "st_tr3", branch: "br_lusail", room: "Fight Zone", hour: 18, dur: 60, cap: 16 },
    { name: "Strength Lab", trainer: "st_tr1", branch: "br_pearl", room: "Platform Area", hour: 19, dur: 60, cap: 10 },
    { name: "Spin & Sweat", trainer: "st_tr2", branch: "br_pearl", room: "Cycle Room", hour: 20, dur: 45, cap: 20 },
  ];
  const classes: Record<string, unknown>[] = [];
  const bookings: Record<string, unknown>[] = [];
  for (let d = -1; d <= 6; d++) {
    const day = addDays(today, d);
    classTemplates.forEach((c, i) => {
      if ((d + i) % 3 === 0 && i > 1) return; // not every class every day
      const cid = id("cls");
      const startsAt = at(day, c.hour, i % 2 ? 30 : 0);
      classes.push({ id: cid, name: c.name, description: null, trainerId: c.trainer, branchId: c.branch, room: c.room, startsAt, durationMin: c.dur, capacity: c.cap });
      const n = Math.min(c.cap, int(Math.floor(c.cap * 0.3), c.cap));
      const pool = activeMembers.filter((m) => m.status === "ACTIVE");
      const used = new Set<string>();
      for (let k = 0; k < n; k++) {
        const m = pick(pool);
        if (used.has(m.id)) continue;
        used.add(m.id);
        const past = startsAt < now;
        bookings.push({ id: id("bk"), classId: cid, memberId: m.id, status: past ? (chance(0.88) ? "ATTENDED" : "NO_SHOW") : "BOOKED" });
      }
    });
  }

  // ── Leads ─────────────────────────────────────────────────────────────────
  const leadNames = ["Faisal Al-Hajri", "Sophie Martin", "Abdulrahman Saleh", "Neha Kapoor", "Luis Garcia", "Huda Al-Marri", "Kevin O'Brien", "Amal Youssef", "Ravi Kumar", "Jana Novak", "Majed Al-Kaabi", "Grace Lim", "Waleed Hamdan", "Zainab Ali", "Chris Evans", "Noor Al-Emadi", "Pedro Alves", "Latifa Al-Suwaidi"];
  const leads = leadNames.map((name, i) => {
    const status = weighted<string>([["NEW", 5], ["CONTACTED", 5], ["TRIAL", 3], ["LOST", 2]]);
    return {
      id: id("lead"), name, phone: phone(), email: chance(0.5) ? `${name.split(" ")[0]!.toLowerCase()}@outlook.com` : null,
      source: pick(["WALK_IN", "INSTAGRAM", "WHATSAPP", "WEBSITE", "REFERRAL"]), status,
      interest: pick(["Annual membership", "Personal training", "Ladies classes", "Corporate package", "Quarterly membership", "Boxing classes"]),
      notes: chance(0.4) ? pick(["Called, asked to follow up next week", "Wants a free trial on Saturday", "Comparing with another gym in West Bay", "Interested in couples plan"]) : null,
      followUpAt: status === "LOST" ? null : addDays(today, int(-2, 6)),
      assignedToId: i % 2 ? "st_rec1" : "st_manager",
      createdAt: addDays(today, -int(0, 25)),
    };
  });

  // ── Expenses (last 12 months) ──────────────────────────────────────────────
  const expenses: Record<string, unknown>[] = [];
  for (let mth = 11; mth >= 0; mth--) {
    const base = addDays(today, -mth * 30);
    const monthStart = addDays(base, -int(0, 3));
    for (const b of branches) {
      const big = b.id === "br_pearl";
      expenses.push({ id: id("exp"), category: "Rent", description: `${b.name} monthly rent`, amount: big ? 18000 : 12000, method: "BANK_TRANSFER", spentAt: monthStart, branchId: b.id, createdById: "st_owner" });
      expenses.push({ id: id("exp"), category: "Salaries", description: `${b.name} payroll`, amount: big ? 16000 : 11000, method: "BANK_TRANSFER", spentAt: addDays(monthStart, 1), branchId: b.id, createdById: "st_owner" });
      expenses.push({ id: id("exp"), category: "Utilities", description: "Kahramaa electricity & water", amount: int(1800, 3000), method: "BANK_TRANSFER", spentAt: addDays(monthStart, 5), branchId: b.id, createdById: "st_manager" });
      if (chance(0.6)) expenses.push({ id: id("exp"), category: pick(["Maintenance", "Supplies", "Marketing", "Equipment"]), description: pick(["Treadmill belt replacement", "Cleaning supplies", "Instagram ads", "New dumbbell set", "Towels restock"]), amount: int(500, 3000), method: pick(["CARD", "BANK_TRANSFER", "CASH"]), spentAt: addDays(monthStart, int(6, 25)), branchId: b.id, createdById: "st_manager" });
    }
  }

  const counters = [
    { key: "member", value: 1000 + MEMBER_COUNT },
    { key: "invoice", value: invoice },
  ];

  return {
    settings, branches, staff, plans, members, memberships,
    payments: payments.map(({ branchId: _b, ...p }) => ({ cashSessionId: null, ...p })),
    devices, attendance, events, cashSessions, exercises, workoutPlans, workoutItems, workoutLogs,
    classes, bookings, leads, expenses, counters,
  };
}
