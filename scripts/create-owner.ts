/**
 * Create the first OWNER account on an empty (production) database.
 *   npm run create-owner -- owner@yourgym.qa "StrongPassword123" "Your Name" "Main Branch"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const [email, password, name = "Gym Owner", branchName = "Main Branch"] = process.argv.slice(2);

async function main() {
  if (!email || !password || password.length < 8) {
    console.log('Usage: npm run create-owner -- owner@yourgym.qa "Password123" "Your Name" "Branch name"');
    process.exit(1);
  }
  await db.gymSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
  if ((await db.branch.count()) === 0) await db.branch.create({ data: { name: branchName } });
  const owner = await db.staff.create({
    data: { email: email.toLowerCase(), name, role: "OWNER", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`✓ Owner ${owner.email} created. Sign in, then add plans, staff and members.`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
