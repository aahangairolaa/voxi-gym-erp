/**
 * Create a gym and its OWNER account on a (production) database.
 *   npm run create-owner -- owner@yourgym.qa "StrongPassword123" "Your Name" "Gym name" "Branch name"
 *
 * Create a VOXI platform admin (manages all gyms on /admin):
 *   npm run create-owner -- --admin you@voxi.qa "StrongPassword123" "Your Name"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { EXERCISE_LIBRARY, STARTER_PLANS } from "../src/server/gym-defaults";

const db = new PrismaClient();
const args = process.argv.slice(2);
const admin = args[0] === "--admin";
const [email, password, name = admin ? "VOXI Team" : "Gym Owner", gymName = "My Gym", branchName = "Main branch"] = admin ? args.slice(1) : args;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "gym";

async function main() {
  if (!email || !password || password.length < 8) {
    console.log('Usage: npm run create-owner -- owner@yourgym.qa "Password123" "Your Name" "Gym name" "Branch name"');
    console.log('   or: npm run create-owner -- --admin you@voxi.qa "Password123" "Your Name"');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  if (admin) {
    await db.staff.create({ data: { email: email.toLowerCase(), name, role: "SUPER_ADMIN", passwordHash, gymId: null } });
    console.log(`✓ VOXI admin ${email} created. Sign in and open /admin to add gyms.`);
    return;
  }

  let slug = slugify(gymName);
  for (let i = 2; await db.gym.findUnique({ where: { slug } }); i++) slug = `${slugify(gymName)}-${i}`;

  const gym = await db.$transaction(async (tx) => {
    const g = await tx.gym.create({ data: { name: gymName, slug, status: "ACTIVE", whatsappVerifyToken: randomBytes(12).toString("base64url") } });
    await tx.branch.create({ data: { gymId: g.id, name: branchName } });
    await tx.staff.create({ data: { gymId: g.id, email: email.toLowerCase(), name, role: "OWNER", passwordHash } });
    await tx.plan.createMany({ data: STARTER_PLANS.map((p) => ({ ...p, gymId: g.id })) });
    await tx.exercise.createMany({ data: EXERCISE_LIBRARY.map(([n, muscleGroup, equipment]) => ({ gymId: g.id, name: n, muscleGroup, equipment })) });
    return g;
  });
  console.log(`✓ Gym "${gym.name}" and owner ${email} created. Sign in, then adjust plans, staff and settings.`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
