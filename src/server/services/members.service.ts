import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { startOfMonth } from "@/lib/dates";
import type { MemberStatus } from "@/lib/constants";
import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import { randomToken } from "../crypto";
import type { createMemberSchema, memberSchema } from "../validators";
import { effectiveStatus, daysLeft, fullName, getWarnDays, memberPhotoUrl, nextNumber, ownedOr404 } from "./_shared";
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

/** Columns for lists — never the photo itself (photos load separately, see getMemberPhoto). */
const listSelect = {
  id: true,
  code: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  gender: true,
  biometricId: true,
  photoUpdatedAt: true,
  createdAt: true,
  branch: { select: { id: true, name: true } },
  memberships: currentMembershipInclude,
} satisfies Prisma.MemberSelect;

export async function listMembers(gymId: string, opts: { search?: string | null; status?: string | null; branchId?: string | null }) {
  const warnDays = await getWarnDays(gymId);
  const members = await db.member.findMany({
    where: { gymId, ...searchWhere(opts.search), ...(opts.branchId ? { branchId: opts.branchId } : {}) },
    select: listSelect,
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
      photoUrl: memberPhotoUrl(m),
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

export async function getMember(gymId: string, id: string) {
  const warnDays = await getWarnDays(gymId);
  const m = ownedOr404(
    await db.member.findFirst({
      where: { id, gymId },
      include: {
        branch: { select: { id: true, name: true } },
        memberships: { orderBy: { endDate: "desc" }, include: { plan: true, payments: { select: { amount: true, status: true } } } },
        payments: { orderBy: { paidAt: "desc" }, take: 25, include: { receivedBy: { select: { name: true } } } },
        attendance: { orderBy: { checkInAt: "desc" }, take: 25, include: { branch: { select: { name: true } } } },
        workoutPlans: { include: { trainer: { select: { name: true } }, _count: { select: { items: true } } } },
        workoutLogs: { orderBy: { loggedAt: "desc" }, take: 10 },
        bookings: { orderBy: { createdAt: "desc" }, take: 10, include: { gymClass: { select: { name: true, startsAt: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, type: true, channel: true, status: true, createdAt: true } },
      },
    }),
    "Member",
  );

  const [totalVisits, visitsThisMonth, paid] = await Promise.all([
    db.attendance.count({ where: { gymId, memberId: id } }),
    db.attendance.count({ where: { gymId, memberId: id, checkInAt: { gte: startOfMonth() } } }),
    db.payment.aggregate({ where: { gymId, memberId: id, status: "PAID" }, _sum: { amount: true } }),
  ]);

  const current = m.memberships.find((x) => x.status !== "CANCELLED") ?? null;
  const memberships = m.memberships.map((ms) => {
    const paidForThis = ms.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
    const { payments: _p, ...rest } = ms;
    return { ...rest, paid: paidForThis, balance: Math.max(0, ms.price - ms.discount - paidForThis), effectiveStatus: effectiveStatus(ms, warnDays) };
  });

  const { photo: _photo, ...rest } = m;
  return {
    ...rest,
    name: fullName(m),
    photoUrl: memberPhotoUrl(m),
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

/** Make sure an optional branch id belongs to this gym. */
async function checkBranch(gymId: string, branchId: string | null | undefined) {
  if (!branchId) return;
  const b = await db.branch.findFirst({ where: { id: branchId, gymId }, select: { id: true } });
  if (!b) throw new ApiError(400, "That branch doesn't exist in your gym.");
}

export async function createMember(input: CreateMemberInput, session: GymSession) {
  const { planId, startDate, discount, amountPaid, paymentMethod, photo, ...data } = input;
  await checkBranch(session.gymId, data.branchId);
  return db.$transaction(async (tx) => {
    const n = await nextNumber(tx, session.gymId, "member", 1001);
    const member = await tx.member.create({
      data: {
        ...data,
        gymId: session.gymId,
        code: `M-${n}`,
        qrToken: randomToken(),
        branchId: data.branchId ?? session.branchId,
        ...(photo ? { photo, photoUpdatedAt: new Date() } : {}),
      },
      select: { id: true, code: true, firstName: true, lastName: true },
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

export async function updateMember(gymId: string, id: string, input: MemberInput) {
  ownedOr404(await db.member.findFirst({ where: { id, gymId }, select: { id: true } }), "Member");
  await checkBranch(gymId, input.branchId);
  const { photo, ...data } = input;
  return db.member.update({
    where: { id },
    data: {
      ...data,
      // photo: undefined = keep, null = remove, string = replace
      ...(photo !== undefined ? { photo, photoUpdatedAt: photo ? new Date() : null } : {}),
    },
    select: { id: true, code: true, firstName: true, lastName: true },
  });
}

export async function deleteMember(gymId: string, id: string) {
  const m = ownedOr404(await db.member.findFirst({ where: { id, gymId }, select: { id: true, code: true, firstName: true, lastName: true } }), "Member");
  await db.member.delete({ where: { id } });
  return m;
}

/** The raw photo for <img> tags. Returns null when the member has none. */
export async function getMemberPhoto(gymId: string, id: string) {
  const m = await db.member.findFirst({ where: { id, gymId }, select: { photo: true } });
  if (!m?.photo) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(m.photo);
  if (!match) return null;
  return { contentType: match[1]!, bytes: Buffer.from(match[2]!, "base64") };
}

/** Issue a new QR token (the old card stops working). */
export async function regenerateCard(gymId: string, id: string) {
  ownedOr404(await db.member.findFirst({ where: { id, gymId }, select: { id: true } }), "Member");
  return db.member.update({ where: { id }, data: { qrToken: randomToken() }, select: { id: true, qrToken: true } });
}

/** Quick lookup used by the global search & check-in box. */
export async function quickSearch(gymId: string, q: string) {
  if (!q.trim()) return [];
  const warnDays = await getWarnDays(gymId);
  const members = await db.member.findMany({
    where: { gymId, ...searchWhere(q) },
    take: 8,
    select: { id: true, code: true, firstName: true, lastName: true, phone: true, photoUpdatedAt: true, memberships: currentMembershipInclude },
    orderBy: { firstName: "asc" },
  });
  return members.map((m) => ({
    id: m.id,
    code: m.code,
    name: fullName(m),
    phone: m.phone,
    photoUrl: memberPhotoUrl(m),
    status: effectiveStatus(m.memberships[0], warnDays),
    plan: m.memberships[0]?.plan.name ?? null,
  }));
}
