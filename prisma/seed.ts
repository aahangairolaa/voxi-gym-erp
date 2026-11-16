/**
 * Fills the database with demo data.
 *   npm run db:seed        (adds data — run on an EMPTY database)
 *   npm run db:reset       (wipes everything, then seeds)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_DEVICE_KEYS, generateSeedData } from "./seed-data";

const db = new PrismaClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
async function insert(label: string, rows: any[], create: (data: any[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += 1000) await create(rows.slice(i, i + 1000));
  console.log(`  ✓ ${label.padEnd(16)} ${rows.length}`);
}

async function main() {
  const existing = await db.staff.count();
  if (existing > 0) {
    console.log("Database already has data. Use `npm run db:reset` to wipe and re-seed.");
    return;
  }

  const password = process.env.SEED_PASSWORD || "voxi1234";
  const data = generateSeedData(await bcrypt.hash(password, 10));
  console.log("Seeding VOXI demo data…");

  await db.gymSettings.create({ data: data.settings });
  await insert("branches", data.branches, (d) => db.branch.createMany({ data: d }));
  await insert("staff", data.staff, (d) => db.staff.createMany({ data: d }));
  await insert("plans", data.plans, (d) => db.plan.createMany({ data: d }));
  await insert("members", data.members, (d) => db.member.createMany({ data: d }));
  await insert("memberships", data.memberships, (d) => db.membership.createMany({ data: d }));
  await insert("cash sessions", data.cashSessions, (d) => db.cashSession.createMany({ data: d }));
  await insert("payments", data.payments, (d) => db.payment.createMany({ data: d }));
  await insert("devices", data.devices, (d) => db.biometricDevice.createMany({ data: d }));
  await insert("attendance", data.attendance, (d) => db.attendance.createMany({ data: d }));
  await insert("scan events", data.events, (d) => db.biometricEvent.createMany({ data: d }));
  await insert("exercises", data.exercises, (d) => db.exercise.createMany({ data: d }));
  await insert("workout plans", data.workoutPlans, (d) => db.workoutPlan.createMany({ data: d }));
  await insert("workout items", data.workoutItems, (d) => db.workoutItem.createMany({ data: d }));
  await insert("workout logs", data.workoutLogs, (d) => db.workoutLog.createMany({ data: d }));
  await insert("classes", data.classes, (d) => db.gymClass.createMany({ data: d }));
  await insert("bookings", data.bookings, (d) => db.classBooking.createMany({ data: d, skipDuplicates: true }));
  await insert("leads", data.leads, (d) => db.lead.createMany({ data: d }));
  await insert("expenses", data.expenses, (d) => db.expense.createMany({ data: d }));
  await insert("counters", data.counters, (d) => db.counter.createMany({ data: d }));

  console.log(`
Done! Sign in at http://localhost:3000/login with any of these (password: ${password}):
  owner@voxi.qa      Owner (sees everything)
  manager@voxi.qa    Manager
  reception@voxi.qa  Reception (The Pearl)
  trainer@voxi.qa    Trainer

Demo biometric device key (The Pearl turnstile):
  ${DEMO_DEVICE_KEYS.pearl}
Try it:  npm run biometric:simulate -- 1001
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
