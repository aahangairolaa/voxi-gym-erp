/**
 * A gym's VOXI subscription as the gym sees it (Billing page), and plan requests.
 * VOXI doesn't charge cards online yet: the gym picks a plan, the VOXI team sends
 * an invoice and activates it from /admin once paid.
 */
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { checkout, quote } from "@/lib/pricing";
import { db } from "../db";
import type { planRequestSchema } from "../validators";
import { findUsablePromo } from "./promo.service";

export type PlanRequest = {
  months: number;
  extraBranches: number;
  /** Subscription for the term (plan + branches). */
  total: number;
  entrances?: number;
  onboarding?: boolean;
  /** One-time services (biometric entrances, onboarding), after their discounts. */
  oneTime?: number;
  /** Promo code used, and what it took off the first invoice. */
  promoCode?: string | null;
  promoDiscount?: number;
  /** Multi-branch / multi-entrance discounts and free onboarding. */
  volumeDiscount?: number;
  /** What the first invoice comes to, after every discount. */
  totalToday?: number;
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
  const promo = input.promoCode?.trim() ? await findUsablePromo(input.promoCode, input.months) : null;
  const c = checkout(input.months, input.extraBranches, input.entrances, input.onboarding, promo);
  const q = c.quote;
  const request: PlanRequest = {
    months: q.months,
    extraBranches: q.extraBranches,
    total: q.total,
    entrances: c.oneTime.entrances.length,
    onboarding: input.onboarding && q.months !== 12,
    oneTime: c.oneTime.total,
    promoCode: c.promo?.code ?? null,
    promoDiscount: c.promoDiscount,
    volumeDiscount: c.volumeDiscount,
    totalToday: c.totalToday,
    requestedAt: new Date().toISOString(),
    requestedBy: by,
  };
  await db.gym.update({ where: { id: gymId }, data: { planRequest: request as unknown as Prisma.InputJsonValue } });
  return { request, quote: q, oneTime: c.oneTime.total, totalToday: c.totalToday };
}

export async function cancelPlanRequest(gymId: string) {
  await db.gym.update({ where: { id: gymId }, data: { planRequest: Prisma.DbNull } });
}
