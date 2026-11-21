/**
 * Vercel build (npm run vercel-build).
 *  - With DATABASE_URL: create/update the tables (safely), create the first VOXI admin, then build.
 *  - Without it: just build — the website and pricing pages work, sign-in shows "launching soon".
 */
import { execSync } from "node:child_process";
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

run("npx prisma generate");
if (process.env.DATABASE_URL) {
  if (!process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
  run("npx prisma db push --skip-generate");
  run("npx tsx scripts/bootstrap-admin.ts");
} else {
  console.log("[vercel-build] No DATABASE_URL yet — skipping database setup. Add it in Vercel → Settings → Environment Variables, then redeploy.");
}
run("npx next build");
