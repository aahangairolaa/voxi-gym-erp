import { z } from "zod";
import { route, readBody, ApiError } from "@/server/http";
import { requireGym } from "@/server/auth";
import { db } from "@/server/db";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { audit } from "@/server/services/audit.service";

const clean = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 40);

/** GET /api/expenses/categories → built-in categories, the gym's own, and any used before */
export const GET = route(async () => {
  const s = await requireGym("expenses");
  const [gym, used] = await Promise.all([
    db.gym.findUniqueOrThrow({ where: { id: s.gymId }, select: { expenseCategories: true } }),
    db.expense.findMany({ where: { gymId: s.gymId }, distinct: ["category"], select: { category: true } }),
  ]);
  const custom = gym.expenseCategories;
  const all = [...EXPENSE_CATEGORIES.filter((c) => c !== "Other"), ...custom, ...used.map((u) => u.category)];
  const seen = new Set<string>();
  const unique = all.filter((c) => !seen.has(c.toLowerCase()) && !!seen.add(c.toLowerCase()));
  return { categories: [...unique, "Other"], custom };
});

/** PUT /api/expenses/categories { custom: ["Supplements stock", ...] } (owner/manager) */
export const PUT = route(async (req) => {
  const s = await requireGym("expenses");
  if (s.role !== "OWNER" && s.role !== "MANAGER") throw new ApiError(403, "Only the owner or a manager can change expense categories.");
  const { custom } = await readBody(req, z.object({ custom: z.array(z.string().max(60)).max(60) }));
  const builtIn = new Set(EXPENSE_CATEGORIES.map((c) => c.toLowerCase()));
  // Keep the first spelling of each, skip blanks and built-in names
  const seen = new Set<string>();
  const list = custom
    .map(clean)
    .filter((c) => c.length >= 2 && !builtIn.has(c.toLowerCase()) && !seen.has(c.toLowerCase()) && !!seen.add(c.toLowerCase()));
  await db.gym.update({ where: { id: s.gymId }, data: { expenseCategories: list } });
  await audit(s, "expense.categories", "Gym", s.gymId, `Expense categories: ${list.join(", ") || "built-in only"}`);
  return { custom: list };
});
