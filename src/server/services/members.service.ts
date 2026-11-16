import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { startOfMonth } from "@/lib/dates";
import type { MemberStatus } from "@/lib/constants";
import { db } from "../db";
import { ApiError } from "../http";
import type { Session } from "../session-token";
import type { createMemberSchema, memberSchema } from "../validators";
import { effectiveStatus, daysLeft, fullName, getWarnDays, nextNumber } from "./_shared";
import { sellMembershipTx } from "./memberships.service";

type MemberInput = z.infer<typeof memberSchema>;
type CreateMemberInput = z.infer<typeof createMemberSchema>;

/** Build a search filter: every word must match one of the member's fields. */
function searchWhere(search?: string | null): Prisma.MemberWhereInput {
  if (!search?.trim()) return {};
  const terms = search.trim().split(/\s+/).slice(0, 4);
  return {
    AND: terms.map((t) => ({
      OR: [
        { firstName: { contains: t, mode: "insensitive" as const } },
        { lastName: { contains: t, mode: "insensitive" as const } },
        { code: { contains: t, mode: "insensitive" as const } },
        { phone: { contains: t } },
        { email: { contains: t, mode: "insensitive" as const } },
        { qid: { contains: t } },
      ],
    })),
  };
}

const currentMembershipInclude = {
  where: { status: { not: "CANCELLED" as const } },
  orderBy: { endDate: "desc" as const },
  take: 1,
  include: { plan: { select: { id: true, name: true, color: true } } },
};

export async function listMembers(opts: { search?: string | null; status?: string | null; branchId?: string | null }) {
  const warnDays = await getWarnDays();
  const members = await db.member.findMany({
    where: { ...searchWhere(opts.search), ...(opts.branchId ? { branchId: opts.branchId } : {}) },
    include: {
      branch: { select: { id: true, name: true } },
      memberships: currentMembershipInclude,
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const rows = members.map((m) => {
    const current = m.memberships[0] ?? null;
    const status = effectiveStatus(current, warnDays);
    return {
      id: m.id,
      code: m.code,
      name: fullName(m),
      phone: m.phone,
      email: m.email,
      gender: m.gender,
      branch: m.branch,
      biometricId: m.biometricId,
      createdAt: m.createdAt,
      status,
      plan: current?.plan ?? null,
      endDate: current?.endDate ?? null,
      daysLeft: current ? daysLeft(current.endDate) : null,
    };
  });

  const counts: Record<MemberStatus | "ALL", number> = { ALL: rows.length, ACTIVE: 0, EXPIRING: 0, FROZEN: 0, EXPIRED: 0, NONE: 0 };
  rows.forEach((r) => counts[r.status]++);

  const filtered = opts.status && opts.status !== "ALL" ? rows.filter((r) => r.status === opts.status) : rows;
  return { members: filtered, counts };
}

export async function getMember(id: string) {
  const warnDays = await getWarnDays();
  const m = await db.member.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      memberships: { orderBy: { endDate: "desc" }, include: { plan: true, payments: { select: { amount: true, status: true } } } },
      payments: { orderBy: { paidAt: "desc" }, take: 25, include: { receivedBy: { select: { name: true } } } },
      attendance: { orderBy: { checkInAt: "desc" }, take: 25, include: { branch: { select: { name: true } } } },
      workoutPlans: { include: { trainer: { select: { name: true } }, _count: { select: { items: true } } } },
      workoutLogs: { orderBy: { loggedAt: "desc" }, take: 10 },
      bookings: { orderBy: { createdAt: "desc" }, take: 10, include: { gymClass: { select: { name: true, startsAt: true } } } },
    },
  });
  if (!m) throw new ApiError(404, "Member not found.");

  const [totalVisits, visitsThisMonth, paid] = await Promise.all([
    db.attendance.count({ where: { memberId: id } }),
    db.attendance.count({ where: { memberId: id, checkInAt: { gte: startOfMonth() } } }),
    db.payment.aggregate({ where: { memberId: id, status: "PAID" }, _sum: { amount: true } }),
  ]);

  const current = m.memberships.find((x) => x.status !== "CANCELLED") ?? null;
  const memberships = m.memberships.map((ms) => {
    const paidForThis = ms.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
    const { payments: _p, ...rest } = ms;
    return { ...rest, paid: paidForThis, balance: Math.max(0, ms.price - ms.discount - paidForThis), effectiveStatus: effectiveStatus(ms, warnDays) };
  });

  return {
    ...m,
    name: fullName(m),
    memberships,
    status: effectiveStatus(current, warnDays),
    currentMembership: memberships.find((x) => x.id === current?.id) ?? null,
    stats: {
      totalVisits,
      visitsThisMonth,
      totalPaid: paid._sum.amount ?? 0,
      outstanding: memberships.reduce((s, x) => s + (x.status !== "CANCELLED" ? x.balance : 0), 0),
      lastVisit: m.attendance[0]?.checkInAt ?? null,
    },
  };
}

export async function createMember(input: CreateMemberInput, session: Session) {
  const { planId, startDate, discount, amountPaid, paymentMethod, ...data } = input;
  return db.$transaction(async (tx) => {
    const n = await nextNumber(tx, "member", 1001);
    const member = await tx.member.create({
      data: { ...data, code: `M-${n}`, branchId: data.branchId ?? session.branchId },
    });
    if (planId) {
      await sellMembershipTx(
        tx,
        { memberId: member.id, planId, startDate, discount, amountPaid, paymentMethod, reference: null, notes: null },
        session,
      );
    }
    return member;
  });
}

export async function updateMember(id: string, input: MemberInput) {
  return db.member.update({ where: { id }, data: input });
}

export async function deleteMember(id: string) {
  await db.member.delete({ where: { id } });
  return { ok: true };
}

/** Quick lookup used by the global search & check-in box. */
export async function quickSearch(q: string) {
  if (!q.trim()) return [];
  const warnDays = await getWarnDays();
  const members = await db.member.findMany({
    where: searchWhere(q),
    take: 8,
    include: { memberships: currentMembershipInclude },
    orderBy: { firstName: "asc" },
  });
  return members.map((m) => ({
    id: m.id,
    code: m.code,
    name: fullName(m),
    phone: m.phone,
    status: effectiveStatus(m.memberships[0], warnDays),
    plan: m.memberships[0]?.plan.name ?? null,
  }));
}
