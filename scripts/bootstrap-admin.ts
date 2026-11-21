/**
 * Runs during each Vercel build (see "vercel-build" in package.json).
 * If VOXI_ADMIN_EMAIL and VOXI_ADMIN_PASSWORD are set and that account doesn't
 * exist yet, it creates your VOXI admin login (manages all gyms on /admin).
 * Safe to run every build: it never changes an existing account and never
 * prints the password. After the first successful deploy you can delete
 * VOXI_ADMIN_PASSWORD from Vercel's environment variables.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.env.VOXI_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.VOXI_ADMIN_PASSWORD;
const name = process.env.VOXI_ADMIN_NAME?.trim() || "VOXI Team";

async function main() {
  if (!email || !password) {
    console.log("[bootstrap] VOXI_ADMIN_EMAIL / VOXI_ADMIN_PASSWORD not set — skipping admin creation.");
    return;
  }
  if (password.length < 10) throw new Error("[bootstrap] VOXI_ADMIN_PASSWORD must be at least 10 characters.");
  const db = new PrismaClient();
  try {
    const existing = await db.staff.findUnique({ where: { email } });
    if (existing) {
      console.log(`[bootstrap] Admin ${email} already exists — nothing to do.`);
      return;
    }
    await db.staff.create({
      data: { email, name, role: "SUPER_ADMIN", gymId: null, passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`[bootstrap] Created VOXI admin ${email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
