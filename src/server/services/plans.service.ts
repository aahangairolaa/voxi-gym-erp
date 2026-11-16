import type { z } from "zod";
import { startOfDay } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../http";
import type { planSchema } from "../validators";

type PlanInput = z.infer<typeof planSchema>;

export async function listPlans(includeInactive = true) {
  const today = startOfDay();
  const plans = await db.plan.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    include: {
      _count: { select: { memberships: { where: { status: "ACTIVE", endDate: { gte: today } } } } },
    },
  });
  return plans.map(({ _count, ...p }) => ({ ...p, activeMembers: _count.memberships }));
}

export async function createPlan(input: PlanInput) {
  return db.plan.create({ data: input });
}

export async function updatePlan(id: string, input: PlanInput) {
  return db.plan.update({ where: { id }, data: input });
}

/** Plans that were ever sold are archived (hidden) instead of deleted, to keep history. */
export async function deletePlan(id: string) {
  const used = await db.membership.count({ where: { planId: id } });
  if (used > 0) {
    await db.plan.update({ where: { id }, data: { isActive: false } });
    return { archived: true };
  }
  const plan = await db.plan.findUnique({ where: { id } });
  if (!plan) throw new ApiError(404, "Plan not found.");
  await db.plan.delete({ where: { id } });
  return { deleted: true };
}
