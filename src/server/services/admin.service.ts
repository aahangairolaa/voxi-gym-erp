/**
 * VOXI platform admin (SUPER_ADMIN only): create and manage the gyms that use VOXI.
 * The VOXI team sees each gym's size and activity, never its members' details.
 */
import bcrypt from "bcryptjs";
import { Prisma, type GymStatus, type SubscriptionPlan } from "@prisma/client";
import type { z } from "zod";
import { addDays, addMonths } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../http";
import { randomToken } from "../crypto";
import { EXERCISE_LIBRARY, STARTER_PLANS } from "../gym-defaults";
import { quote } from "@/lib/pricing";
import type { createGymSchema, updateGymSchema } from "../validators";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "gym"
  );
}

async function uniqueSlug(base: string) {
  let slug = base;
  for (let i = 2; await db.gym.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function listGyms() {
  const since = addDays(new Date(), -30);
  const gyms = await db.gym.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      brandColor: true,
      phone: true,
      email: true,
      plan: true,
      status: true,
      trialEndsAt: true,
      billingMonths: true,
      extraBranches: true,
      paidUntil: true,
      planRequest: true,
      platformNotes: true,
      createdAt: true,
      _count: { select: { members: true, staff: true, branches: true } },
      staff: { where: { role: "OWNER" }, select: { name: true, email: true, lastLoginAt: true }, take: 1 },
    },
  });
  const [revenue, active, lastLogins] = await Promise.all([
    db.payment.groupBy({ by: ["gymId"], where: { status: "PAID", paidAt: { gte: since } }, _sum: { amount: true } }),
    db.membership.groupBy({ by: ["gymId"], where: { status: "ACTIVE", endDate: { gte: new Date() } }, _count: { _all: true } }),
    db.staff.groupBy({ by: ["gymId"], where: { gymId: { not: null } }, _max: { lastLoginAt: true } }),
  ]);
  const rev = new Map(revenue.map((r) => [r.gymId, r._sum.amount ?? 0]));
  const act = new Map(active.map((a) => [a.gymId, a._count._all]));
  const seen = new Map(lastLogins.map((l) => [l.gymId, l._max.lastLoginAt]));

  const rows = gyms.map(({ _count, staff, ...g }) => ({
    ...g,
    owner: staff[0] ?? null,
    members: _count.members,
    staffCount: _count.staff,
    branches: _count.branches,
    activeMemberships: act.get(g.id) ?? 0,
    revenue30d: rev.get(g.id) ?? 0,
    lastActiveAt: seen.get(g.id) ?? null,
  }));
  const paying = rows.filter((g) => g.status === "ACTIVE");
  return {
    gyms: rows,
    stats: {
      total: rows.length,
      active: paying.length,
      trial: rows.filter((g) => g.status === "TRIAL").length,
      suspended: rows.filter((g) => g.status === "SUSPENDED").length,
      members: rows.reduce((s, g) => s + g.members, 0),
      // Monthly recurring revenue: each paying gym's subscription spread over its term.
      mrr: paying.reduce((s, g) => s + quote(g.billingMonths, g.extraBranches).perMonth, 0),
      requests: rows.filter((g) => g.planRequest).length,
    },
  };
}

/** Create a gym with its owner account, a first branch and starter data. */
type CreateGymInput = Omit<z.infer<typeof createGymSchema>, "ownerPassword"> &
  ({ ownerPassword: string } | { ownerPasswordHash: string; ownerGoogleId?: string | null; ownerMicrosoftId?: string | null });

export async function createGym(input: CreateGymInput) {
  const email = input.ownerEmail.toLowerCase();
  if (await db.staff.findUnique({ where: { email }, select: { id: true } })) {
    throw new ApiError(409, "That email already has a VOXI account. Sign in instead, or use a different email.");
  }
  const slug = await uniqueSlug(slugify(input.slug || input.name));
  const passwordHash = "ownerPassword" in input ? await bcrypt.hash(input.ownerPassword, 10) : input.ownerPasswordHash;
  const googleId = "ownerGoogleId" in input ? input.ownerGoogleId ?? null : null;
  const microsoftId = "ownerMicrosoftId" in input ? input.ownerMicrosoftId ?? null : null;

  return db.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: {
        name: input.name,
        slug,
        phone: input.phone,
        email: input.email ?? email,
        address: input.address,
        plan: input.plan as SubscriptionPlan,
        status: input.status as GymStatus,
        trialEndsAt: input.status === "TRIAL" ? addDays(new Date(), input.trialDays) : null,
        billingMonths: input.billingMonths,
        extraBranches: input.extraBranches,
        paidUntil: input.status === "ACTIVE" ? addMonths(new Date(), input.billingMonths) : null,
        whatsappVerifyToken: randomToken(12),
      },
    });
    await tx.branch.create({ data: { gymId: gym.id, name: input.branchName || "Main branch", address: input.address, phone: input.phone } });
    await tx.staff.create({
      data: { gymId: gym.id, name: input.ownerName, email, passwordHash, googleId, microsoftId, role: "OWNER", branchId: null, phone: input.phone },
    });
    await tx.plan.createMany({ data: STARTER_PLANS.map((p) => ({ ...p, gymId: gym.id })) });
    await tx.exercise.createMany({ data: EXERCISE_LIBRARY.map(([name, muscleGroup, equipment]) => ({ gymId: gym.id, name, muscleGroup, equipment })) });
    return { id: gym.id, name: gym.name, slug: gym.slug, ownerEmail: email };
  });
}

export async function updateGym(id: string, input: z.infer<typeof updateGymSchema>) {
  const gym = await db.gym.findUnique({ where: { id }, select: { id: true, status: true, planRequest: true } });
  if (!gym) throw new ApiError(404, "Gym not found.");
  // "Activate request": copy what the gym asked for on its Billing page.
  const req = input.applyRequest ? (gym.planRequest as { months?: number; extraBranches?: number } | null) : null;
  if (input.applyRequest && !req) throw new ApiError(400, "This gym has no pending plan request.");
  const months = req?.months ?? input.billingMonths;
  return db.gym.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.status ? { status: input.status as GymStatus } : {}),
      ...(input.trialEndsAt !== undefined ? { trialEndsAt: input.trialEndsAt } : {}),
      ...(input.platformNotes !== undefined ? { platformNotes: input.platformNotes } : {}),
      ...(months !== undefined ? { billingMonths: months } : {}),
      ...((req?.extraBranches ?? input.extraBranches) !== undefined ? { extraBranches: req?.extraBranches ?? input.extraBranches } : {}),
      ...(input.paidUntil !== undefined ? { paidUntil: input.paidUntil } : {}),
      ...(req ? { status: "ACTIVE" as GymStatus, paidUntil: addMonths(new Date(), months ?? 12), planRequest: Prisma.DbNull } : {}),
    },
    select: { id: true, name: true, status: true, trialEndsAt: true, billingMonths: true, extraBranches: true, paidUntil: true, planRequest: true, platformNotes: true },
  });
}
