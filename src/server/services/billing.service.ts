/**
 * A gym's VOXI subscription as the gym sees it (Billing page), and plan requests.
 * VOXI doesn't charge cards online yet: the gym picks a plan, the VOXI team sends
 * an invoice and activates it from /admin once paid.
 */
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { addonsTotal, quote } from "@/lib/pricing";
import { db } from "../db";
import type { planRequestSchema } from "../validators";

export type PlanRequest = {
  months: number;
  extraBranches: number;
  /** Subscription for the term (plan + branches). */
  total: number;
  entrances?: number;
  onboarding?: boolean;
  /** One-time services (biometric entrances, onboarding). */
  oneTime?: number;
  requestedAt: string;
  requestedBy: string;
};

export async function getBilling(gymId: string) {
  const [gym, branches] = await Promise.all([
    db.gym.findUniqueOrThrow({
      where: { id: gymId },
      select: { name: true, status: true, trialEndsAt: true, billingMonths: true, extraBranches: true, paidUntil: true, planRequest: true },
    }),
    db.branch.count({ where: { gymId } }),
  ]);
  return {
    ...gym,
    planRequest: (gym.planRequest as PlanRequest | null) ?? null,
    branchesUsed: branches,
    current: gym.status === "ACTIVE" ? quote(gym.billingMonths, gym.extraBranches) : null,
  };
}

export async function requestPlan(gymId: string, by: string, input: z.infer<typeof planRequestSchema>) {
  const q = quote(input.months, input.extraBranches);
  const one = addonsTotal(q.months, input.entrances, input.onboarding);
  const request: PlanRequest = {
    months: q.months,
    extraBranches: q.extraBranches,
    total: q.total,
    entrances: input.entrances,
    onboarding: input.onboarding && q.months !== 12,
    oneTime: one.total,
    requestedAt: new Date().toISOString(),
    requestedBy: by,
  };
  await db.gym.update({ where: { id: gymId }, data: { planRequest: request as unknown as Prisma.InputJsonValue } });
  return { request, quote: q, oneTime: one.total };
}

export async function cancelPlanRequest(gymId: string) {
  await db.gym.update({ where: { id: gymId }, data: { planRequest: Prisma.DbNull } });
}
