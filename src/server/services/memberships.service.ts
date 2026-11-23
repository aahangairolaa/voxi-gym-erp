import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { addDays, daysBetween, endOfDay, startOfDay } from "@/lib/dates";
import { db, type Tx } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import type { sellMembershipSchema } from "../validators";
import { daysLeft, effectiveStatus, fullName, getWarnDays, ownedOr404, checkSeller } from "./_shared";
import { createPaymentTx } from "./payments.service";

type SellInput = z.infer<typeof sellMembershipSchema>;

/**
 * Sell (or renew) a plan for a member, and record the payment.
 * Renewals are chained: if the member still has days left, the new
 * membership starts the day after the current one ends.
 */
export async function sellMembershipTx(tx: Tx, input: SellInput, session: GymSession) {
  const plan = await tx.plan.findFirst({ where: { id: input.planId, gymId: session.gymId } });
  if (!plan || !plan.isActive) throw new ApiError(400, "That plan is not available.");

  let start = input.startDate ? startOfDay(input.startDate) : startOfDay();
  if (!input.startDate) {
    const running = await tx.membership.findFirst({
      where: { gymId: session.gymId, memberId: input.memberId, status: { in: ["ACTIVE", "FROZEN"] }, endDate: { gte: start } },
      orderBy: { endDate: "desc" },
    });
    if (running) start = startOfDay(addDays(running.endDate, 1));
  }
  const end = endOfDay(addDays(start, plan.durationDays - 1));

  if (input.discount > plan.price) throw new ApiError(400, "Discount can't be more than the plan price.");
  const due = plan.price - input.discount;
  if (input.amountPaid > due) throw new ApiError(400, `Amount paid is more than the amount due (QAR ${due}).`);

  const soldById = await checkSeller(session.gymId, input.soldById, tx);
  const membership = await tx.membership.create({
    data: {
      gymId: session.gymId,
      soldById,
      memberId: input.memberId,
      planId: plan.id,
      startDate: start,
      endDate: end,
      price: plan.price,
      discount: input.discount,
      notes: input.notes,
    },
  });

  const payment =
    input.amountPaid > 0
      ? await createPaymentTx(
          tx,
          {
            memberId: input.memberId,
            membershipId: membership.id,
            amount: input.amountPaid,
            method: input.paymentMethod,
            description: `${plan.name} membership`,
            reference: input.reference,
            soldById,
          },
          session,
        )
      : null;

  return { membership, payment };
}

export async function sellMembership(input: SellInput, session: GymSession) {
  const member = ownedOr404(
    await db.member.findFirst({ where: { id: input.memberId, gymId: session.gymId }, select: { id: true, firstName: true, lastName: true } }),
    "Member",
  );
  const result = await db.$transaction((tx) => sellMembershipTx(tx, input, session));
  return { ...result, memberName: fullName(member) };
}

export async function listMemberships(gymId: string, opts: { status?: string | null; search?: string | null }) {
  const warnDays = await getWarnDays(gymId);
  const where: Prisma.MembershipWhereInput = opts.search
    ? {
        gymId,
        member: {
          OR: [
            { firstName: { contains: opts.search, mode: "insensitive" } },
            { lastName: { contains: opts.search, mode: "insensitive" } },
            { code: { contains: opts.search, mode: "insensitive" } },
          ],
        },
      }
    : { gymId };

  const rows = await db.membership.findMany({
    where,
    orderBy: { endDate: "desc" },
    take: 1000,
    include: {
      member: { select: { id: true, code: true, firstName: true, lastName: true, phone: true } },
      plan: { select: { id: true, name: true, color: true, freezeDays: true } },
      payments: { where: { status: "PAID" }, select: { amount: true } },
    },
  });

  const mapped = rows.map((m) => {
    const paid = m.payments.reduce((s, p) => s + p.amount, 0);
    const status = m.status === "CANCELLED" ? "CANCELLED" : effectiveStatus(m, warnDays);
    return {
      id: m.id,
      member: { id: m.member.id, code: m.member.code, name: fullName(m.member), phone: m.member.phone },
      plan: m.plan,
      startDate: m.startDate,
      endDate: m.endDate,
      status,
      daysLeft: daysLeft(m.endDate),
      price: m.price,
      discount: m.discount,
      paid,
      balance: Math.max(0, m.price - m.discount - paid),
      freezeDaysUsed: m.freezeDaysUsed,
      frozenAt: m.frozenAt,
    };
  });

  const summary = {
    active: mapped.filter((m) => m.status === "ACTIVE").length,
    expiring: mapped.filter((m) => m.status === "EXPIRING").length,
    frozen: mapped.filter((m) => m.status === "FROZEN").length,
    outstanding: mapped.filter((m) => m.status !== "CANCELLED").reduce((s, m) => s + m.balance, 0),
  };

  const filtered = opts.status && opts.status !== "ALL" ? mapped.filter((m) => m.status === opts.status) : mapped;
  return { memberships: filtered, summary };
}

export async function membershipAction(gymId: string, id: string, action: "freeze" | "unfreeze" | "cancel") {
  const m = ownedOr404(
    await db.membership.findFirst({ where: { id, gymId }, include: { plan: true, member: { select: { firstName: true, lastName: true } } } }),
    "Membership",
  );
  const label = `${m.plan.name} for ${fullName(m.member)}`;

  if (action === "cancel") {
    await db.membership.update({ where: { id }, data: { status: "CANCELLED", frozenAt: null } });
    return { label };
  }

  if (action === "freeze") {
    if (m.status !== "ACTIVE" || m.endDate < new Date()) throw new ApiError(400, "Only an active membership can be frozen.");
    const remaining = m.plan.freezeDays - m.freezeDaysUsed;
    if (remaining <= 0) throw new ApiError(400, `This plan allows ${m.plan.freezeDays} freeze days and they are used up.`);
    await db.membership.update({ where: { id }, data: { status: "FROZEN", frozenAt: new Date() } });
    return { label };
  }

  // unfreeze → push the end date forward by the number of days it was frozen
  if (m.status !== "FROZEN" || !m.frozenAt) throw new ApiError(400, "This membership is not frozen.");
  const frozenDays = Math.max(0, daysBetween(m.frozenAt, new Date()));
  await db.membership.update({
    where: { id },
    data: {
      status: "ACTIVE",
      frozenAt: null,
      freezeDaysUsed: m.freezeDaysUsed + frozenDays,
      endDate: addDays(m.endDate, frozenDays),
    },
  });
  return { label, frozenDays };
}
