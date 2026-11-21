import type { z } from "zod";
import { startOfDay } from "@/lib/dates";
import { db } from "../db";
import type { planSchema } from "../validators";
import { ownedOr404 } from "./_shared";

type PlanInput = z.infer<typeof planSchema>;

export async function listPlans(gymId: string, includeInactive = true) {
  const today = startOfDay();
  const plans = await db.plan.findMany({
    where: { gymId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    include: {
      _count: { select: { memberships: { where: { status: "ACTIVE", endDate: { gte: today } } } } },
    },
  });
  return plans.map(({ _count, ...p }) => ({ ...p, activeMembers: _count.memberships }));
}

export async function createPlan(gymId: string, input: PlanInput) {
  return db.plan.create({ data: { ...input, gymId } });
}

export async function updatePlan(gymId: string, id: string, input: PlanInput) {
  ownedOr404(await db.plan.findFirst({ where: { id, gymId }, select: { id: true } }), "Plan");
  return db.plan.update({ where: { id }, data: input });
}

/** Plans that were ever sold are archived (hidden) instead of deleted, to keep history. */
export async function deletePlan(gymId: string, id: string) {
  const plan = ownedOr404(await db.plan.findFirst({ where: { id, gymId } }), "Plan");
  const used = await db.membership.count({ where: { gymId, planId: id } });
  if (used > 0) {
    await db.plan.update({ where: { id }, data: { isActive: false } });
    return { archived: true, name: plan.name };
  }
  await db.plan.delete({ where: { id } });
  return { deleted: true, name: plan.name };
}
