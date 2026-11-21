/**
 * Fills the database with demo data.
 *   npm run db:seed        (adds data — run on an EMPTY database)
 *   npm run db:reset       (wipes everything, then seeds)
 *
 * Creates two gyms to show that each gym only ever sees its own data:
 *   • VOXI Fitness Club   — the full demo (2 branches, 240 members, devices …)
 *   • Pulse Ladies Studio — a small second gym
 * plus a VOXI platform admin account that manages gyms on /admin.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { addDays, endOfDay, startOfDay } from "../src/lib/dates";
import { EXERCISE_LIBRARY, STARTER_PLANS } from "../src/server/gym-defaults";
import { DEMO_DEVICE_KEYS, DEMO_GYM_ID, generateSeedData } from "./seed-data";

const db = new PrismaClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
async function insert(label: string, rows: any[], create: (data: any[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += 1000) await create(rows.slice(i, i + 1000));
  console.log(`  ✓ ${label.padEnd(18)} ${rows.length}`);
}
const tag = <T extends object>(rows: T[], gymId = DEMO_GYM_ID) => rows.map((r) => ({ ...r, gymId }));

async function main() {
  const existing = await db.staff.count();
  if (existing > 0) {
    console.log("Database already has data. Use `npm run db:reset` to wipe and re-seed.");
    return;
  }

  const password = process.env.SEED_PASSWORD || "voxi1234";
  const passwordHash = await bcrypt.hash(password, 10);
  const data = generateSeedData(passwordHash);
  console.log("Seeding VOXI demo data…");

  // ── Gym 1: VOXI Fitness Club ──────────────────────────────────────────────
  await db.gym.create({ data: data.gym });
  await insert("branches", tag(data.branches), (d) => db.branch.createMany({ data: d }));
  await insert("staff", tag(data.staff), (d) => db.staff.createMany({ data: d }));
  await insert("plans", tag(data.plans), (d) => db.plan.createMany({ data: d }));
  await insert("members", tag(data.members), (d) => db.member.createMany({ data: d }));
  await insert("memberships", tag(data.memberships), (d) => db.membership.createMany({ data: d }));
  await insert("cash sessions", tag(data.cashSessions), (d) => db.cashSession.createMany({ data: d }));
  await insert("payments", tag(data.payments), (d) => db.payment.createMany({ data: d }));
  await insert("devices", tag(data.devices), (d) => db.biometricDevice.createMany({ data: d }));
  await insert("attendance", tag(data.attendance), (d) => db.attendance.createMany({ data: d }));
  await insert("scan events", tag(data.events), (d) => db.biometricEvent.createMany({ data: d }));
  await insert("exercises", tag(data.exercises), (d) => db.exercise.createMany({ data: d }));
  await insert("workout plans", tag(data.workoutPlans), (d) => db.workoutPlan.createMany({ data: d }));
  await insert("workout items", data.workoutItems, (d) => db.workoutItem.createMany({ data: d }));
  await insert("workout logs", tag(data.workoutLogs), (d) => db.workoutLog.createMany({ data: d }));
  await insert("classes", tag(data.classes), (d) => db.gymClass.createMany({ data: d }));
  await insert("bookings", data.bookings, (d) => db.classBooking.createMany({ data: d, skipDuplicates: true }));
  await insert("leads", tag(data.leads), (d) => db.lead.createMany({ data: d }));
  await insert("expenses", tag(data.expenses), (d) => db.expense.createMany({ data: d }));
  await insert("counters", tag(data.counters), (d) => db.counter.createMany({ data: d }));
  await insert("whatsapp log", tag(data.whatsappMessages), (d) => db.whatsAppMessage.createMany({ data: d }));
  await insert("activity log", tag(data.auditLogs), (d) => db.auditLog.createMany({ data: d }));

  // ── Gym 2: Pulse Ladies Studio (small, to prove gyms are separate) ───────
  await seedSecondGym(passwordHash);

  // ── VOXI platform admin (no gym) ──────────────────────────────────────────
  await db.staff.create({
    data: { id: "st_voxi_admin", name: "VOXI Team", email: "admin@voxi.qa", role: "SUPER_ADMIN", passwordHash, gymId: null, branchId: null },
  });
  console.log("  ✓ VOXI admin account");

  console.log(`
Done! Sign in at http://localhost:3000/login (password for all: ${password})

  VOXI Fitness Club
    owner@voxi.qa         Owner (sees everything)
    manager@voxi.qa       Manager
    reception@voxi.qa     Reception (The Pearl)
    trainer@voxi.qa       Trainer

  Pulse Ladies Studio (a second gym — sees only its own data)
    pulse@voxi.qa         Owner

  VOXI platform
    admin@voxi.qa         VOXI admin (manage all gyms on /admin)

Demo biometric device key (The Pearl turnstile):
  ${DEMO_DEVICE_KEYS.pearl}
Try it:  npm run biometric:simulate -- 1001
`);
}

async function seedSecondGym(passwordHash: string) {
  const gymId = "gym_pulse";
  const today = startOfDay();
  await db.gym.create({
    data: {
      id: gymId,
      name: "Pulse Ladies Studio",
      slug: "pulse-ladies",
      phone: "+974 4411 2200",
      email: "hello@pulse.qa",
      address: "Marina District, Lusail City",
      brandColor: "#DB2777",
      instagram: "@pulse.ladies",
      openingHours: "Sat–Thu 6am–10pm",
      plan: "PROFESSIONAL",
      status: "TRIAL",
      trialEndsAt: addDays(today, 10),
      whatsappVerifyToken: randomBytes(12).toString("base64url"),
    },
  });
  await db.branch.create({ data: { id: "br_pulse", gymId, name: "Lusail Marina", address: "Marina District, Lusail City" } });
  await db.staff.createMany({
    data: [
      { id: "st_pulse_owner", gymId, name: "Dana Al-Ansari", email: "pulse@voxi.qa", role: "OWNER", passwordHash, branchId: null, phone: "+974 5511 0001" },
      { id: "st_pulse_rec", gymId, name: "Mae Santos", email: "pulse.reception@voxi.qa", role: "RECEPTION", passwordHash, branchId: "br_pulse", phone: "+974 5511 0002" },
    ],
  });
  await db.plan.createMany({ data: STARTER_PLANS.map((p, i) => ({ ...p, id: `pl_pulse_${i}`, gymId })) });
  await db.exercise.createMany({ data: EXERCISE_LIBRARY.map(([name, muscleGroup, equipment]) => ({ gymId, name, muscleGroup, equipment })) });

  const names = ["Aisha Al-Khater", "Sara Haddad", "Maryam Al-Marri", "Priya Nair", "Lina Saleh", "Emma Clarke", "Noora Al-Thani", "Fatima Rahman", "Reem Al-Kuwari", "Maria Santos", "Hessa Al-Naimi", "Dana Khoury"];
  let invoice = 0;
  for (let i = 0; i < names.length; i++) {
    const [firstName, ...rest] = names[i]!.split(" ");
    const memberId = `mem_pulse_${i}`;
    const plan = i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0;
    const p = STARTER_PLANS[plan]!;
    const start = addDays(today, -((i * 7) % (p.durationDays - 2)) - 1);
    await db.member.create({
      data: {
        id: memberId,
        gymId,
        code: `M-${1001 + i}`, // same codes as gym 1 — allowed, codes are unique per gym
        firstName: firstName!,
        lastName: rest.join(" "),
        phone: `+974 66${String(10 + i).padStart(2, "0")} ${1000 + i * 37}`,
        gender: "FEMALE",
        branchId: "br_pulse",
        qrToken: randomBytes(18).toString("base64url"),
        createdAt: start,
        memberships: {
          create: {
            gymId,
            planId: `pl_pulse_${plan}`,
            startDate: start,
            endDate: endOfDay(addDays(start, p.durationDays - 1)),
            status: "ACTIVE",
            price: p.price,
          },
        },
      },
    });
    await db.payment.create({
      data: { gymId, memberId, invoiceNo: `PLS-${String(++invoice).padStart(6, "0")}`, amount: p.price, method: i % 2 ? "CARD" : "FAWRAN", status: "PAID", description: `${p.name} membership`, paidAt: start, receivedById: "st_pulse_rec" },
    });
    if (i % 2 === 0) {
      await db.attendance.create({ data: { gymId, memberId, branchId: "br_pulse", checkInAt: new Date(Date.now() - (i + 1) * 3_600_000), source: "MANUAL" } });
    }
  }
  await db.gym.update({ where: { id: gymId }, data: { invoicePrefix: "PLS" } });
  await db.counter.createMany({
    data: [
      { gymId, key: "member", value: 1000 + names.length },
      { gymId, key: "invoice", value: invoice },
    ],
  });
  console.log(`  ✓ second gym         Pulse Ladies Studio (${names.length} members)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
