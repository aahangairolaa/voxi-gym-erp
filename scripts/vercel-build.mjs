/**
 * Vercel build (npm run vercel-build).
 *  - With DATABASE_URL: create/update the tables (safely), create the first VOXI admin, then build.
 *  - Without it: just build — the website and pricing pages work, sign-in shows "launching soon".
 *
 * Safety: `prisma db push` refuses changes that could lose data. The one exception we allow
 * automatically is adding a UNIQUE rule to a column, because new columns start empty (NULLs never
 * clash). Any other warning (dropping a column, changing a type…) still stops the build.
 */
import { execSync, spawnSync } from "node:child_process";
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

function dbPush() {
  const r = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], { encoding: "utf8" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  process.stdout.write(out);
  if (r.status === 0) return;
  const warnings = out.split("\n").filter((l) => l.trim().startsWith("•"));
  const onlyUnique = warnings.length > 0 && warnings.every((w) => /A unique constraint covering the columns .* will be added/.test(w));
  if (!onlyUnique) throw new Error("prisma db push failed (see the output above). Nothing was changed.");
  console.log("[vercel-build] Only new unique rules to add; applying them.");
  run("npx prisma db push --skip-generate --accept-data-loss");
}

run("npx prisma generate");
if (process.env.DATABASE_URL) {
  if (!process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
  dbPush();
  run("npx tsx scripts/bootstrap-admin.ts");
} else {
  console.log("[vercel-build] No DATABASE_URL yet — skipping database setup. Add it in Vercel → Settings → Environment Variables, then redeploy.");
}
run("npx next build");
